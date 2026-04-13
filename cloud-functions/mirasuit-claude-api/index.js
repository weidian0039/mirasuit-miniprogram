/**
 * MIRASUIT Claude API 云函数
 *
 * 这是真正解决 API Key 安全问题的方案：
 * - API Key 完全存储在云函数环境变量中
 * - 客户端只调用云函数，不接触 API Key
 * - 支持限流、监控、缓存
 *
 * 部署步骤：
 * 1. 在微信开发者工具中右键此目录 → 上传并部署
 * 2. 在微信云开发控制台配置环境变量：ANTHROPIC_API_KEY
 * 3. 修改小程序代码 useCloudFunction: true
 */

const cloud = require('wx-server-sdk');
const axios = require('axios');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 微信云数据库（可选，用于缓存）
const db = cloud.database();

// 速率限制配置（每分钟最多 10 次调用）
const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000
};

// 缓存配置（5 分钟缓存）
const CACHE_TTL = 5 * 60 * 1000;

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const openid = cloud.getWXContext()?.OPENID || 'anonymous';

  console.log(`[MIRASUIT API] Action: ${action}, OpenID: ${openid}`);

  try {
    // 速率限制检查
    const rateLimitResult = await checkRateLimit(openid);
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: '请求过于频繁，请稍后再试',
        retryAfter: rateLimitResult.retryAfter
      };
    }

    // 执行对应的 action
    switch (action) {
      case 'ping':
        return { success: true, result: { status: 'ok' }, service: 'mirasuit-claude-api' };

      case 'analyzePersonality':
        return await analyzePersonality(data);

      case 'getStyleRecommendations':
        return await getStyleRecommendations(data);

      case 'getPersonalizedAdvice':
        return await getPersonalizedAdvice(data);

      default:
        return {
          success: false,
          error: 'UNKNOWN_ACTION',
          message: `未知的 action: ${action}`
        };
    }
  } catch (error) {
    console.error('[MIRASUIT API] Error:', error);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误，请稍后重试'
    };
  }
};

/**
 * 分析用户性格
 */
async function analyzePersonality(data) {
  const { responses } = data;

  if (!responses || typeof responses !== 'object') {
    return {
      success: false,
      error: 'INVALID_INPUT',
      message: '无效的问卷响应'
    };
  }

  // 检查缓存
  const cacheKey = `personality_${hashResponses(responses)}`;
  const cached = await getFromCache(cacheKey);
  if (cached) {
    console.log('[MIRASUIT API] Cache hit for personality analysis');
    return { success: true, data: cached, cached: true };
  }

  // 调用 Claude API
  const result = await callClaudeAPI(buildPersonalityPrompt(responses));

  if (result.success) {
    // 存入缓存
    await saveToCache(cacheKey, result.data);
  }

  return result;
}

/**
 * 获取风格推荐
 */
async function getStyleRecommendations(data) {
  const { personality } = data;

  if (!personality || !personality.mbti) {
    return {
      success: false,
      error: 'INVALID_INPUT',
      message: '无效的性格数据'
    };
  }

  // 检查缓存
  const cacheKey = `recommendations_${personality.mbti.type}`;
  const cached = await getFromCache(cacheKey);
  if (cached) {
    console.log('[MIRASUIT API] Cache hit for style recommendations');
    return { success: true, data: cached, cached: true };
  }

  // 调用 Claude API
  const result = await callClaudeAPI(buildStylePrompt(personality));

  if (result.success) {
    // 存入缓存
    await saveToCache(cacheKey, result.data);
  }

  return result;
}

/**
 * 获取个性化建议
 */
