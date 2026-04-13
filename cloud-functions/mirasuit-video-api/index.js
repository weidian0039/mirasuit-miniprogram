/**
 * MIRASUIT Video API 云函数
 *
 * 功能：
 * - 调用 Replicate (CogVideoX / I2VGen-XL) 生成风格视频
 * - API Key 完全存储在云函数环境变量中
 * - 支持异步轮询、限流、缓存
 *
 * 部署步骤：
 * 1. 在微信开发者工具中右键此目录 → 上传并部署
 * 2. 在微信云开发控制台配置环境变量：
 *    - REPLICATE_API_KEY
 * 3. 修改小程序代码 useCloudFunction: true
 */

const cloud = require('wx-server-sdk');
const axios = require('axios');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 速率限制（每分钟 5 次，视频生成成本高）
const RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 1000 };

// 视频缓存 TTL：7 天
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

// Replicate API base
const REPLICATE_API = 'https://api.replicate.com/v1';

// 模型版本 — ⚠️ 使用 model string shorthand（自动解析到最新发布版本）
// 如需固定版本：访问 https://replicate.com/{owner}/{name}/versions 复制完整 hash
const MODELS = {
  i2vgen: {
    owner: 'ByteDance',
    name: 'I2VGen-XL',
    version: 'bytedance/i2vgen-xl'   // shorthand → auto-resolves to latest
  },
  cogvideo: {
    owner: 'THUDM',
    name: 'CogVideoX-5b',
    version: 'THUDM/CogVideoX-5b'     // shorthand → auto-resolves to latest
  }
};

/**
 * 生成缓存 key
 */
function getCacheKey(scriptData, personality) {
  const str = JSON.stringify({ script: scriptData, personality });
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `video_cache_${hash}`;
}

/**
 * 速率限制检查
 */
async function checkRateLimit(openid) {
  try {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT.windowMs;

    const countRes = await db.collection('rate_limits')
      .where({ openid, action: 'video_api' })
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (countRes.data.length > 0 && countRes.data[0].timestamp > windowStart) {
      const retryAfter = Math.ceil((countRes.data[0].timestamp + RATE_LIMIT.windowMs - now) / 1000);
      return { allowed: false, retryAfter };
    }

    await db.collection('rate_limits').add({
      data: { openid, action: 'video_api', timestamp: now }
    });

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

/**
 * 读取缓存
 */
async function getCache(scriptData, personality) {
  try {
    const key = getCacheKey(scriptData, personality);
    const res = await db.collection('video_cache').where({ cacheKey: key }).get();
    if (res.data.length > 0) {
      const cached = res.data[0];
      if (Date.now() - cached.createdAt < CACHE_TTL) {
        console.log('[VideoAPI] Cache hit for script');
        return cached.data;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 写入缓存
 */
async function setCache(scriptData, personality, data) {
  try {
    const key = getCacheKey(scriptData, personality);
    await db.collection('video_cache').add({
      data: { cacheKey: key, data, createdAt: Date.now() }
    });
  } catch (err) {
    console.warn('[VideoAPI] Cache write failed:', err.message);
  }
}

/**
 * 创建 Replicate prediction
 * 微信云函数使用 axios（Node.js 标准 HTTP 客户端）
 */
async function createPrediction(apiKey, modelKey, input) {
  const model = MODELS[modelKey] || MODELS.cogvideo;

  const response = await axios.post(
    'https://api.replicate.com/v1/predictions',
    {
      version: model.version,
      input
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 60000
    }
  );

  return response.data;
}

/**
 * 查询 Replicate prediction 状态
 * 微信云函数使用 axios（Node.js 标准 HTTP 客户端）
 */
async function getPrediction(apiKey, predictionId) {
  const response = await axios.get(
    `https://api.replicate.com/v1/predictions/${predictionId}`,
    {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 30000
    }
  );

  return response.data;
}

/**
 * 主入口
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const openid = cloud.getWXContext()?.OPENID || 'anonymous';

  console.log(`[VideoAPI] Action: ${action}, OpenID: ${openid}`);

  try {
    const rateCheck = await checkRateLimit(openid);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: '视频生成较慢，请稍后再试',
        retryAfter: rateCheck.retryAfter
      };
    }

    switch (action) {
      case 'ping':
        return { success: true, result: { status: 'ok' }, service: 'mirasuit-video-api' };

      case 'generateStyleVideo':
        return await handleGenerateVideo(data, openid);

      case 'getVideoStatus':
        return await handleGetVideoStatus(data, openid);

      default:
        return { success: false, error: 'UNKNOWN_ACTION', message: `未知的 action: ${action}` };
    }
  } catch (error) {
    console.error('[VideoAPI] Error:', error);
    return { success: false, error: 'INTERNAL_ERROR', message: error.message || '服务器内部错误' };
  }
};

/**
 * 生成视频
 */
async function handleGenerateVideo(data, openid) {
  const { scriptData, personality, referenceImageUrl, model = 'i2vgen' } = data;

  if (!scriptData) {
    return { success: false, error: 'MISSING_SCRIPT', message: 'scriptData 不能为空' };
  }

  // 1. 查缓存
  const cached = await getCache(scriptData, personality);
  if (cached && cached.videoUrl) {
    return { success: true, data: cached, cached: true };
  }

  // 2. 获取 API Key
  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'API_KEY_MISSING', message: 'REPLICATE_API_KEY 未配置' };
  }

  // 3. 构建 input
  const input = buildModelInput(model, scriptData, personality, referenceImageUrl);

  // 4. 创建 prediction
  const prediction = await createPrediction(apiKey, model, input);

  const result = {
    predictionId: prediction.id,
    status: prediction.status,
    backend: 'replicate',
    model,
    createdAt: new Date().toISOString()
  };

  // 5. 如果立即完成（同步模型），返回视频 URL
  if (prediction.status === 'succeeded') {
    result.videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    await setCache(scriptData, personality, result);
  } else if (prediction.status === 'failed') {
    result.error = prediction.error;
  }
  // 否则返回 predictionId，客户端需轮询

  return { success: true, data: result, cached: false };
}

/**
 * 查询视频生成状态
 */
async function handleGetVideoStatus(data, openid) {
  const { predictionId } = data;
  if (!predictionId) {
    return { success: false, error: 'MISSING_PREDICTION_ID', message: 'predictionId 不能为空' };
  }

  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'API_KEY_MISSING', message: 'REPLICATE_API_KEY 未配置' };
  }

  const prediction = await getPrediction(apiKey, predictionId);

  const result = {
    predictionId,
    status: prediction.status
  };

  if (prediction.status === 'succeeded') {
    result.videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  } else if (prediction.status === 'failed') {
    result.error = prediction.error;
  }

  return { success: true, data: result };
}

/**
 * 根据模型构建输入参数
 */
function buildModelInput(model, scriptData, personality, referenceImageUrl) {
  const baseInput = {
    prompt: scriptData.scenes?.[0]?.description || scriptData.prompt || '',
    num_frames: 24,
    num_inference_steps: 30
  };

  if (model === 'i2vgen') {
    return {
      ...baseInput,
      image: referenceImageUrl || undefined,
      prior_vid_length: 2,
      frame_rate: 8
    };
  }

  if (model === 'cogvideo') {
    return {
      ...baseInput,
      image_url: referenceImageUrl || undefined,
      video_length: '5s',
      temperature: 1.0
    };
  }

  return baseInput;
}
