/**
 * MIRASUIT Secure API Service
 * 准备迁移到云函数的安全 API 调用包装器
 *
 * 临时方案：使用环境变量或配置服务获取 API key
 * 最终方案：迁移到微信云函数或后端代理
 *
 * Brand alignment: Uses CSO-approved v2 templates for all prompts.
 * Tone: Sophisticated, Understated, Premium — MIRASUIT consultant voice.
 */

const logger = require('./logger');
const templates = require('../prompts/claude-templates-v2');

class SecureAPIService {
  constructor(config = {}) {
    this.config = {
      // 云函数名称（待部署）
      cloudFunctionName: config.cloudFunctionName || 'mirasuit-claude-api',
      // 是否使用云函数（当前为 false，待云函数部署后改为 true）
      useCloudFunction: config.useCloudFunction || false,
      // 临时：API key 从配置服务获取（不从客户端硬编码）
      apiKeyProvider: config.apiKeyProvider || null,
      // API 基础配置
      baseUrl: config.baseUrl || 'https://api.anthropic.com/v1/messages',
      timeout: config.timeout || 30000
    };
  }

  /**
   * 获取 API Key（安全方式）
   * @private
   */
  async _getApiKey() {
    // 方案 1: 从云函数获取（推荐）
    if (this.config.useCloudFunction) {
      try {
        const result = await wx.cloud.callFunction({
          name: 'get-api-key',
          data: { service: 'anthropic' }
        });
        return result.result.apiKey;
      } catch (error) {
        console.error('Failed to get API key from cloud function:', error);
        throw new Error('无法获取 API 密钥，请检查云函数配置');
      }
    }

    // 方案 2: 从配置服务获取（临时方案）
    if (this.config.apiKeyProvider) {
      try {
        const apiKey = await this.config.apiKeyProvider();
        if (!apiKey) {
          throw new Error('API Key provider returned null');
        }
        return apiKey;
      } catch (error) {
        console.error('Failed to get API key from provider:', error);
        throw new Error('无法获取 API 密钥，请检查配置');
      }
    }

    // 方案 3: 环境变量（仅开发环境）
    if (typeof getApp === 'function') {
      const app = getApp();
      const envApiKey = app.globalData?.anthropicApiKey;
      if (envApiKey && envApiKey !== 'your-api-key') {
        console.warn('⚠️ 使用环境变量 API Key - 仅适用于开发环境');
        return envApiKey;
      }
    }

    throw new Error('❌ 安全错误：API Key 未配置。请使用云函数或配置服务。');
  }

  /**
   * 改进的错误处理
   * @private
   */
  _handleError(error, context = '') {
    logger.apiError('POST', this.config.baseUrl, error, { context });

    // 网络错误
    if (error.errMsg && error.errMsg.includes('fail')) {
      if (error.errMsg.includes('timeout')) {
        return {
          success: false,
          error: 'NETWORK_TIMEOUT',
          message: '网络超时，请检查网络连接',
          userAction: '请检查网络设置后重试',
          retryable: true
        };
      }
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: '网络连接失败',
        userAction: '请检查网络设置',
        retryable: true
      };
    }

    // HTTP 错误
    if (error.statusCode) {
      switch (error.statusCode) {
        case 401:
          return {
            success: false,
            error: 'AUTH_FAILED',
            message: 'API 认证失败',
            userAction: '请联系管理员检查 API 配置',
            retryable: false
          };
        case 429:
          return {
            success: false,
            error: 'RATE_LIMIT',
            message: 'API 调用次数过多',
            userAction: '请稍后再试',
            retryable: true
          };
        case 500:
        case 502:
        case 503:
          return {
            success: false,
            error: 'SERVICE_ERROR',
            message: '服务暂时不可用',
            userAction: '请稍后重试',
            retryable: true
          };
        default:
          return {
            success: false,
            error: 'HTTP_ERROR',
            message: `HTTP ${error.statusCode} 错误`,
            userAction: '请稍后重试',
            retryable: error.statusCode >= 500
          };
      }
    }