async function getPersonalizedAdvice(data) {
  const { userProfile, occasion } = data;

  if (!userProfile) {
    return {
      success: false,
      error: 'INVALID_INPUT',
      message: '无效的用户数据'
    };
  }

  // 检查缓存（包含场合）
  const occasionKey = occasion ? `_${occasion}` : '';
  const cacheKey = `advice_${userProfile.personality?.mbti?.type || 'unknown'}${occasionKey}`;
  const cached = await getFromCache(cacheKey);
  if (cached) {
    console.log('[MIRASUIT API] Cache hit for personalized advice');
    return { success: true, data: cached, cached: true };
  }

  // 调用 Claude API
  const result = await callClaudeAPI(buildAdvicePrompt(userProfile, occasion));

  if (result.success) {
    await saveToCache(cacheKey, result.data);
  }

  return result;
}

/**
 * 调用 Claude API
 * 微信云函数使用 axios（Node.js 标准 HTTP 客户端，npm 依赖）
 */
async function callClaudeAPI(prompt) {
  // 从环境变量获取 API Key（这是关键！API Key 不在客户端）
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('[MIRASUIT API] API Key not configured');
    return {
      success: false,
      error: 'CONFIG_ERROR',
      message: 'API 未正确配置，请联系管理员'
    };
  }

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        timeout: 30000
      }
    );

    const content = response.data?.content?.[0]?.text;

    if (!content) {
      throw new Error('Something is taking longer than expected. Please try again.');
    }

    // 解析 JSON 响应
    const parsed = parseJSONResponse(content);

    return {
      success: true,
      data: parsed
    };

  } catch (error) {
    console.error('[MIRASUIT API] Claude API Error:', error);
    const message = error.response?.data?.error?.message || error.message || "We're unable to complete your request right now. Please try again.";
    return {
      success: false,
      error: 'API_ERROR',
      message
    };
  }
}

/**
 * 速率限制检查（基于 IP 或 OpenID）
 */
async function checkRateLimit(identifier) {
  try {
    // 使用云存储实现简单的速率限制
    const cache = cloud.cache();

    const key = `rate_limit_${identifier}`;
    const current = await cache.get({ key });

    if (!current) {
      await cache.set({
        key,
        value: 1,
        ttl: RATE_LIMIT.windowMs / 1000
      });
      return { allowed: true };
    }

    if (current >= RATE_LIMIT.maxRequests) {
      return {
        allowed: false,
        retryAfter: Math.ceil(RATE_LIMIT.windowMs / 1000)
      };
    }

    await cache.inc({ key, value: 1 });
    return { allowed: true };

  } catch (error) {
    console.error('[MIRASUIT API] Rate limit check failed:', error);
    // 速率限制检查失败时允许请求（fail open）
    return { allowed: true };
  }
}

/**
 * 获取缓存
 */
async function getFromCache(key) {
  try {
    const cache = cloud.cache();
    const cached = await cache.get({ key });
    return cached || null;
  } catch (error) {
    console.error('[MIRASUIT API] Cache get failed:', error);
    return null;
  }
}

/**
 * 保存到缓存
 */
async function saveToCache(key, data) {
  try {
    const cache = cloud.cache();
    await cache.set({
      key,
      value: data,
      ttl: CACHE_TTL / 1000
    });
  } catch (error) {
    console.error('[MIRASUIT API] Cache set failed:', error);
  }
}

/**
 * 解析 JSON 响应
 */
function parseJSONResponse(content) {
  try {
    // 尝试直接解析
    return JSON.parse(content);
  } catch (e) {
    // 提取 JSON 对象
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonStr = content.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonStr);
    }

    throw new Error('Unable to process the response. Please try again.');
  }
}

/**
 * 生成响应的哈希（用于缓存键）
 */
