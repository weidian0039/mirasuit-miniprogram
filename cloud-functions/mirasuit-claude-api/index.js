// cloud-functions/mirasuit-claude-api/index.js
// M-11 Sprint 3 — Style analysis via Anthropic Claude
const axios = require('axios');

exports.main = async (event, context) => {
  const { action, profile, answers } = event;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Health check — always available, no apiKey required
  if (action === 'health') {
    return {
      status: 'ok',
      service: 'mirasuit-claude-api',
      model: 'claude-3-5-haiku-20241022',
      apiKeyConfigured: !!apiKey,
    };
  }

  if (!apiKey) {
    return { success: false, error: 'ANTHROPIC_API_KEY not configured' };
  }

  if (action === 'analyzeStyle') {
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `你是MIRASUIT的风格分析师。用户MBTI人格类型为${profile.mbti}。
请基于这个MBTI类型，为他生成一份个性化的穿搭建议，包括：
1. 核心单品类推荐（3-5件）
2. 品牌推荐（轻奢/高街/经典三类）
3. 搭配公式
4. 购入时机建议

请用JSON格式返回，字段：recommendations[], brands{classic,street,premium}[], formulas[], timingTips[]`,
            },
          ],
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const content = response.data.content[0].text;
      let data;
      try {
        data = JSON.parse(content);
      } catch {
        data = { raw: content };
      }

      return { success: true, data };
    } catch (err) {
      console.error('Claude API error:', err.message);
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: 'Unknown action' };
};
