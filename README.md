# MIRASUIT — WeChat Mini Program

> AI-powered personalized menswear style analysis based on MBTI personality testing.

## Quick Start

### 1. Configure App ID

Edit `project.config.json` and replace `YOUR_WECHAT_APP_ID`:

```json
{
  "appid": "wxYOUR_REAL_APP_ID"
}
```

### 2. Deploy Cloud Functions

```bash
cd cloud-functions/mirasuit-claude-api
# Deploy via WeChat DevTools: right-click → Upload and Deploy

cd cloud-functions/mirasuit-image-api
# Same process

cd cloud-functions/mirasuit-video-api
# Same process
```

### 3. Configure Environment Variables

In WeChat DevTools, set these for each cloud function:
- `ANTHROPIC_API_KEY` — [Get from Anthropic](https://console.anthropic.com/settings/keys)
- `OPENAI_API_KEY` — [Get from OpenAI](https://platform.openai.com/api-keys)
- `REPLICATE_API_TOKEN` — [Get from Replicate](https://replicate.com/account/api-tokens)

### 4. Open in WeChat DevTools

1. Open WeChat Developer Tools
2. Import this project
3. Set App ID in project settings
4. Compile and preview

## Project Structure

```
├── app.js / app.json / app.wxss    # App entry & global config
├── pages/
│   ├── home/                        # Welcome page
│   ├── questionnaire/                # 8-question MBTI style test
│   ├── results/                     # Style report + AI image
│   └── share/                       # 3-template share card generator
├── services/
│   ├── SecureAPIService.js          # API calls via cloud functions
│   ├── QuestionnaireManager.js      # Test state management
│   └── UserProfileManager.js       # Profile persistence
├── cloud-functions/
│   ├── mirasuit-claude-api/        # Anthropic Claude style analysis
│   ├── mirasuit-image-api/         # OpenAI DALL-E image gen
│   └── mirasuit-video-api/          # Replicate video generation
└── assets/                          # Icons and images
```

## Features

- **8-question MBTI-based style test** — personality + lifestyle + fashion preferences
- **16 personality style profiles** — ISTJ/ISFJ/.../ENTJ with unique recommendations
- **Canvas-generated style cards** — no external image API needed
- **3-template share cards** — Classic / Minimal / Bold
- **WeChat share integration** — onShareAppMessage + onShareTimeline
- **Local storage only** — no account required, data stays on device

## Tech Stack

- WeChat Mini Program (原生开发)
- WeChat Cloud Functions (云开发)
- Anthropic Claude API (风格分析)
- OpenAI DALL-E (穿搭图片生成)
- Replicate (AI视频生成，待激活)

## Branding

Brand color: `#1a1a1a` (black)
Typography: System fonts (-apple-system, BlinkMacSystemFont)
Design language: Minimal, luxury menswear aesthetic

## License

Private — MIRASUIT
