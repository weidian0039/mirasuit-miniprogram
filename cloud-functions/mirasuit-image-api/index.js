/**
 * MIRASUIT Image API 云函数
 *
 * 功能：
 * - 调用 OpenAI DALL-E 3 生成风格图片
 * - 调用 Replicate FLUX 生成备选图片
 * - API Key 完全存储在云函数环境变量中
 * - 支持限流、缓存
 *
 * 部署步骤：
 * 1. 在微信开发者工具中右键此目录 → 上传并部署
 * 2. 在微信云开发控制台配置环境变量：
 *    - OPENAI_API_KEY
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

// 速率限制（每分钟 10 次）
const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

// 缓存 TTL：7 天
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

/**
 * 生成缓存 key
 */
function getCacheKey(prompt) {
  const hash = crypto.createHash('md5').update(prompt).digest('hex');
  return `image_cache_${hash}`;
}

/**
 * 速率限制检查（基于 openid）
 */
async function checkRateLimit(openid) {
  try {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT.windowMs;

    const countRes = await db.collection('rate_limits')
      .where({ openid, action: 'image_api' })
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (countRes.data.length > 0 && countRes.data[0].timestamp > windowStart) {
      const retryAfter = Math.ceil((countRes.data[0].timestamp + RATE_LIMIT.windowMs - now) / 1000);
      return { allowed: false, retryAfter };
    }

    await db.collection('rate_limits').add({
      data: { openid, action: 'image_api', timestamp: now }
    });

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

/**
 * 读取缓存
 */
async function getCache(prompt) {
  try {
    const key = getCacheKey(prompt);
    const res = await db.collection('image_cache').where({ cacheKey: key }).get();
    if (res.data.length > 0) {
      const cached = res.data[0];
      if (Date.now() - cached.createdAt < CACHE_TTL) {
        console.log('[ImageAPI] Cache hit for prompt:', prompt.substring(0, 50));
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
async function setCache(prompt, data) {
  try {
    const key = getCacheKey(prompt);
    await db.collection('image_cache').add({
      data: { cacheKey: key, data, createdAt: Date.now() }
    });
  } catch (err) {
    console.warn('[ImageAPI] Cache write failed:', err.message);
  }
}

/**
 * 调用 OpenAI DALL-E 3
 * 微信云函数使用 axios（Node.js 标准 HTTP 客户端）
 */
async function callDALLE(prompt, style) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const styleMap = {
    minimalist: 'natural',
    classic: 'vivid',
    bold: 'vivid',
    default: 'vivid'
  };

  const response = await axios.post(
    'https://api.openai.com/v1/images/generations',
    {
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      style: styleMap[style] || 'vivid',
      quality: 'standard'
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 60000
    }
  );

  return {
    url: response.data.data?.[0]?.url || response.data.data?.[0]?.b64_json,
    revisedPrompt: response.data.data?.[0]?.revised_prompt,
    backend: 'dall-e-3'
  };
}

/**
 * 调用 Replicate FLUX
 * 微信云函数使用 axios（Node.js 标准 HTTP 客户端）
 */
async function callReplicateFLUX(prompt) {
  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) throw new Error('REPLICATE_API_KEY not configured');

  // ⚠️ Replicate FLUX.1-schnell — version 用 model string（自动解析到最新版本）
  // 如需固定版本：访问 https://replicate.com/black-forest-labs/flux-1-schnell/versions 复制完整 hash
  const FLUX_VERSION = 'black-forest-labs/FLUX.1-schnell';

  const response = await axios.post(
    'https://api.replicate.com/v1/predictions',
    {
      version: FLUX_VERSION,
      input: {
        prompt,
        aspect_ratio: '1:1',
        seed: Math.floor(Math.random() * 2147483647),
        num_inference_steps: 4,   // FLUX.1-schnell: 1-4步即可，schnell模型
        guidance_scale: 3.5
      }
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 60000
    }
  );

  return {
    predictionId: response.data.id,
    status: response.data.status,
    backend: 'replicate-flux'
  };
}

/**
 * 主入口
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const openid = cloud.getWXContext()?.OPENID || 'anonymous';

  console.log(`[ImageAPI] Action: ${action}, OpenID: ${openid}`);

  try {
    const rateCheck = await checkRateLimit(openid);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: '请求过于频繁，请稍后再试',
        retryAfter: rateCheck.retryAfter
      };
    }

    switch (action) {
      case 'ping':
        return { success: true, result: { status: 'ok' }, service: 'mirasuit-image-api' };

      case 'generateStyleImage':
        return await handleGenerateStyleImage(data, openid);

      case 'getPredictionStatus':
        return await handleGetPredictionStatus(data);

      default:
        return { success: false, error: 'UNKNOWN_ACTION', message: `未知的 action: ${action}` };
    }
  } catch (error) {
    console.error('[ImageAPI] Error:', error);
    return { success: false, error: 'INTERNAL_ERROR', message: error.message || '服务器内部错误' };
  }
};

/**
 * 生成风格图片
 */
async function handleGenerateStyleImage(data, openid) {
  const { prompt, style = 'classic' } = data;

  if (!prompt) {
    return { success: false, error: 'MISSING_PROMPT', message: 'prompt 不能为空' };
  }

  // 1. 查缓存
  const cached = await getCache(prompt);
  if (cached) {
    return { success: true, data: cached, cached: true };
  }

  // 2. 主路径：DALL-E 3
  let result;
  try {
    result = await callDALLE(prompt, style);
  } catch (err) {
    console.warn('[ImageAPI] DALL-E failed, falling back to FLUX:', err.message);
    try {
      const fluxResult = await callReplicateFLUX(prompt);
      // FLUX 是异步的，返回 predictionId，需要后续轮询
      return {
        success: true,
        data: {
          predictionId: fluxResult.predictionId,
          backend: fluxResult.backend,
          status: 'pending',
          message: '图片生成中，请在 30 秒后使用 predictionId 查询'
        },
        cached: false
      };
    } catch (fluxErr) {
      throw new Error(`DALL-E: ${err.message}; FLUX: ${fluxErr.message}`);
    }
  }

  // 3. 写入缓存
  await setCache(prompt, result);

  return { success: true, data: result, cached: false };
}

/**
 * 轮询 Replicate prediction 状态（FLUX 异步返回）
 */
async function getPredictionResult(apiKey, predictionId) {
  const response = await axios.get(
    `https://api.replicate.com/v1/predictions/${predictionId}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 60000
    }
  );
  return response.data;
}

/**
 * 查询 FLUX 图片生成状态
 */
async function handleGetPredictionStatus(data) {
  const { predictionId } = data;

  if (!predictionId) {
    return { success: false, error: 'MISSING_PREDICTION_ID', message: 'predictionId 不能为空' };
  }

  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'REPLICATE_API_KEY_NOT_CONFIGURED', message: 'REPLICATE_API_KEY 环境变量未配置' };
  }

  try {
    const prediction = await getPredictionResult(apiKey, predictionId);

    if (prediction.status === 'succeeded') {
      const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      return {
        success: true,
        status: 'succeeded',
        data: { url: output },
        cached: false
      };
    } else if (prediction.status === 'failed') {
      return {
        success: false,
        status: 'failed',
        error: 'FLUX_PREDICTION_FAILED',
        message: prediction.error || '图片生成失败'
      };
    } else {
      // 'starting' or 'processing'
      return {
        success: true,
        status: prediction.status,
        data: { status: prediction.status },
        cached: false
      };
    }
  } catch (err) {
    console.error('[ImageAPI] getPredictionStatus error:', err.message);
    return {
      success: false,
      error: 'POLLING_ERROR',
      message: err.message || '查询生成状态失败'
    };
  }
}
