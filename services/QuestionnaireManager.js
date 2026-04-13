// services/QuestionnaireManager.js
// M-6 Sprint 3 — Questionnaire state management

class QuestionnaireManager {
  constructor() {
    this.answers = [];
    this.currentIndex = 0;
  }

  saveAnswer(questionId, value, selectedIndex) {
    this.answers[questionId - 1] = { questionId, value, selectedIndex };
    wx.setStorageSync('q_answers', this.answers);
  }

  loadAnswers() {
    this.answers = wx.getStorageSync('q_answers') || [];
    return this.answers;
  }

  getAnswers() {
    return this.answers;
  }

  getProgress() {
    const total = 8;
    const answered = this.answers.filter(Boolean).length;
    return { current: answered, total, percent: (answered / total) * 100 };
  }

  calculateMBTI() {
    const counts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    this.answers.forEach(a => {
      if (a && counts[a.value] !== undefined) counts[a.value]++;
    });
    return (
      (counts.E >= counts.I ? 'E' : 'I') +
      (counts.S >= counts.N ? 'S' : 'N') +
      (counts.T >= counts.F ? 'T' : 'F') +
      (counts.J >= counts.P ? 'J' : 'P')
    );
  }

  clear() {
    this.answers = [];
    this.currentIndex = 0;
    wx.removeStorageSync('q_answers');
  }
}

module.exports = new QuestionnaireManager();
