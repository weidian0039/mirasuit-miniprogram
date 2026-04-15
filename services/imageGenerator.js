/**
 * MIRASUIT Image Generation Service
 *
 * Generates personalized style inspiration images using brand-aligned prompts.
 * Uses CSO-approved `buildImagePrompt` from prompts/claude-templates-v2.js
 *
 * Supports multiple image generation backends:
 * - DALL-E 3 (via OpenAI API)
 * - Stable Diffusion (via Replicate or compatible backend)
 * - Placeholder fallback (no API key configured)
 *
 * Brand alignment: Understated luxury, no logos, no text overlays.
 */

const templates = require('../prompts/claude-templates-v2');
const cache = require('./cache');
const logger = require('./logger');

const BRAND_PLACEHOLDER = 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80';

class ImageGenerator {
  constructor(config = {}) {
    this.config = {
      // Primary backend: 'openai' (DALL-E 3) or 'replicate' (SD)
      backend: config.backend || 'openai',
      // API key provider for image generation service (used when useCloudFunction=false)
      apiKeyProvider: config.apiKeyProvider || null,
      // Cloud function config (Pre-Alpha: useCloudFunction=true routes through cloud)
      useCloudFunction: config.useCloudFunction || false,
      cloudFunctionName: config.cloudFunctionName || 'mirasuit-image-api',
      // OpenAI API endpoint (DALL-E 3)
      openaiUrl: config.openaiUrl || 'https://api.openai.com/v1/images/generations',
      // Replicate API endpoint (SDXL)
      replicateUrl: config.replicateUrl || 'https://api.replicate.com/v1/predictions',
      // Generation parameters
      size: config.size || '1024x1024',
      quality: config.quality || 'standard',
      style: config.style || 'natural',
      n: 1,
      // Retry configuration
      maxRetries: config.maxRetries || 2,
      timeout: config.timeout || 60000,
      // Fallback placeholder
      fallbackUrl: config.fallbackUrl || BRAND_PLACEHOLDER
    };
  }

  /**
   * Generate a personalized style inspiration image.
   *
   * @param {Object} personality - User's personality analysis (from ClaudeService)
   * @param {Object} stylePreferences - Style recommendations (from ClaudeService)
   * @returns {Promise<Object>} { imageUrl, prompt, style }
   */
  async generateStyleImage(personality, stylePreferences) {
    const cacheKey = this._buildCacheKey(personality, stylePreferences);

    // Check cache first
    try {
      const cached = cache.get(cacheKey);
      if (cached) {
        logger.info('ImageGenerator cache hit', { cacheKey });
        return cached;
      }
    } catch (e) {
      // Cache miss, proceed to generation
    }

    try {
      const imageData = await this._generate(personality, stylePreferences, cacheKey);
      return imageData;
    } catch (error) {
      logger.captureError(error, { context: 'ImageGenerator.generateStyleImage' });
      // Return branded fallback on any error
      return this._getFallback(personality, stylePreferences);
    }
  }

