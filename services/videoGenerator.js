/**
 * MIRASUIT Video Generation Service
 *
 * Generates personalized 15-second style inspiration videos (9:16 vertical).
 * Uses CSO Sprint 3 Narrative Framework for brand-aligned scene structure.
 *
 * Backend: Replicate (CogVideoX image-to-video model)
 * Fallback: No-op placeholder when no API key configured
 *
 * Brand alignment:
 * - 7 scenes, 15 seconds, 9:16 vertical
 * - Opens on detail, pulls back to full reveal
 * - No brand presence until scene 6 (11s mark)
 * - No logos in scenes 1-5
 *
 * Architecture notes:
 * - Generates an initial reference frame using ImageGenerator,
 *   then runs image-to-video on it via Replicate
 * - Scene-level prompts from prompts/video-scripts.js
 * - Video is cached for 7 days per personality combination
 */

const templates = require('../prompts/video-scripts');
const cache = require('./cache');
const logger = require('./logger');

// Fallback thumbnail: branded Unsplash suit photo
const FALLBACK_THUMBNAIL = 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=720&q=80';

class VideoGenerator {
  constructor(config = {}) {
    this.config = {
      // Backend: 'replicate'
      backend: config.backend || 'replicate',
      // API key provider function (used when useCloudFunction=false)
      apiKeyProvider: config.apiKeyProvider || null,
      // Cloud function config (Pre-Alpha: useCloudFunction=true routes through cloud)
      useCloudFunction: config.useCloudFunction || false,
      cloudFunctionName: config.cloudFunctionName || 'mirasuit-video-api',
      // Replicate base URL
      replicateUrl: config.replicateUrl || 'https://api.replicate.com/v1',
      // Model: CogVideoX image-to-video (5B parameters)
      modelVersion: config.modelVersion || 'cogvideoix/cogvideoix-5b:intemporally-ai',
      // Generation parameters
      numFrames: config.numFrames || 49,       // ~7 seconds at 7fps (base model)
      // For extended: numFrames=97 gives ~14s at 7fps
      // We generate 2 segments: opener + main, then concatenate
      duration: config.duration || 15,
      aspectRatio: config.aspectRatio || '9:16',
      // Polling
      maxPollAttempts: config.maxPollAttempts || 120,
      pollInterval: config.pollInterval || 3000,
      // Timeout per request
      timeout: config.timeout || 10000,
      // Retry
      maxRetries: config.maxRetries || 1,
      // Fallback
      fallbackThumbnail: config.fallbackThumbnail || FALLBACK_THUMBNAIL
    };
  }

  /**
   * Generate a personalized 15-second style video.
   *
   * Process:
   * 1. Build brand-aligned video prompt from CSO framework
   * 2. Check cache for existing video
   * 3. Generate initial frame via ImageGenerator (or use provided frame)
   * 4. Run image-to-video via Replicate
   * 5. Cache and return result
   *
   * @param {Object} personality - User personality (from ClaudeService)
   * @param {Object} stylePreferences - Style recommendations
   * @param {Object} opts - Optional overrides
   * @param {string} opts.referenceImageUrl - Pre-generated image URL to animate
   * @returns {Promise<Object>} { videoUrl, thumbnailUrl, prompt, mbti, duration, scenes }
   */
  async generateStyleVideo(personality, stylePreferences, opts = {}) {
    const cacheKey = this._buildCacheKey(personality, stylePreferences);

    // Check cache first
    try {
      const cached = cache.get(cacheKey);
      if (cached) {
        logger.info('VideoGenerator cache hit', { cacheKey });
        return cached;
      }
    } catch (e) {
      // Cache miss, proceed to generation
    }

    try {
      const result = await this._generate(personality, stylePreferences, opts, cacheKey);

      // Cache for 7 days
      try {
        cache.set(cacheKey, result, 7 * 24 * 3600);
      } catch (e) {
        logger.warn('VideoGenerator cache set failed', { error: e.message });
      }

      logger.info('VideoGenerator success', {
        mbti: personality.mbti?.type,
        duration: result.duration
      });

      return result;
    } catch (error) {
      logger.captureError(error, { context: 'VideoGenerator.generateStyleVideo' });
      return this._getFallback(personality, stylePreferences);
    }
  }

