// services/SecureAPIService.js
// API calls routed through cloud functions (keys stay server-side)
// M-7 Sprint 3 — Secure API architecture

class SecureAPIService {
  constructor() {
    this.baseUrl = 'https://us-central1-mirasuit.cloudfunctions.net';
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  // Style analysis via Claude API
  async analyzeStyle(profile, answers) {
    const cacheKey = `style_${profile.mbti}_${answers.length}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const res = await wx.cloud.callFunction({
        name: 'mirasuit-claude-api',
        data: {
          action: 'analyzeStyle',
          profile,
          answers,
        },
        timeout: 30000,
      });

      if (res.result && res.result.success) {
        this._setCache(cacheKey, res.result.data);
        return res.result.data;
      }
      throw new Error(res.result?.error || 'API call failed');
    } catch (err) {
      console.error('[SecureAPI] analyzeStyle error:', err);
      // Fallback to local analysis
      return this._localStyleAnalysis(profile);
    }
  }

  // Image generation via Replicate
  async generateStyleImage(mbti, styleName) {
    const cacheKey = `img_${mbti}_${styleName}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const res = await wx.cloud.callFunction({
        name: 'mirasuit-image-api',
        data: {
          action: 'generateStyleImage',
          mbti,
          styleName,
        },
        timeout: 60000,
      });

      if (res.result && res.result.success) {
        this._setCache(cacheKey, res.result.data);
        return res.result.data;
      }
      throw new Error(res.result?.error || 'Image generation failed');
    } catch (err) {
      console.error('[SecureAPI] generateStyleImage error:', err);
      return null;
    }
  }

  // Video generation via Replicate
  async generateStyleVideo(mbti, styleName) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'mirasuit-video-api',
        data: {
          action: 'generateStyleVideo',
          mbti,
          styleName,
        },
        timeout: 120000,
      });
      return res.result?.success ? res.result.data : null;
    } catch (err) {
      console.error('[SecureAPI] generateStyleVideo error:', err);
      return null;
    }
  }

  _getCached(key) {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.ts < this.cacheTTL) {
      return entry.data;
    }
    return null;
  }

  _setCache(key, data) {
    this.cache.set(key, { data, ts: Date.now() });
  }

  _localStyleAnalysis(profile) {
    // Client-side fallback — no API needed
    return {
      recommendations: [
        { icon: '👔', title: '核心单品', desc: '投资高品质基本款' },
        { icon: '🎯', title: '风格边界', desc: '保持明确风格主线' },
        { icon: '✨', title: '质感升级', desc: '减少数量，提升质量' },
      ],
    };
  }
}

module.exports = new SecureAPIService();
