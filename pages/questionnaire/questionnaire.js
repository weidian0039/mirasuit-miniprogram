// questionnaire.js
// M-15 Performance: lazy-require Analytics — not on critical path
const { QuestionnaireManager } = require('../../utils/questionnaire');

Page({
  data: {
    currentIndex: 0,
    totalQuestions: 8,
    categories: [
      'social',
      'information',
      'decision',
      'lifestyle',
      'motivation',
      'stylePreference',
      'detailLevel',
      'riskTolerance'
    ],
    currentQuestion: null,
    category: null,
    responses: {},
    progress: 0,
    hasAnswered: false,
    loading: false
  },

  // M-15: Lazy analytics helper
  _trackFunnel(stage, metadata = {}) {
    try {
      const Analytics = require('../../services/analytics');
      const analytics = new Analytics({ useCloudFunction: true });
      analytics.trackFunnel(stage, metadata);
    } catch (e) {
      // Analytics failure must not block page
    }
  },

  onLoad(options) {
    this.qm = new QuestionnaireManager();
    this.qm.loadFromStorage();
    this._answerCount = 0; // M-15: batch storage saves

    // Track funnel: questionnaire_start (only on genuine first start, not resume)
    const existingResponses = this.qm.getResponses();
    const answeredCount = Object.keys(existingResponses).length;
    if (answeredCount === 0) {
      this._trackFunnel('questionnaire_start', {});
    } else {
      // Resume: track separately so M-17 funnel analysis can distinguish
      this._trackFunnel('questionnaire_resume', { answeredCount });
    }

    // Load existing responses if any
    this.setData({
      responses: existingResponses
    });

    // Load first question
    this.loadQuestion(0);
  },

  /**
   * Load question by index
   */
  loadQuestion(index) {
    const category = this.data.categories[index];
    const question = this.qm.getQuestion(category);

    const progress = ((index + 1) / this.data.totalQuestions) * 100;

    this.setData({
      currentIndex: index,
      category: category,
      currentQuestion: question,
      progress: progress,
      hasAnswered: !!this.data.responses[category]
    });
  },

  /**
   * Handle option selection
   */
  onOptionSelect(e) {
    const option = e.currentTarget.dataset.option;
    const category = this.data.category;

    // Save to in-memory manager (always immediate for UI state)
    this.qm.saveResponse(category, option, true); // M-15: skip sync, we batch it

    // Update local state
    this.setData({
      hasAnswered: true,
      [`responses.${category}`]: option
    });

    // M-15: batch storage saves — write every 3 answers to reduce sync I/O
    this._answerCount = (this._answerCount || 0) + 1;
    if (this._answerCount % 3 === 0) {
      this.qm.saveToStorage();
    }

    // Auto advance after 300ms
    setTimeout(() => {
      if (this.data.currentIndex < this.data.totalQuestions - 1) {
        this.onNextQuestion();
      }
    }, 300);
  },

  /**
   * Navigate to next question
   */
  onNextQuestion() {
    if (!this.data.hasAnswered) {
      wx.showToast({
        title: 'Please select an option',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const nextIndex = this.data.currentIndex + 1;

    if (nextIndex >= this.data.totalQuestions) {
      // Questionnaire complete
      this.submitQuestionnaire();
    } else {
      this.loadQuestion(nextIndex);
    }
  },

  /**
   * Navigate to previous question
   */
  onPrevQuestion() {
    const prevIndex = this.data.currentIndex - 1;

    if (prevIndex >= 0) {
      this.loadQuestion(prevIndex);
    }
  },

  /**
   * Submit questionnaire and navigate to results
   */
  async submitQuestionnaire() {
    this.setData({ loading: true });

    try {
      // Check if complete
      if (!this.qm.isComplete()) {
        wx.showModal({
          title: 'Incomplete',
          content: 'Please answer all questions before submitting.',
          showCancel: false
        });
        this.setData({ loading: false });
        return;
      }

      // Get responses
      const responses = this.qm.getResponses();

      // Track funnel: questionnaire_complete — M-14 (lazy analytics)
      this._trackFunnel('questionnaire_complete', {
        responseCount: Object.keys(responses).length
      });

      // Navigate to results page with responses
      wx.navigateTo({
        url: `/pages/results/results?responses=${encodeURIComponent(JSON.stringify(responses))}`
      });
    } catch (error) {
      console.error('Submit error:', error);
      wx.showModal({
        title: 'Error',
        content: 'Failed to submit. Please try again.',
        showCancel: false
      });
      this.setData({ loading: false });
    }
  },

  /**
   * Handle page unload
   */
  onUnload() {
    // M-15: flush any remaining buffered responses to storage on page exit
    if (this.qm) {
      this.qm.saveToStorage();
    }
  }
});