    // 未知错误
    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      message: error.message || '未知错误',
      userAction: '请稍后重试或联系客服',
      retryable: true
    };
  }

  /**
   * 改进的 JSON 解析
   * @private
   */
  _parseJSONResponse(content) {
    try {
      // 方法 1: 尝试直接解析
      const directParse = JSON.parse(content);
      if (directParse && typeof directParse === 'object') {
        return directParse;
      }
    } catch (e) {
      // 继续尝试其他方法
    }

    try {
      // 方法 2: 提取第一个 JSON 对象（更可靠）
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonStr = content.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);

        // 验证必需字段
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }

      throw new Error('No valid JSON found');
    } catch (error) {
      logger.error('JSON Parse Error', {
        error: error.message,
        contentPreview: content.substring(0, 200)
      });
      throw new Error('响应解析失败，请稍后重试');
    }
  }

  /**
   * 验证 API 响应结构
   * @private
   */
  _validateResponse(data, requiredFields = []) {
    if (!data || typeof data !== 'object') {
      throw new Error('响应格式无效');
    }

    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`响应缺少必需字段: ${field}`);
      }
    }

    return data;
  }

  /**
   * 调用 Claude API（安全方式）
   * @private
   */
  async _callClaudeAPI(prompt, options = {}) {
    const {
      maxTokens = 1024,
      model = 'claude-sonnet-4-6'
    } = options;

    // 性能监控
    const startTime = Date.now();
    logger.debug('Claude API Call Started', { model, maxTokens });

    try {
      // 安全获取 API key
      const apiKey = await this._getApiKey();

      // 构建请求
      const response = await wx.request({
        url: this.config.baseUrl,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        data: {
          model: model,
          max_tokens: maxTokens,
          messages: [{
            role: 'user',
            content: prompt
          }]
        },
        timeout: this.config.timeout
      });

      // 解析响应
      const content = response.data?.content?.[0]?.text;
      if (!content) {
        throw new Error('API 响应格式异常');
      }

      const parsed = this._parseJSONResponse(content);

      return {
        success: true,
        data: parsed
      };

    } catch (error) {
      return this._handleError(error, 'claude-api');
    }
  }

  /**
   * 调用云函数（S3-T2: useCloudFunction flip 后启用）
   * @private
   */
  async _callCloudFunction(action, data) {
    const startTime = Date.now();
    logger.debug('Cloud Function Call', { action, cloudFunction: this.config.cloudFunctionName });

    try {
      const result = await wx.cloud.callFunction({
        name: this.config.cloudFunctionName,
        data: { action, data }
      });

      if (result.errMsg && !result.errMsg.includes('ok')) {
        throw new Error(`云函数调用失败: ${result.errMsg}`);
      }

      return result.result || { success: false, error: 'NO_RESULT', message: '云函数无返回' };
    } catch (error) {
      logger.error('Cloud Function Error', { action, error: error.message });
      return this._handleError(error, `cloud-function:${action}`);
    }
  }

  /**
   * 分析用户性格（公开接口）
   * S3-T2: useCloudFunction=true 时路由到云函数
   */
  async analyzePersonality(responses) {
    if (this.config.useCloudFunction) {
      const result = await this._callCloudFunction('analyzePersonality', { responses });
      if (result.success) {
        logger.info('Personality Analysis Success [cloud]', { mbti: result.data?.mbti?.type });
      }
      return result;
    }

    const prompt = this._buildPersonalityPrompt(responses);
    const result = await this._callClaudeAPI(prompt, { maxTokens: 1024 });

    if (!result.success) {
      return result;
    }

    try {
      const validated = this._validateResponse(result.data, ['mbti', 'enneagram']);
      logger.info('Personality Analysis Success', {
        mbti: validated.mbti?.type,
        enneagram: validated.enneagram?.type
      });
      return {
        success: true,
        data: validated
      };
    } catch (error) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error.message,
        userAction: '请稍后重试',
        retryable: true
      };
    }
  }

  /**
   * 获取风格推荐（公开接口）
   * S3-T2: useCloudFunction=true 时路由到云函数
   */
  async getStyleRecommendations(personality) {
    if (this.config.useCloudFunction) {
      const result = await this._callCloudFunction('getStyleRecommendations', { personality });
      if (result.success) {
        logger.info('Style Recommendations Success [cloud]', { styles: result.data?.recommendedStyles });
      }
      return result;
    }

    const prompt = this._buildStylePrompt(personality);
    const result = await this._callClaudeAPI(prompt, { maxTokens: 1024 });

    if (!result.success) {
      return result;
    }

    try {
      const validated = this._validateResponse(result.data, ['recommendedStyles']);
      return {
        success: true,
        data: validated
      };
    } catch (error) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error.message,
        userAction: '请稍后重试',
        retryable: true
      };
    }
  }

  /**
   * 生成个性化建议（公开接口）
   */
  async getPersonalizedAdvice(userProfile, occasion = null) {
    if (this.config.useCloudFunction) {
      const result = await this._callCloudFunction('getPersonalizedAdvice', { userProfile, occasion });
      if (result.success) logger.info('Personalized Advice Success [cloud]', { occasion });
      return result;
    }

    const prompt = this._buildAdvicePrompt(userProfile, occasion);
    const result = await this._callClaudeAPI(prompt, { maxTokens: 1536 });

    if (!result.success) {
      return result;
    }

    try {
      const validated = this._validateResponse(result.data, ['recommendation']);
      return {
        success: true,
        data: validated
      };
    } catch (error) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error.message,
        userAction: '请稍后重试',
        retryable: true
      };
    }
  }

  /**
   * 构建性格分析 prompt
   * @private
   * @desc Uses CSO-approved v2 brand template — MIRASUIT consultant voice
   */
  _buildPersonalityPrompt(responses) {
    return templates.buildPersonalityPrompt(responses);
  }

  /**
   * 构建风格推荐 prompt
   * @private
   * @desc Uses CSO-approved v2 brand template — MIRASUIT consultant voice
   */
  _buildStylePrompt(personality) {
    return templates.buildStylePrompt(personality);
  }

  /**
   * 构建个性化建议 prompt
   * @private
   * @desc Uses CSO-approved v2 brand template — MIRASUIT consultant voice
   */
  _buildAdvicePrompt(userProfile, occasion) {
    return templates.buildAdvicePrompt(userProfile, occasion);
  }
}

module.exports = SecureAPIService;
