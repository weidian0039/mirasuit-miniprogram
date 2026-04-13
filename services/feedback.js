/**
 * MIRASUIT Feedback Service — M-13 Sprint 4 Alpha User Testing
 * Collects alpha user feedback: rating, comments, stage, contact.
 *
 * Storage: Local-first (privacy), synced to cloud when deployed.
 * Brand voice: Subtle, understated — no "Amazing!" or "Perfect!"
 */

const FEEDBACK_KEY = 'mira_feedback';

class FeedbackService {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      cloudFunctionName: config.cloudFunctionName || 'mirasuit-feedback-api',
      useCloudFunction: config.useCloudFunction || false,
    };

    this._loadSubmitted();
  }

  // ─── Submit Feedback ─────────────────────────────────────────────

  /**
   * Submit user feedback
   * @param {object} data
   * @param {number} data.rating - 1-5 star rating
   * @param {string} data.comment - Free text comment
   * @param {string} data.stage - 'questionnaire' | 'results' | 'share' | 'general'
   * @param {string} [data.contact] - Optional WeChat or nickname
   * @param {string} [data.mbti] - User's MBTI if available
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async submit(data) {
    if (!data.rating || data.rating < 1 || data.rating > 5) {
      return { success: false, message: 'Please select a rating' };
    }

    const entry = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      rating: data.rating,
      comment: (data.comment || '').trim().slice(0, 500), // 500 char limit
      stage: data.stage || 'general',
      contact: (data.contact || '').trim().slice(0, 100),
      mbti: data.mbti || null,
      timestamp: Date.now(),
      version: 'Pre-Alpha',
    };

    try {
      // Always save locally first
      this._saveLocal(entry);

      // Try cloud sync if enabled
      if (this.config.useCloudFunction) {
        await this._syncToCloud(entry);
      }

      return { success: true, message: 'Thank you for your feedback.' };
    } catch (e) {
      // Local save already done — return success anyway
      return { success: true, message: 'Feedback saved locally.' };
    }
  }

  // ─── Local Storage ─────────────────────────────────────────────

  _loadSubmitted() {
    try {
      const stored = wx.getStorageSync(FEEDBACK_KEY);
      this.submitted = stored?.submitted || false;
      this.entries = stored?.entries || [];
    } catch (e) {
      this.submitted = false;
      this.entries = [];
    }
  }

  _saveLocal(entry) {
    this.entries.push(entry);
    // Keep last 20 entries
    if (this.entries.length > 20) {
      this.entries = this.entries.slice(-20);
    }
    this.submitted = true;
    try {
      wx.setStorageSync(FEEDBACK_KEY, {
        submitted: this.submitted,
        entries: this.entries,
      });
    } catch (e) {
      // Storage full — keep in memory only
    }
  }

  // ─── Cloud Sync ─────────────────────────────────────────────────

  async _syncToCloud(entry) {
    try {
      const result = await wx.cloud.callFunction({
        name: this.config.cloudFunctionName,
        data: {
          action: 'submit_feedback',
          payload: entry,
        },
      });

      if (result?.errMsg?.includes('ok')) {
        entry.synced = true;
      }
    } catch (e) {
      // Cloud unavailable — will retry on next submit or flush
      entry.synced = false;
    }
  }

  // ─── Query ─────────────────────────────────────────────────────

  hasSubmitted() {
    return this.submitted;
  }

  getEntries() {
    return this.entries;
  }

  /**
   * Get feedback summary stats
   */
  getStats() {
    if (this.entries.length === 0) {
      return { count: 0, avgRating: null, byStage: {} };
    }

    const ratings = this.entries.map(e => e.rating).filter(Boolean);
    const avgRating = ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : null;

    const byStage = {};
    this.entries.forEach(e => {
      byStage[e.stage] = (byStage[e.stage] || 0) + 1;
    });

    return {
      count: this.entries.length,
      avgRating,
      byStage,
      lastSubmitted: this.entries[this.entries.length - 1]?.timestamp || null,
    };
  }
}

module.exports = FeedbackService;
