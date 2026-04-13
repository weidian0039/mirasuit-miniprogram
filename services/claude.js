/**
 * Claude API Service for MIRASUIT
 * Handles personality analysis, MBTI inference, and style recommendations
 *
 * Brand alignment: Uses CSO-approved templates from prompts/claude-templates-v2.js
 * Tone: Sophisticated, Understated, Premium — MIRASUIT consultant voice
 */

const templates = require('../prompts/claude-templates-v2');

class ClaudeService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.anthropic.com/v1/messages';
    this.headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };
  }

  /**
   * Analyze user personality from questionnaire responses
   * @param {Object} responses - User's questionnaire responses
   * @returns {Promise<Object>} Personality analysis results
   */
  async analyzePersonality(responses) {
    const prompt = this._buildPersonalityPrompt(responses);

    try {
      const response = await wx.request({
        url: this.baseUrl,
        method: 'POST',
        header: this.headers,
        data: {
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: prompt
          }]
        },
        timeout: 30000
      });

      return this._parsePersonalityResponse(response.data);
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error("We're having trouble analyzing your style profile. Please try again.");
    }
  }

  /**
   * Extract style preferences based on personality type
   * @param {Object} personality - User's personality analysis
   * @returns {Promise<Object>} Style recommendations
   */
  async getStyleRecommendations(personality) {
    const prompt = this._buildStylePrompt(personality);

    try {
      const response = await wx.request({
        url: this.baseUrl,
        method: 'POST',
        header: this.headers,
        data: {
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: prompt
          }]
        },
        timeout: 30000
      });

      return this._parseStyleResponse(response.data);
    } catch (error) {
      console.error('Style recommendation error:', error);
      throw new Error("Style recommendations are temporarily unavailable. Please try again.");
    }
  }

  /**
   * Generate personalized style advice
   * @param {Object} userProfile - User's profile data
   * @param {string} occasion - Special occasion (optional)
   * @returns {Promise<Object>} Personalized advice
   */
  async getPersonalizedAdvice(userProfile, occasion = null) {
    const prompt = this._buildAdvicePrompt(userProfile, occasion);

    try {
      const response = await wx.request({
        url: this.baseUrl,
        method: 'POST',
        header: this.headers,
        data: {
          model: 'claude-sonnet-4-6',
          max_tokens: 1536,
          messages: [{
            role: 'user',
            content: prompt
          }]
        },
        timeout: 30000
      });

      return this._parseAdviceResponse(response.data);
    } catch (error) {
      console.error('Personalized advice error:', error);
      throw new Error("We're unable to generate advice at this moment. Please try again.");
    }
  }

  /**
   * Build personality analysis prompt
   * @private
   * @desc Uses CSO-approved brand template for MIRASUIT consultant voice
   */
  _buildPersonalityPrompt(responses) {
    return templates.buildPersonalityPrompt(responses);
  }

  /**
   * Build style recommendation prompt
   * @private
   * @desc Uses CSO-approved brand template for MIRASUIT consultant voice
   */
  _buildStylePrompt(personality) {
    return templates.buildStylePrompt(personality);
  }

  /**
   * Build personalized advice prompt
   * @private
   * @desc Uses CSO-approved brand template for MIRASUIT consultant voice
   */
  _buildAdvicePrompt(userProfile, occasion) {
    return templates.buildAdvicePrompt(userProfile, occasion);
  }

  /**
   * Parse personality response
   * @private
   */
  _parsePersonalityResponse(data) {
    try {
      const content = data.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Parse error:', error);
      return this._getFallbackPersonality();
    }
  }

  /**
   * Parse style response
   * @private
   */
  _parseStyleResponse(data) {
    try {
      const content = data.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Parse error:', error);
      return this._getFallbackStyle();
    }
  }

  /**
   * Parse advice response
   * @private
   */
  _parseAdviceResponse(data) {
    try {
      const content = data.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Parse error:', error);
      return this._getFallbackAdvice();
    }
  }

  /**
   * Fallback responses for API failures
   * @private
   */
  _getFallbackPersonality() {
    return {
      mbti: { type: 'Unknown', confidence: 0 },
      enneagram: { type: 0, confidence: 0 },
      traits: ['to-be-analyzed'],
      styleIndicators: { preference: 'classic' }
    };
  }

  _getFallbackStyle() {
    return {
      recommendedStyles: ['classic'],
      colorSuggestions: ['navy', 'charcoal'],
      fabricPreferences: ['wool'],
      fitRecommendation: 'regular',
      styleAdvice: 'Classic elegance never fails.'
    };
  }

  _getFallbackAdvice() {
    return {
      occasion: 'General wardrobe building',
      outfitRecommendation: {
        primary: 'Classic navy suit, white shirt',
        alternatives: ['Charcoal grey option', 'Blazer and trouser combination'],
        avoid: 'Synthetic blends, trend-driven textures'
      },
      fitNotes: 'Tailored fit, natural shoulders',
      fabricAdvice: 'Super 120s wool, seasonal weight',
      accessoryGuidance: 'Minimal, purposeful — leather belt, dress watch',
      confidenceBoosters: 'Fit above all else',
      versatilityTip: 'Works across business and smart casual contexts'
    };
  }
}

module.exports = ClaudeService;
