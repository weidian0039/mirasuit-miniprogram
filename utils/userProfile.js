/**
 * MIRASUIT User Profile Manager
 * Persists personality analysis, style preferences, and interaction history.
 *
 * Brand: Sophisticated, Understated, Premium — MIRASUIT consultant voice.
 * Privacy-first: all data stored locally via wxStorage.
 */

const STORAGE_KEY = 'mirasuit_profile';

const DEFAULT_PROFILE = {
  personality: null,
  stylePreferences: null,
  styleHistory: [],
  styleImage: null,
  createdAt: null,
  updatedAt: null
};

class UserProfileManager {
  constructor() {
    this._profile = Object.assign({}, DEFAULT_PROFILE);
    this._dirty = false;
  }

  /**
   * Get the full user profile.
   * @returns {object}
   */
  getProfile() {
    return Object.assign({}, this._profile);
  }

  /**
   * Save personality analysis result (MBTI + Enneagram).
   * @param {object} data — { mbti: { type, description, dimensions }, enneagram: { type, description, coreMotivation } }
   */
  savePersonalityAnalysis(data) {
    this._profile.personality = data;
    this._markUpdated();
  }

  /**
   * Save style preferences result.
   * @param {object} data — { recommendedStyles, colorPalette, stylingTips }
   */
  saveStylePreferences(data) {
    this._profile.stylePreferences = data;
    this._markUpdated();
  }

  /**
   * Add an entry to the style history log.
   * @param {object} item — { type: string, occasion?: string, timestamp?: number }
   */
  addToStyleHistory(item) {
    const entry = Object.assign({
      timestamp: Date.now()
    }, item);
    this._profile.styleHistory = this._profile.styleHistory || [];
    // Keep last 20 entries
    this._profile.styleHistory = [
      entry,
      ...this._profile.styleHistory
    ].slice(0, 20);
    this._markUpdated();
  }

  /**
   * Save style image result (from imageGenerator).
   * @param {object} imageData — { imageUrl, mbti, prompt, isFallback }
   */
  saveStyleImage(imageData) {
    this._profile.styleImage = imageData;
    this._markUpdated();
  }

  /**
   * Clear all profile data.
   */
  clear() {
    this._profile = Object.assign({}, DEFAULT_PROFILE, {
      createdAt: null,
      updatedAt: null
    });
    this._dirty = false;
    try {
      wx.removeStorageSync(STORAGE_KEY);
    } catch (e) {
      console.warn('[UPM] Failed to clear storage:', e);
    }
  }

  /**
   * Load profile from local storage.
   */
  loadFromStorage() {
    try {
      const stored = wx.getStorageSync(STORAGE_KEY);
      if (stored && typeof stored === 'object') {
        this._profile = Object.assign({}, DEFAULT_PROFILE, stored);
      }
    } catch (e) {
      console.warn('[UPM] Failed to load from storage:', e);
    }
  }

  /**
   * Persist profile to local storage.
   */
  saveToStorage() {
    try {
      wx.setStorageSync(STORAGE_KEY, Object.assign({}, this._profile));
      this._dirty = false;
    } catch (e) {
      console.warn('[UPM] Failed to save to storage:', e);
    }
  }

  /**
   * Mark profile as updated and schedule storage write.
   * @private
   */
  _markUpdated() {
    this._profile.updatedAt = Date.now();
    if (!this._profile.createdAt) {
      this._profile.createdAt = Date.now();
    }
    this._dirty = true;
    // Auto-save on change
    this.saveToStorage();
  }
}

module.exports = UserProfileManager;
