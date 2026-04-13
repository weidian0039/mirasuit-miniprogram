// services/UserProfileManager.js
// M-7 Sprint 3 — User profile storage and retrieval

class UserProfileManager {
  constructor() {
    this.profile = null;
    this.load();
  }

  save(profile) {
    this.profile = profile;
    wx.setStorageSync('user_profile', profile);
  }

  load() {
    this.profile = wx.getStorageSync('user_profile') || null;
    return this.profile;
  }

  update(updates) {
    this.profile = { ...this.profile, ...updates };
    wx.setStorageSync('user_profile', this.profile);
  }

  get() {
    return this.profile;
  }

  hasProfile() {
    return !!this.profile && !!this.profile.mbti;
  }

  clear() {
    this.profile = null;
    wx.removeStorageSync('user_profile');
    wx.removeStorageSync('style_result');
    wx.removeStorageSync('q_answers');
  }
}

module.exports = new UserProfileManager();
