/**
 * MIRASUIT Questionnaire Manager
 * Manages the 8-question MBTI-style style discovery test.
 *
 * Brand: Sophisticated, Understated, Premium — MIRASUIT consultant voice.
 */

const STORAGE_KEY = 'mirasuit_questionnaire';

// 8-question structure aligned to MBTI dimensions + supplementary style traits
const QUESTIONS = {
  social: {
    category: 'social',
    dimension: 'E/I',
    question: 'In a social setting, you are most likely to:',
    options: [
      { value: 'E1', label: 'Initiate conversations and energize the room', score: 'E' },
      { value: 'E2', label: 'Engage in deeper one-on-one discussions', score: 'E' },
      { value: 'I1', label: 'Observe quietly and contribute when moved', score: 'I' },
      { value: 'I2', label: 'Prefer to listen and absorb the atmosphere', score: 'I' }
    ]
  },
  information: {
    category: 'information',
    dimension: 'S/N',
    question: 'When making decisions, you rely more on:',
    options: [
      { value: 'S1', label: 'Concrete facts and what is directly observable', score: 'S' },
      { value: 'S2', label: 'Practical experience and proven results', score: 'S' },
      { value: 'N1', label: 'Patterns, possibilities, and what could be', score: 'N' },
      { value: 'N2', label: 'Intuition and long-term implications', score: 'N' }
    ]
  },
  decision: {
    category: 'decision',
    dimension: 'T/F',
    question: 'When choosing how to dress for an important occasion, you consider:',
    options: [
      { value: 'T1', label: 'What is appropriate, structured, and makes logical sense', score: 'T' },
      { value: 'T2', label: 'Whether the choice is consistent with your standards', score: 'T' },
      { value: 'F1', label: 'How it will be received and the feeling it creates', score: 'F' },
      { value: 'F2', label: 'Harmony with the occasion and the people present', score: 'F' }
    ]
  },
  lifestyle: {
    category: 'lifestyle',
    dimension: 'J/P',
    question: 'How do you approach planning your wardrobe and daily dressing:',
    options: [
      { value: 'J1', label: 'I prefer to plan ahead and have outfits ready', score: 'J' },
      { value: 'J2', label: 'I like to know my options and decide as I go', score: 'J' },
      { value: 'P1', label: 'I decide based on mood and how the day unfolds', score: 'P' },
      { value: 'P2', label: 'I keep options open and adapt as needed', score: 'P' }
    ]
  },
  motivation: {
    category: 'motivation',
    dimension: 'Achievement/Authenticity',
    question: 'What drives your approach to personal presentation most?',
    options: [
      { value: 'A1', label: 'Making an impression and being recognized for my taste', score: 'achievement' },
      { value: 'A2', label: 'Projecting confidence and competence', score: 'achievement' },
      { value: 'B1', label: 'Expressing who I truly am without compromise', score: 'authenticity' },
      { value: 'B2', label: 'Dressing in a way that feels genuine and comfortable', score: 'authenticity' }
    ]
  },
  stylePreference: {
    category: 'stylePreference',
    dimension: 'Classic/Edgy',
    question: 'Which description resonates most with your style aspiration?',
    options: [
      { value: 'C1', label: 'Timeless, refined, and quietly confident', score: 'classic' },
      { value: 'C2', label: 'Polished, understated, and assured', score: 'classic' },
      { value: 'E1', label: 'Distinctive, considered, and self-assured', score: 'edgy' },
      { value: 'E2', label: 'Forward, intentional, and individual', score: 'edgy' }
    ]
  },
  detailLevel: {
    category: 'detailLevel',
    dimension: 'High/Low Maintenance',
    question: 'How much attention do you typically give to details in your appearance?',
    options: [
      { value: 'H1', label: 'I notice and attend to the small things — collar, cuff, fit', score: 'high' },
      { value: 'H2', label: 'I care about the overall impression and finishing touches', score: 'high' },
      { value: 'L1', label: 'I prefer things clean, functional, and effortlessly right', score: 'low' },
      { value: 'L2', label: 'I aim for a natural ease where details resolve themselves', score: 'low' }
    ]
  },
  riskTolerance: {
    category: 'riskTolerance',
    dimension: 'Conservative/Bold',
    question: 'When it comes to pushing style boundaries, you are:',
    options: [
      { value: 'CO1', label: 'Cautious — I prefer to refine what I know works', score: 'conservative' },
      { value: 'CO2', label: 'Measured — I introduce one new element at a time', score: 'conservative' },
      { value: 'BO1', label: 'Open — I enjoy discovering unexpected combinations', score: 'bold' },
      { value: 'BO2', label: 'Curious — I explore when the occasion invites it', score: 'bold' }
    ]
  }
};

