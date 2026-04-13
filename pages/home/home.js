// pages/home/home.js
const app = getApp();

Page({
  data: {
    hasResult: false,
    styleResult: null,
  },

  onLoad() {
    this.checkExistingResult();
  },

  onShow() {
    this.checkExistingResult();
  },

  checkExistingResult() {
    const result = app.globalData.styleResult;
    const profile = app.globalData.userProfile;
    if (result && profile) {
      this.setData({
        hasResult: true,
        styleResult: result,
      });
    }
  },

  startJourney() {
    // Check if returning user wants to retake
    const result = this.data.hasResult;
    if (result) {
      wx.showModal({
        title: '重新测试',
        content: '重新测试将覆盖您之前的风格报告。确定继续？',
        confirmText: '继续',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            app.clearProgress();
            wx.navigateTo({ url: '/pages/questionnaire/questionnaire' });
          }
        },
      });
    } else {
      wx.navigateTo({ url: '/pages/questionnaire/questionnaire' });
    }
  },

  viewResult() {
    wx.switchTab({ url: '/pages/results/results' });
  },
});
