// cloud-functions/mirasuit-video-api/index.js
// M-11 Sprint 3 — Style video generation via Replicate
//
// NOTE: Replace VERSION below with your Replicate model version.
// Known working models:
//   - MiniMax Video: https://replicate.com/MiniMaxAI/minimax-video-01
//   - CogVideoX:     https://replicate.com/bytedance/cogvideox
const axios = require('axios');

const REPLICATE_VERSION = 'YOUR_REPLICATE_MODEL_VERSION'; // ← Replace this

exports.main = async (event, context) => {
  const { action, mbti, styleName } = event;
  const token = process.env.REPLICATE_API_TOKEN;

  // Health check — always available, no token required
  if (action === 'health') {
    return {
      status: 'ok',
      service: 'mirasuit-video-api',
      model: REPLICATE_VERSION,
      tokenConfigured: !!token,
      note: REPLICATE_VERSION === 'YOUR_REPLICATE_MODEL_VERSION'
        ? 'WARNING: Replace REPLICATE_VERSION constant before use'
        : undefined,
    };
  }

  if (!token) {
    return { success: false, error: 'REPLICATE_API_TOKEN not configured' };
  }

  if (REPLICATE_VERSION === 'YOUR_REPLICATE_MODEL_VERSION') {
    return {
      success: false,
      error: 'REPLICATE_VERSION not set. Edit cloud-functions/mirasuit-video-api/index.js and set REPLICATE_VERSION constant.',
    };
  }

  if (action === 'generateStyleVideo') {
    try {
      const startRes = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          version: REPLICATE_VERSION,
          input: {
            prompt: `${styleName} menswear fashion video, ${mbti} style aesthetic, cinematic lighting, studio setting`,
          },
        },
        {
          headers: {
            Authorization: `Token ${token}`,
            'content-type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const predictionId = startRes.data.id;
      return {
        success: true,
        data: {
          predictionId,
          status: 'processing',
          pollingUrl: `https://api.replicate.com/v1/predictions/${predictionId}`,
        },
      };
    } catch (err) {
      console.error('Video API error:', err.message);
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: 'Unknown action' };
};