const CATEGORIES = Object.keys(QUESTIONS);

class QuestionnaireManager {
  constructor() {
    this._responses = {};
    this._dirty = false;
  }

  /**
   * Get the full question object for a given category.
   * @param {string} category
   * @returns {object|null}
   */
  getQuestion(category) {
    return QUESTIONS[category] || null;
  }

  /**
   * Get all responses collected so far.
   * @returns {object} { social: 'E1', information: 'N2', ... }
   */
  getResponses() {
    return Object.assign({}, this._responses);
  }

  /**
   * Save a response for a given category.
   * @param {string} category
   * @param {string} optionValue
   * @param {boolean} skipSync — if true, defer storage write (batch mode)
   */
  saveResponse(category, optionValue, skipSync = false) {
    if (!QUESTIONS[category]) {
      console.warn('[QM] Unknown category:', category);
      return;
    }
    this._responses[category] = optionValue;
    this._dirty = true;
    if (!skipSync) {
      this.saveToStorage();
    }
  }

  /**
   * Check if all 8 questions have been answered.
   * @returns {boolean}
   */
  isComplete() {
    return CATEGORIES.every(cat => !!this._responses[cat]);
  }

  /**
   * Load responses from local storage.
   */
  loadFromStorage() {
    try {
      const stored = wx.getStorageSync(STORAGE_KEY);
      if (stored && typeof stored === 'object') {
        this._responses = stored.responses || {};
      }
    } catch (e) {
      console.warn('[QM] Failed to load from storage:', e);
    }
  }

  /**
   * Persist responses to local storage.
   */
  saveToStorage() {
    try {
      wx.setStorageSync(STORAGE_KEY, {
        responses: this._responses,
        updatedAt: Date.now()
      });
      this._dirty = false;
    } catch (e) {
      console.warn('[QM] Failed to save to storage:', e);
    }
  }

  /**
   * Clear all responses and storage.
   */
  reset() {
    this._responses = {};
    this._dirty = false;
    try {
      wx.removeStorageSync(STORAGE_KEY);
    } catch (e) {
      console.warn('[QM] Failed to clear storage:', e);
    }
  }

  /**
   * Derive MBTI type string from responses.
   * Maps score patterns to E/I, S/N, T/F, J/P.
   * @returns {string} e.g. 'INTJ' or ''
   */
  deriveMBTI() {
    const scores = {};
    for (const [category, value] of Object.entries(this._responses)) {
      const q = QUESTIONS[category];
      if (!q) continue;
      const option = (q.options || []).find(o => o.value === value);
      if (option) {
        // For dual-E or dual-I questions, count both as their respective pole
        if (category === 'social') {
          scores.E = (scores.E || 0) + (option.score === 'E' ? 1 : 0);
          scores.I = (scores.I || 0) + (option.score === 'I' ? 1 : 0);
        } else if (category === 'information') {
          scores.S = (scores.S || 0) + (option.score === 'S' ? 1 : 0);
          scores.N = (scores.N || 0) + (option.score === 'N' ? 1 : 0);
        } else if (category === 'decision') {
          scores.T = (scores.T || 0) + (option.score === 'T' ? 1 : 0);
          scores.F = (scores.F || 0) + (option.score === 'F' ? 1 : 0);
        } else if (category === 'lifestyle') {
          scores.J = (scores.J || 0) + (option.score === 'J' ? 1 : 0);
          scores.P = (scores.P || 0) + (option.score === 'P' ? 1 : 0);
        }
      }
    }

    const mbti = [
      (scores.E || 0) >= (scores.I || 0) ? 'E' : 'I',
      (scores.S || 0) >= (scores.N || 0) ? 'S' : 'N',
      (scores.T || 0) >= (scores.F || 0) ? 'T' : 'F',
      (scores.J || 0) >= (scores.P || 0) ? 'J' : 'P'
    ].join('');

    return mbti;
  }
}

module.exports = { QuestionnaireManager, QUESTIONS, CATEGORIES };
