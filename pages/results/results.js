// pages/results/results.js
// M-15 Performance: lightweight imports only — heavy modules lazy-loaded inside analyzeUser()
const logger = require('../../services/logger');
const cache = require('../../services/cache'); // lightweight, keep at module level
const UserProfileManager = require('../../utils/userProfile');
const { QuestionnaireManager } = require('../../utils/questionnaire');
// Heavy modules: loaded inside analyzeUser() on demand — not on page load
// const SecureAPIService = require('../../services/secure-api');
// const ImageGenerator = require('../../services/imageGenerator');
// const VideoGenerator = require('../../services/videoGenerator');
// const Analytics = require('../../services/analytics');

Page({
  data: {
    loading: true,
    error: null,
    personality: null,
    recommendations: null,
    advice: null,
    styleImage: null,
    imageLoading: false,
    styleVideo: null,
    videoLoading: false
  },

  onLoad(options) {
    logger.userAction('page-load', { page: 'results' });
    this._trackResultsViewLazy(); // M-15: lazy analytics
    this.analyzeUser();
  },

  // M-15: Lazy analytics — require + instantiate only when needed
  _trackResultsViewLazy() {
    try {
      const Analytics = require('../../services/analytics');
      const analytics = new Analytics({ useCloudFunction: true });
      analytics.trackFunnel('results_view');
    } catch (e) {
      // Analytics failure must not block page
    }
  },

  // M-15: Lazy analytics for API tracking
  _trackAPI(service, success, latencyMs, errorType = null) {
    try {
      const Analytics = require('../../services/analytics');
      const analytics = new Analytics({ useCloudFunction: true });
      this._trackAPI(service, success, latencyMs, errorType);
    } catch (e) {
      // Analytics failure must not block API calls
    }
  },

  async analyzeUser() {
    try {
      this.setData({ loading: true, error: null });
      logger.info('Analysis started');

      // M-15: lazy-require heavy modules — not loaded on page init
      const SecureAPIService = require('../../services/secure-api');
      const ImageGenerator = require('../../services/imageGenerator');
      const VideoGenerator = require('../../services/videoGenerator');

      const qm = new QuestionnaireManager();
      qm.loadFromStorage();

      if (!qm.isComplete()) {
        const errorMsg = '请先完成问卷';
        logger.warn('Questionnaire incomplete');
        this.setData({
          loading: false,
          error: errorMsg
        });
        return;
      }

      const responses = qm.getResponses();

      const apiService = new SecureAPIService({
        useCloudFunction: true, // Pre-Alpha: 通过云函数保护 API Key
        cloudFunctionName: 'mirasuit-claude-api'
        // apiKeyProvider 已不需要，云函数环境变量提供
      });

      const profileManager = new UserProfileManager();

      // Initialize image generator (Pre-Alpha: through cloud function)
      const imageGenerator = new ImageGenerator({
        useCloudFunction: true, // Pre-Alpha: 通过云函数保护 API Key
        cloudFunctionName: 'mirasuit-image-api'
        // apiKeyProvider 已不需要，云函数环境变量提供
      });

      // Initialize video generator (Pre-Alpha: through cloud function)
      const videoGenerator = new VideoGenerator({
        useCloudFunction: true, // Pre-Alpha: 通过云函数保护 API Key
        cloudFunctionName: 'mirasuit-video-api'
        // apiKeyProvider 已不需要，云函数环境变量提供
      });

      // 使用缓存优化性能
      const cacheKey = `personality_${JSON.stringify(responses)}`;

      // Analyze personality (with cache)
      logger.info('Calling personality analysis API');
      const t0 = Date.now();
      const personalityResult = await cache.getOrSet(
        cacheKey,
        async () => await apiService.analyzePersonality(responses),
        7 * 24 * 3600 // 7 天缓存
      );
      this._trackAPI('claude', personalityResult.success, Date.now() - t0,
        personalityResult.success ? null : 'PERSONALITY_ANALYSIS_FAILED');

      if (personalityResult.success) {
        profileManager.savePersonalityAnalysis(personalityResult.data);
        this.setData({ personality: personalityResult.data });
        logger.info('Personality analysis success', {
          mbti: personalityResult.data.mbti?.type
        });
      } else {
        throw new Error(personalityResult.message);
      }

      // Get style recommendations (with cache)
      const recCacheKey = `recommendations_${personalityResult.data.mbti?.type}`;
      const t1 = Date.now();
      const recommendationsResult = await cache.getOrSet(
        recCacheKey,
        async () => await apiService.getStyleRecommendations(personalityResult.data),
        7 * 24 * 3600
      );
      this._trackAPI('claude', recommendationsResult.success, Date.now() - t1,
        recommendationsResult.success ? null : 'STYLE_RECS_FAILED');

      if (recommendationsResult.success) {
        profileManager.saveStylePreferences(recommendationsResult.data);
        profileManager.addToStyleHistory({
          item: 'Personality analysis',
          type: recommendationsResult.data.recommendedStyles?.[0] || 'classic'
        });
        this.setData({ recommendations: recommendationsResult.data });
        logger.info('Style recommendations success');
      } else {
        throw new Error(recommendationsResult.message);
      }

      // Generate style inspiration image and video (parallel, non-blocking)
      this._generateStyleImage(imageGenerator, personalityResult.data, recommendationsResult.data);
      this._generateStyleVideo(videoGenerator, personalityResult.data, recommendationsResult.data);

      // Get personalized advice
      const userProfile = profileManager.getProfile();
      const adviceResult = await apiService.getPersonalizedAdvice(userProfile);

      if (adviceResult.success) {
        this.setData({ advice: adviceResult.data });
        logger.info('Personal advice success');
      } else {
        throw new Error(adviceResult.message);
      }

      this.setData({ loading: false });
      logger.info('Analysis completed successfully');

      // 输出缓存统计
      const cacheStats = cache.getStats();
      logger.info('Cache statistics', cacheStats);

    } catch (error) {
      logger.captureError(error, { context: 'analyzeUser' });
      this.setData({
        loading: false,
        error: error.message || '分析失败，请稍后重试'
      });
    }
  },

  /**
   * Generate personalized style inspiration image (non-blocking).
   * @private
   */
  async _generateStyleImage(imageGenerator, personality, recommendations) {
    this.setData({ imageLoading: true });
    const t0 = Date.now();

    try {
      const imageData = await imageGenerator.generateStyleImage(personality, recommendations);
      this._trackAPI('image', true, Date.now() - t0);
      this.setData({
        styleImage: imageData,
        imageLoading: false
      });
      logger.info('Style image generated', {
        isFallback: imageData.isFallback,
        mbti: imageData.mbti
      });
    } catch (error) {
      this._trackAPI('image', false, Date.now() - t0, 'IMAGE_GENERATION_FAILED');
      logger.captureError(error, { context: '_generateStyleImage' });
      this.setData({ imageLoading: false });
    }
  },

  /**
   * Generate personalized style inspiration video (non-blocking).
   * @private
   */
  async _generateStyleVideo(videoGenerator, personality, recommendations) {
    this.setData({ videoLoading: true });
    const t0 = Date.now();

    try {
      const videoData = await videoGenerator.generateStyleVideo(personality, recommendations);
      this._trackAPI('video', true, Date.now() - t0);
      this.setData({
        styleVideo: videoData,
        videoLoading: false
      });
      logger.info('Style video generated', {
        isFallback: videoData.isFallback,
        mbti: videoData.mbti
      });
    } catch (error) {
      this._trackAPI('video', false, Date.now() - t0, 'VIDEO_GENERATION_FAILED');
      logger.captureError(error, { context: '_generateStyleVideo' });
      this.setData({ videoLoading: false });
    }
  },

  /**
   * Preview video in full screen.
   */
  previewStyleVideo() {
    const { styleVideo } = this.data;
    if (!styleVideo?.videoUrl) return;

    // For short videos, use wx.previewImage with video thumbnail or
    // wx.navigateTo a dedicated video player page
    if (styleVideo.thumbnailUrl) {
      wx.previewImage({
        urls: [styleVideo.thumbnailUrl],
        current: styleVideo.thumbnailUrl
      });
    }
    logger.userAction('preview_style_video', { mbti: styleVideo.mbti });
  },

  /**
   * Save style video thumbnail to album.
   */
  saveStyleVideoThumbnail() {
    const { styleVideo } = this.data;
    if (!styleVideo?.thumbnailUrl) {
      wx.showToast({ title: 'No thumbnail available', icon: 'none' });
      return;
    }

    wx.saveImageToPhotosAlbum({
      filePath: styleVideo.thumbnailUrl,
      success: () => {
        wx.showToast({ title: 'Saved to album', icon: 'success' });
        logger.userAction('save_video_thumbnail', { mbti: styleVideo.mbti });
      },
      fail: (error) => {
        if (error.errMsg && error.errMsg.includes('auth deny')) {
          wx.showModal({
            title: 'Permission Required',
            content: 'Please allow photo album access in Settings to save images.',
            confirmText: 'Open Settings',
            success: (res) => {
              if (res.confirm) wx.openSetting();
            }
          });
        } else {
          wx.showToast({ title: 'Save failed', icon: 'none' });
        }
      }
    });
  },

  /**
   * Share style video via WeChat share sheet.
   */
  shareStyleVideo() {
    const { styleVideo, personality, recommendations } = this.data;
    if (!styleVideo?.thumbnailUrl && !styleVideo?.videoUrl) return;

    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareTimeline', 'shareAppMessage']
    });

    this.setData({
      shareData: {
        title: `My MIRASUIT Style: ${personality?.mbti?.type || ''} — ${recommendations?.recommendedStyles?.[0] || 'Classic'}`,
        path: '/pages/results/results',
        imageUrl: styleVideo.thumbnailUrl || styleVideo.videoUrl || '',
        query: `mbti=${personality?.mbti?.type || ''}&style=${recommendations?.recommendedStyles?.[0] || ''}`
      }
    });

    logger.userAction('share_style_video', { mbti: styleVideo.mbti });
  },

  /**
   * Preview image in full screen.
   */
  previewImage() {
    const { styleImage } = this.data;
    if (!styleImage?.imageUrl) return;

    wx.previewImage({
      urls: [styleImage.imageUrl],
      current: styleImage.imageUrl
    });
  },

  /**
   * Save style inspiration image to album.
   */
  async saveImage() {
    const { styleImage } = this.data;
    if (!styleImage?.imageUrl) return;

    try {
      const saved = await wx.saveImageToPhotosAlbum({
        filePath: styleImage.imageUrl
      });
      wx.showToast({
        title: 'Saved to album',
        icon: 'success'
      });
      logger.userAction('save_image', { mbti: styleImage.mbti });
    } catch (error) {
      // Handle permission denied
      if (error.errMsg && error.errMsg.includes('auth deny')) {
        wx.showModal({
          title: 'Permission Required',
          content: 'Please allow photo album access in Settings to save images.',
          confirmText: 'Open Settings',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      } else {
        wx.showToast({
          title: 'Save failed',
          icon: 'none'
        });
      }
    }
  },

  /**
   * Share style image via WeChat share sheet.
   */
  shareImage() {
    const { styleImage, personality, recommendations } = this.data;
    if (!styleImage?.imageUrl) return;

    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareTimeline', 'shareAppMessage']
    });

    this.setData({
      shareData: {
        title: 'Your MIRASUIT Style Profile',
        path: '/pages/results/results',
        imageUrl: styleImage.imageUrl,
        query: `mbti=${personality?.mbti?.type || ''}&style=${recommendations?.recommendedStyles?.[0] || ''}`
      }
    });

    logger.userAction('share_image', { mbti: styleImage.mbti });
  },

  retryAnalysis() {
    this.analyzeUser();
  },

  getMoreAdvice() {
    wx.showActionSheet({
      itemList: ['Business Meeting', 'Wedding', 'Casual Event', 'Date Night', 'Job Interview'],
      success: (res) => {
        const occasions = [
          'business meeting',
          'wedding',
          'casual event',
          'date night',
          'job interview'
        ];
        this.getAdviceForOccasion(occasions[res.tapIndex]);
      }
    });
  },

  async getAdviceForOccasion(occasion) {
    wx.showLoading({ title: 'Curating advice...' });

    try {
      const profileManager = new UserProfileManager();
      const userProfile = profileManager.getProfile();

      // ✅ 使用安全 API 服务
      const apiService = new SecureAPIService({
        useCloudFunction: true,
        cloudFunctionName: 'mirasuit-claude-api'
      });

      const result = await apiService.getPersonalizedAdvice(userProfile, occasion);

      if (result.success) {
        this.setData({ advice: result.data });
        logger.info('Occasion advice generated', { occasion });
        wx.hideLoading();
        wx.showToast({
          title: 'Advice updated',
          icon: 'success'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      logger.captureError(error, { context: 'getAdviceForOccasion' });
      wx.hideLoading();
      wx.showToast({
        title: error.message || 'Failed to generate advice',
        icon: 'none'
      });
    }
  },

  shareResults() {
    const { personality, recommendations } = this.data;

    if (!personality || !recommendations) {
      wx.showToast({
        title: 'No results to share',
        icon: 'none'
      });
      return;
    }

    const mbtiType = personality.mbti?.type || 'Unknown';
    const styles = recommendations.recommendedStyles?.join(', ') || 'classic';
    const insight = personality.mbti?.description || 'a refined approach to menswear that honors both personality and craft.';

    const shareText = `Your Style Identity\n\nBased on your style discovery, we've identified a wardrobe philosophy that aligns with who you are.\n\nYour MBTI: ${mbtiType}\n${insight}\n\nStyle Foundation: ${styles}\n\nThis is not a prescription — it's a starting point. As your style evolves, so will our recommendations.\n\nDiscover your style at MIRASUIT.`;

    wx.showModal({
      title: 'Your Style Profile',
      content: shareText,
      confirmText: 'Copy',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: shareText,
            success: () => {
              wx.showToast({
                title: 'Copied to clipboard',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  goToProfile() {
    wx.switchTab({
      url: '/pages/profile/profile'
    });
  },

  /**
   * WeChat native share — personality card share via timeline/app message.
   */
  onShareAppMessage() {
    const { personality, recommendations, styleImage } = this.data;
    return {
      title: 'My MIRASUIT Style Profile',
      path: '/pages/results/results',
      imageUrl: styleImage?.imageUrl || ''
    };
  },

  onShareTimeline() {
    const { personality, recommendations } = this.data;
    return {
      title: `My Style: ${personality?.mbti?.type || ''} — ${recommendations?.recommendedStyles?.[0] || 'Classic'}`,
      query: `mbti=${personality?.mbti?.type || ''}`
    };
  }
});
