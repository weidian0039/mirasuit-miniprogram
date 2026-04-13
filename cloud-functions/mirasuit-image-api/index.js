// cloud-functions/mirasuit-image-api/index.js
// M-11 Sprint 3 — Style image generation via OpenAI DALL-E
const axios = require('axios');

exports.main = async (event, context) => {
  const { action, mbti, styleName } = event;
  const apiKey = process.env.OPENAI_API_KEY;

  // Health check — always available, no apiKey required
  if (action === 'health') {
    return {
      status: 'ok',
      service: 'mirasuit-image-api',
      model: 'dall-e-3',
      apiKeyConfigured: !!apiKey,
    };
  }

  if (!apiKey) {
    return { success: false, error: 'OPENAI_API_KEY not configured' };
  }

  if (action === 'generateStyleImage') {
    try {
      const prompt = `Fashion editorial photograph of a well-dressed man wearing ${styleName} style menswear, ${mbti} personality aesthetic, studio lighting, minimal background, high-end menswear magazine quality, 4K`;

      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          response_format: 'url',
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
          },
          timeout: 60000,
        }
      );

      return {
        success: true,
        data: {
          imageUrl: response.data.data[0].url,
          prompt,
        },
      };
    } catch (err) {
      console.error('Image API error:', err.message);
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: 'Unknown action' };
};
