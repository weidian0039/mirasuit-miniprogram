// pages/home/home.js
// M-15 Performance: lazy-require Analytics to keep onLoad critical path clean
const { QuestionnaireManager } = require('../../utils/questionnaire');

Page({
  data: {
    questionnaireComplete: false
  },

  onLoad() {
    // M-15: fire-and-forget funnel track — no analytics constructor on critical path
    this._trackFunnelLazy();
  },

  onShow() {
    // M-15: deferred storage read — not on critical path
    this._checkQuestionnaireAsync();
  },

  // M-15: Lazy analytics — require + instantiate only when needed (non-blocking)
  _trackFunnelLazy() {
    try {
      const Analytics = require('../../services/analytics');
      const analytics = new Analytics({ useCloudFunction: true });
      analytics.trackFunnel('home_view');
    } catch (e) {
      // Analytics failure must not block page render
    }
  },

  // M-15: Async storage read — defers off critical path
  _checkQuestionnaireAsync() {
    const qm = new QuestionnaireManager();
    const isComplete = qm.isComplete();
    this.setData({ questionnaireComplete: isComplete });
  },

  startAnalysis() {
    const qm = new QuestionnaireManager();
    qm.loadFromStorage();

    if (qm.isComplete()) {
      // User already completed questionnaire, go to results
      wx.navigateTo({
        url: '/pages/results/results'
      });
    } else {
      // Start questionnaire
      wx.showModal({
        title: 'Style Analysis',
        content: 'This will take about 2 minutes. Answer honestly for best results.',
        confirmText: 'Start',
        cancelText: 'Cancel',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/questionnaire/questionnaire'
            });
          }
        }
      });
    }
  }
});
