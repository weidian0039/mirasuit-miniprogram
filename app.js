// MIRASUIT — App Entry
// ====================
App({
  globalData: {
    userProfile: null,
    styleResult: null,
    questionnaireAnswers: [],
    apiBase: 'https://us-central1-mirasuit.cloudfunctions.net',
    // API keys loaded from env (set via cloud function config)
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
    replicateKey: process.env.REPLICATE_API_KEY || '',
  },

  onLaunch() {
    // Restore session from storage
    const savedProfile = wx.getStorageSync('userProfile');
    const savedResult = wx.getStorageSync('styleResult');
    const savedAnswers = wx.getStorageSync('questionnaireAnswers') || [];

    if (savedProfile) this.globalData.userProfile = savedProfile;
    if (savedResult) this.globalData.styleResult = savedResult;
    if (savedAnswers.length) this.globalData.questionnaireAnswers = savedAnswers;

    // Check for shared deep link params
    this.handleShareParams();
  },

  onShow(options) {
    this.handleShareParams(options);
  },

  handleShareParams(options = {}) {
    const query = options.query || {};
    if (query.mbti || query.style) {
      // Deep link from shared card
      wx.setStorageSync('shareParam', query);
    }
  },

  saveProgress() {
    wx.setStorageSync('userProfile', this.globalData.userProfile);
    wx.setStorageSync('styleResult', this.globalData.styleResult);
    wx.setStorageSync('questionnaireAnswers', this.globalData.questionnaireAnswers);
  },

  clearProgress() {
    this.globalData.userProfile = null;
    this.globalData.styleResult = null;
    this.globalData.questionnaireAnswers = [];
    wx.removeStorageSync('userProfile');
    wx.removeStorageSync('styleResult');
    wx.removeStorageSync('questionnaireAnswers');
    wx.removeStorageSync('shareParam');
  }
});