function hashResponses(responses) {
  const str = JSON.stringify(responses);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * 构建性格分析 prompt
 * CSO对齐: 使用与 claude-templates-v2.js 一致的字段名和品牌语气
 */
function buildPersonalityPrompt(responses) {
  return `You represent MIRASUIT, an AI-driven premium menswear platform. You speak with the quiet confidence of a master tailor — precise, knowledgeable, never boastful. Your clients are discerning professionals who value quality over trends.

A client has completed their style discovery questionnaire. Based on their responses, provide a personality analysis that will guide their personalized wardrobe recommendations.

Speak as a senior style consultant would to a discerning client — direct, insightful, and confident. Your analysis informs fabric selections, cut preferences, and styling choices that honor both the client's personality and MIRASUIT's commitment to understated elegance.

Questionnaire Responses:
${JSON.stringify(responses, null, 2)}

Provide your analysis in JSON format:
{
  "mbti": {
    "type": "INTJ",
    "confidence": 85,
    "breakdown": {
      "introversion": 75,
      "intuition": 80,
      "thinking": 90,
      "judging": 70
    },
    "styleImplications": "Brief note on how this type approaches wardrobe decisions"
  },
  "enneagram": {
    "type": 5,
    "wing": "6w5",
    "confidence": 80,
    "styleImplications": "Brief note on this type's relationship with quality and aesthetics"
  },
  "keyTraits": ["trait1", "trait2", "trait3"],
  "stylePhilosophy": "One sentence capturing their likely approach to menswear"
}`;
}

/**
 * 构建风格推荐 prompt
 * CSO对齐: 使用与 claude-templates-v2.js 一致的字段名和品牌语气
 */
function buildStylePrompt(personality) {
  return `You represent MIRASUIT, an AI-driven premium menswear platform. You speak with the quiet confidence of a master tailor — precise, knowledgeable, never boastful. Your clients are discerning professionals who value quality over trends.

You have a client's personality analysis. Now translate this into concrete style recommendations.

The goal: Recommend styles that feel authentic to the client while exemplifying MIRASUIT's aesthetic — refined, understated, quality-focused.

Personality Profile:
${JSON.stringify(personality, null, 2)}

Provide recommendations in JSON format:
{
  "recommendedStyles": ["Classic", "Minimalist"],
  "primaryPalette": ["navy", "charcoal", "warm white"],
  "secondaryPalette": ["olive", "burgundy accent"],
  "fabricPreferences": {
    "priority": "Super 120s-130s wool",
    "avoid": "Synthetic blends, trend-driven textures"
  },
  "fitPhilosophy": "Slim but not tight, natural shoulders, clean lines",
  "keyPieces": [
    {
      "item": "Charcoal suit",
      "rationale": "Why this suits their personality",
      "versatility": "Where and how they'll wear it"
    }
  ],
  "stylingNotes": "Specific advice for this client's profile",
  "investmentGuidance": "Where to prioritize quality vs. where flexibility exists"
}`;
}

/**
 * 构建个性化建议 prompt
 * CSO对齐: 品牌语气 + 与 claude-templates-v2.js 一致的字段名
 */
function buildAdvicePrompt(userProfile, occasion) {
  const occasionText = occasion ? `\nOccasion: ${occasion}` : '';

  return `You represent MIRASUIT, an AI-driven premium menswear platform. You speak with the quiet confidence of a master tailor — precise, knowledgeable, never boastful.

A client seeks advice for ${occasion || 'general wardrobe refinement'}. You have their profile. Provide specific, actionable guidance.

Remember: No exclamation marks, no superlatives, no marketing speak. Quiet confidence.

Client's profile:
${JSON.stringify(userProfile, null, 2)}${occasionText}

Provide advice in JSON format:
{
  "occasion": "${occasion || 'General'}",
  "outfitRecommendation": {
    "primary": "Charcoal suit, white shirt, burgundy pocket square",
    "alternatives": ["Navy suit option", "Blazer and trouser combination"],
    "avoid": "What doesn't work for this occasion or their profile"
  },
  "fitNotes": "Specific adjustments or considerations for their body type if known",
  "fabricAdvice": "Seasonal or practical considerations",
  "accessoryGuidance": "Minimal, purposeful accessories",
  "confidenceBoosters": "Details that will make them feel most assured",
  "versatilityTip": "How pieces from this outfit work in other contexts"
}`;
}