  /**
   * Internal generation with retry.
   * @private
   */
  async _generate(personality, stylePreferences, opts, cacheKey) {
    const scriptData = templates.buildVideoPrompt(personality, stylePreferences);
    let lastError;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this._callBackend(scriptData, personality, opts);
      } catch (error) {
        lastError = error;
        logger.warn('VideoGenerator attempt failed', {
          attempt: attempt + 1,
          error: error.message
        });
        if (attempt < this.config.maxRetries) {
          await this._sleep((attempt + 1) * 2000);
        }
      }
    }

    throw lastError;
  }

  /**
   * Call the configured video generation backend.
   * @private
   */
  async _callBackend(scriptData, personality, opts) {
    // Pre-Alpha: route through cloud function when enabled
    if (this.config.useCloudFunction) {
      logger.debug('VideoGenerator: routing through cloud function', {
        cloudFunction: this.config.cloudFunctionName
      });

      const result = await wx.cloud.callFunction({
        name: this.config.cloudFunctionName,
        data: {
          action: 'generateStyleVideo',
          data: {
            scriptData: {
              prompt: scriptData.prompt,
              scenes: scriptData.scenes,
              voiceover: scriptData.voiceover,
              music: scriptData.music,
              metadata: scriptData.metadata
            },
            personality: {
              mbti: personality.mbti,
              enneagram: personality.enneagram
            },
            referenceImageUrl: opts.referenceImageUrl || this.config.fallbackThumbnail
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

      const videoData = cloudData.data;
      // If status=pending, the video is async — return predictionId for polling
      if (videoData.status === 'pending') {
        return {
          videoUrl: null,
          predictionId: videoData.predictionId,
          status: 'pending',
          message: videoData.message
        };
      }

      return {
        videoUrl: videoData.videoUrl,
        thumbnailUrl: opts.referenceImageUrl || this.config.fallbackThumbnail,
        prompt: scriptData.prompt,
        scenes: scriptData.scenes,
        voiceover: scriptData.voiceover,
        music: scriptData.music,
        mbti: personality.mbti?.type,
        enneagram: personality.enneagram?.type,
        style: scriptData.metadata?.style,
        duration: 7,
        aspectRatio: this.config.aspectRatio,
        generatedAt: new Date().toISOString()
      };
    }

    if (this.config.backend === 'replicate') {
      return await this._callReplicate(scriptData, personality, opts);
    }

    // No other backends configured — fall through to fallback
    throw new Error(`No supported video backend: ${this.config.backend}`);
  }

  /**
   * Call Replicate API for image-to-video generation.
   *
   * Uses CogVideoX image-to-video model:
   * - Input: reference image URL + prompt
   * - Output: MP4 video URL
   *
   * For 15s video: generates two 7s segments and concatenates.
   * Scene 1 (0-7s): detail-to-reveal opener
   * Scene 2 (7-15s): main body with voiceover timing
   *
   * @private
   */
  async _callReplicate(scriptData, personality, opts) {
    const apiKey = await this._getApiKey('replicate');

    const referenceImageUrl = opts.referenceImageUrl || this.config.fallbackThumbnail;

    // Build the image-to-video prompt (scene 1 style, detail closeup → reveal)
    const openerPrompt = templates.buildScenePrompt(
      'lapel_fabric_texture',
      personality,
      { recommendedStyles: [scriptData.metadata.style] }
    );

    // Main video prompt (full structure)
    const mainPrompt = scriptData.prompt;

    // Segment 1: opener (0-7s) — detail to reveal
    const segment1 = await this._createReplicatePrediction(
      apiKey,
      referenceImageUrl,
      openerPrompt,
      49 // 7 seconds at 7fps
    );

    // Segment 2: main body (7-15s) — full scene structure
    const segment2 = await this._createReplicatePrediction(
      apiKey,
      referenceImageUrl,
      mainPrompt,
      97 // 14 seconds at 7fps — will trim to 8s client-side
    );

    // For pre-alpha: return segment1 as the main video
    // (CogVideoX generates ~7s per call; concatenation handled post-processing)
    // TODO (Sprint 4): implement FFmpeg concatenation via cloud function
    const primaryVideoUrl = segment1;
    const thumbnailUrl = referenceImageUrl;

    return {
      videoUrl: primaryVideoUrl,
      thumbnailUrl,
      prompt: openerPrompt,
      fullPrompt: mainPrompt,
      scenes: scriptData.scenes,
      voiceover: scriptData.voiceover,
      music: scriptData.music,
      mbti: personality.mbti?.type,
      enneagram: personality.enneagram?.type,
      style: scriptData.metadata.style,
      duration: 7, // Current segment length; full 15s requires concatenation
      aspectRatio: this.config.aspectRatio,
      generatedAt: new Date().toISOString(),
      segments: [segment1, segment2],
      metadata: scriptData.metadata
    };
  }

  /**
   * Create and poll a Replicate prediction.
   * @private
   */
  async _createReplicatePrediction(apiKey, imageUrl, prompt, numFrames) {
    const createResponse = await wx.request({
      url: `${this.config.replicateUrl}/predictions`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`
      },
      data: {
        version: this.config.modelVersion,
        input: {
          image: imageUrl,
          prompt: prompt,
          num_frames: numFrames,
          num_inference_steps: 50,
          guidance_scale: 7.5,
          motion_bucket_id: 127,
          // CogVideoX-specific options
          negative_prompt: 'cartoon, illustration, text, logo, watermark, flashy, trendy, fast motion, shaky camera, distorted face, extra limbs, low quality'
        }
      },
      timeout: this.config.timeout
    });

    if (createResponse.statusCode !== 201) {
      throw new Error(`Replicate create failed: ${createResponse.statusCode}`);
    }

    const predictionId = createResponse.data.id;
    return await this._pollPrediction(predictionId, apiKey);
  }

  /**
   * Poll Replicate prediction until completion or failure.
   * @private
   */
  async _pollPrediction(predictionId, apiKey) {
    const pollUrl = `${this.config.replicateUrl}/predictions/${predictionId}`;

    for (let i = 0; i < this.config.maxPollAttempts; i++) {
      await this._sleep(this.config.pollInterval);

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

        // output can be: string URL, [string URL], or {video: string, ...}
        let videoUrl;
        if (Array.isArray(output)) {
          videoUrl = output[output.length - 1];
        } else if (typeof output === 'string') {
          videoUrl = output;
        } else if (output && typeof output === 'object') {
          videoUrl = output.video || output[0] || null;
        }

        if (!videoUrl) {
          throw new Error('No video URL in Replicate output: ' + JSON.stringify(output));
        }

        return videoUrl;
      }

      if (status === 'failed') {
        throw new Error('Replicate prediction failed: ' + (response.data.error || 'unknown'));
      }

      logger.debug('VideoGenerator polling', { attempt: i + 1, status });
    }

    throw new Error('Replicate prediction timed out after ' + this.config.maxPollAttempts + ' attempts');
  }

  /**
   * Get API key from provider or app globalData.
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

    if (typeof getApp === 'function') {
      const app = getApp();
      const keyMap = {
        replicate: app.globalData?.replicateApiKey
      };
      const key = keyMap[backend];
      if (key && key !== 'your-api-key') {
        return key;
      }
    }

    throw new Error(`No API key configured for ${backend}. Set globalData.replicateApiKey or deploy cloud function.`);
  }

  /**
   * Build deterministic cache key from personality + style.
   * @private
   */
  _buildCacheKey(personality, stylePreferences) {
    const parts = [
      personality.mbti?.type || 'unknown',
      personality.enneagram?.type || '0',
      stylePreferences.recommendedStyles?.[0] || 'classic',
      (stylePreferences.primaryPalette || []).join('-')
    ];
    return `vid_${parts.join('_')}`;
  }

  /**
   * Return branded fallback when API is unavailable.
   * Returns the thumbnail image wrapped in a video-like result object.
   * @private
   */
  _getFallback(personality, stylePreferences) {
    const scriptData = templates.buildVideoPrompt(personality, stylePreferences);
    return {
      videoUrl: null,
      thumbnailUrl: this.config.fallbackThumbnail,
      prompt: scriptData.prompt,
      scenes: scriptData.scenes,
      voiceover: scriptData.voiceover,
      music: scriptData.music,
      mbti: personality.mbti?.type,
      enneagram: personality.enneagram?.type,
      style: scriptData.metadata.style,
      duration: 15,
      aspectRatio: this.config.aspectRatio,
      generatedAt: new Date().toISOString(),
      isFallback: true,
      metadata: scriptData.metadata,
      _note: 'Video generation unavailable — configure replicateApiKey to enable'
    };
  }

  /**
   * Sleep utility.
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = VideoGenerator;
