// pages/profile/profile.js
const UserProfileManager = require('../../utils/userProfile');
const { QuestionnaireManager } = require('../../utils/questionnaire');
const FeedbackService = require('../../services/feedback');

Page({
  data: {
    completion: 0,
    personality: null,
    stylePreferences: null,
    styleHistory: [],
    // M-13 Alpha feedback
    showFeedbackModal: false,
    feedbackSubmitted: false,
    feedbackRating: 0,
    feedbackStage: 'general',
    feedbackComment: '',
    feedbackContact: '',
  },

  onLoad() {
    this.feedbackService = new FeedbackService({ useCloudFunction: true });
    this.setData({ feedbackSubmitted: this.feedbackService.hasSubmitted() });
    this.loadProfile();
  },

  onShow() {
    this.loadProfile();
  },

  loadProfile() {
    const profileManager = new UserProfileManager();
    const profile = profileManager.getProfile();

    this.setData({
      completion: profileManager.getCompletionPercentage(),
      personality: profile.personality,
      stylePreferences: profile.stylePreferences,
      styleHistory: profileManager.getStyleHistory(5)
    });
  },

  startQuestionnaire() {
    wx.navigateTo({
      url: '/pages/questionnaire/questionnaire'
    });
  },

  retakeQuestionnaire() {
    wx.showModal({
      title: 'Retake Analysis',
      content: 'This will replace your current personality analysis. Continue?',
      confirmText: 'Retake',
      cancelText: 'Cancel',
      success: (res) => {
        if (res.confirm) {
          const qm = new QuestionnaireManager();
          qm.reset();

          wx.navigateTo({
            url: '/pages/questionnaire/questionnaire'
          });
        }
      }
    });
  },

  clearData() {
    wx.showModal({
      title: 'Clear All Data',
      content: 'This will permanently delete your profile data. This cannot be undone.',
      confirmText: 'Clear',
      confirmColor: '#f44336',
      cancelText: 'Cancel',
      success: (res) => {
        if (res.confirm) {
          const profileManager = new UserProfileManager();
          profileManager.clearProfile();

          const qm = new QuestionnaireManager();
          qm.reset();

          wx.showToast({
            title: 'Data cleared',
            icon: 'success'
          });

          this.setData({
            completion: 0,
            personality: null,
            stylePreferences: null,
            styleHistory: []
          });
        }
      }
    });
  },

  // ─── M-13 Alpha Feedback ─────────────────────────────────────

  openFeedback() {
    this.setData({
      showFeedbackModal: true,
      feedbackRating: 0,
      feedbackStage: 'general',
      feedbackComment: '',
      feedbackContact: '',
    });
  },

  closeFeedback() {
    this.setData({ showFeedbackModal: false });
  },

  setFeedbackRating(e) {
    this.setData({ feedbackRating: parseInt(e.currentTarget.dataset.rating, 10) });
  },

  setFeedbackStage(e) {
    this.setData({ feedbackStage: e.currentTarget.dataset.stage });
  },

  setFeedbackComment(e) {
    this.setData({ feedbackComment: e.detail.value || '' });
  },

  setFeedbackContact(e) {
    this.setData({ feedbackContact: e.detail.value || '' });
  },

  async submitFeedback() {
    const { feedbackRating, feedbackStage, feedbackComment, feedbackContact } = this.data;

    if (!feedbackRating || feedbackRating < 1) {
      wx.showToast({ title: 'Please select a rating', icon: 'none' });
      return;
    }

    // Get MBTI if available
    const profileManager = new UserProfileManager();
    const profile = profileManager.getProfile();
    const mbti = profile?.personality?.mbti?.type || null;

    wx.showLoading({ title: 'Submitting...', mask: true });

    const result = await this.feedbackService.submit({
      rating: feedbackRating,
      stage: feedbackStage,
      comment: feedbackComment,
      contact: feedbackContact,
      mbti,
    });

    wx.hideLoading();

    if (result.success) {
      this.setData({
        showFeedbackModal: false,
        feedbackSubmitted: true,
      });
      wx.showToast({ title: 'Thank you.', icon: 'success' });
    } else {
      wx.showToast({ title: result.message || 'Failed to submit', icon: 'none' });
    }
  },
});