  /**
   * Internal generation logic with retry.
   * @private
   */
  async _generate(personality, stylePreferences, cacheKey) {
    const prompt = this._buildPrompt(personality, stylePreferences);
    let lastError;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const imageData = this.config.backend === 'replicate'
          ? await this._callReplicate(prompt)
          : await this._callOpenAI(prompt);

        const result = {
          imageUrl: imageData.url,
          prompt: prompt,
          style: stylePreferences.preference || 'classic',
          mbti: personality.mbti?.type,
          enneagram: personality.enneagram?.type,
          generatedAt: new Date().toISOString()
        };

        // Cache for 7 days
        try {
          cache.set(cacheKey, result, 7 * 24 * 3600);
        } catch (e) {
          logger.warn('ImageGenerator cache set failed', { error: e.message });
        }

        logger.info('ImageGenerator success', {
          backend: this.config.backend,
          mbti: result.mbti,
          url: result.imageUrl
        });

        return result;
      } catch (error) {
        lastError = error;
        logger.warn('ImageGenerator attempt failed', {
          attempt: attempt + 1,
          error: error.message
        });
        if (attempt < this.config.maxRetries) {
          await this._sleep((attempt + 1) * 1000); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * Build the brand-aligned image generation prompt.
   * Uses CSO-approved buildImagePrompt from v2 templates.
   * @private
   */
  _buildPrompt(personality, stylePreferences) {
    return templates.buildImagePrompt(personality, stylePreferences);
  }

  /**
   * Call OpenAI DALL-E 3 API.
   * Requires OpenAI API key via apiKeyProvider.
   * @private
   */
  async _callOpenAI(prompt) {
    // Pre-Alpha: route through cloud function when enabled
    if (this.config.useCloudFunction) {
      logger.debug('ImageGenerator: routing through cloud function', {
        cloudFunction: this.config.cloudFunctionName
      });

      const result = await wx.cloud.callFunction({
        name: this.config.cloudFunctionName,
        data: {
          action: 'generateStyleImage',
          data: {
            prompt,
            style: this.config.style
          }
        }
      });

      if (result.errMsg && !result.errMsg.includes('ok')) {
        throw new Error(`云函数调用失败: ${result.errMsg}`);
      }

      const cloudData = result.result;
      if (!cloudData || !cloudData.success) {
        throw new Error(cloudData?.message || `Cloud function error: ${cloudData?.error}`);
      }

      // FLUX async fallback: poll until prediction succeeds
      if (cloudData.data?.status === 'pending' && cloudData.data?.predictionId) {
        return await this._pollImagePredictionStatus(cloudData.data.predictionId);
      }

      return { url: cloudData.data.url };
    }

    // Legacy: direct API call
    const apiKey = await this._getApiKey('openai');

    const response = await wx.request({
      url: this.config.openaiUrl,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: {
        model: 'dall-e-3',
        prompt: prompt,
        n: this.config.n,
        size: this.config.size,
        quality: this.config.quality,
        style: this.config.style,
        response_format: 'url'
      },
      timeout: this.config.timeout
    });

    if (response.statusCode !== 200) {
      throw new Error(`OpenAI API error: ${response.statusCode}`);
    }

    const data = response.data;
    if (!data.data || !data.data[0]?.url) {
      throw new Error('Invalid DALL-E response structure');
    }

    return { url: data.data[0].url };
  }

  /**
   * Call Replicate API for Stable Diffusion.
   * @private
   */
  async _callReplicate(prompt) {
    const apiKey = await this._getApiKey('replicate');

    // Create prediction
    const createResponse = await wx.request({
      url: this.config.replicateUrl,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`
      },
      data: {
        version: 'sdxl:39ed52f2a78e934b3ba6e2a89f5b1a2d7a5b6c4d3e2f1a0b9c8d7e6f5a4b3c',
        input: {
          prompt: prompt,
          negative_prompt: 'cartoon, illustration, text, logo, watermark, flashy, trendy, bold patterns',
          width: 1024,
          height: 1024,
          num_inference_steps: 30,
          guidance_scale: 7.5
        }
      },
      timeout: this.config.timeout
    });

    if (createResponse.statusCode !== 201) {
      throw new Error(`Replicate API error: ${createResponse.statusCode}`);
    }

    const predictionId = createResponse.data.id;

    // Poll for completion
    return await this._pollReplicate(predictionId, apiKey);
  }

  /**
   * Poll Replicate prediction until completion.
   * @private
   */
  async _pollReplicate(predictionId, apiKey) {
    const pollUrl = `${this.config.replicateUrl}/${predictionId}`;
    const maxAttempts = 60;
    const pollInterval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      await this._sleep(pollInterval);

      const response = await wx.request({
        url: pollUrl,
        method: 'GET',
        header: {
          'Authorization': `Token ${apiKey}`
        },
        timeout: 10000
      });

      if (response.statusCode !== 200) {
        throw new Error(`Replicate poll error: ${response.statusCode}`);
      }

      const status = response.data.status;

      if (status === 'succeeded') {
        const output = response.data.output;
        const imageUrl = Array.isArray(output) ? output[output.length - 1] : output;
        if (!imageUrl) throw new Error('No image URL in Replicate response');
        return { url: imageUrl };
      }

      if (status === 'failed') {
        throw new Error('Replicate prediction failed: ' + (response.data.error || 'unknown'));
      }

      // status === 'processing' or 'starting' — continue polling
      logger.debug('Replicate polling', { attempt: i + 1, status });
    }

    throw new Error('Replicate prediction timed out');
  }

  /**
   * Poll cloud function for FLUX image prediction status.
   * Used when DALL-E fails and FLUX async fallback is triggered.
   * @private
   */
  async _pollImagePredictionStatus(predictionId) {
    const maxAttempts = 30;
    const pollInterval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      await this._sleep(pollInterval);

      const result = await wx.cloud.callFunction({
        name: this.config.cloudFunctionName,
        data: {
          action: 'getPredictionStatus',
          data: { predictionId }
        }
      });

      if (result.errMsg && !result.errMsg.includes('ok')) {
        logger.warn('getPredictionStatus call failed', { attempt: i + 1, err: result.errMsg });
        continue;
      }

      const cloudData = result.result;

      if (!cloudData?.success) {
        logger.warn('getPredictionStatus returned error', { attempt: i + 1, error: cloudData?.message });
        continue;
      }

      if (cloudData.status === 'succeeded') {
        return { url: cloudData.data?.url };
      }

      if (cloudData.status === 'failed') {
        throw new Error('FLUX image generation failed: ' + (cloudData.message || 'unknown'));
      }

      // still processing — continue polling
      logger.debug('FLUX prediction polling', { attempt: i + 1, status: cloudData.status });
    }

    throw new Error('FLUX image generation timed out after 60 seconds');
  }

  /**
   * Get API key for specified backend.
   * @private
   */
  async _getApiKey(backend) {
    if (this.config.apiKeyProvider) {
      try {
        const key = await this.config.apiKeyProvider(backend);
        if (!key) {
          throw new Error(`No API key for backend: ${backend}`);
        }
        return key;
      } catch (error) {
        throw new Error(`Failed to get API key: ${error.message}`);
      }
    }

    // Fallback to app globalData (temporary development only)
    if (typeof getApp === 'function') {
      const app = getApp();
      const keyMap = {
        openai: app.globalData?.openaiApiKey,
        replicate: app.globalData?.replicateApiKey
      };
      const key = keyMap[backend];
      if (key && key !== 'your-api-key') {
        return key;
      }
    }

    throw new Error(`No API key configured for ${backend}. Set up cloud function or provide apiKeyProvider.`);
  }

  /**
   * Build deterministic cache key from personality + preferences.
   * @private
   */
  _buildCacheKey(personality, stylePreferences) {
    const parts = [
      personality.mbti?.type || 'unknown',
      personality.enneagram?.type || '0',
      stylePreferences.preference || 'classic',
      (stylePreferences.primaryPalette || []).join('-')
    ];
    return `img_${parts.join('_')}`;
  }

  /**
   * Return branded fallback when API is unavailable.
   * @private
   */
  _getFallback(personality, stylePreferences) {
    return {
      imageUrl: this.config.fallbackUrl,
      prompt: this._buildPrompt(personality, stylePreferences),
      style: stylePreferences.preference || 'classic',
      mbti: personality.mbti?.type,
      enneagram: personality.enneagram?.type,
      generatedAt: new Date().toISOString(),
      isFallback: true
    };
  }

  /**
   * Sleep utility for retry backoff.
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ImageGenerator;
