# MIRASUIT — WeChat Mini Program

> AI-powered personalized menswear style analysis based on MBTI personality testing.

**Live H5 Landing:** https://weidian0039.github.io/mirasuit-h5/

---

## Pre-Deploy Checklist

Before deploying, verify you have:

| Item | Where to get |
|------|-------------|
| WeChat App ID | [WeChat DevTools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/settings/keys) |
| `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `REPLICATE_API_TOKEN` | [Replicate Account](https://replicate.com/account/api-tokens) |

---

## Deploy Steps

### Step 1: Configure App ID

Edit `project.config.json`:
```json
"appid": "wxYOUR_REAL_APP_ID"
```

### Step 2: Deploy Cloud Functions (via WeChat DevTools)

For each function in `cloud-functions/`:
1. Open WeChat Developer Tools → Open this project
2. Right-click `cloud-functions/<name>` → **Upload and Deploy** → **Upload and Deploy (with cloud dependencies)**
3. Wait for deployment to complete

Functions to deploy:
- `mirasuit-claude-api` — MBTI style analysis (requires `ANTHROPIC_API_KEY`)
- `mirasuit-image-api` — DALL-E outfit image generation (requires `OPENAI_API_KEY`)
- `mirasuit-video-api` — AI style video generation (requires `REPLICATE_API_TOKEN`)

### Step 3: Configure Environment Variables

1. Open [WeChat Cloud Console](https://cloud.weixin.qq.com/)
2. Select your environment
3. Go to **Settings → Environment Variables**
4. Add these variables to **each** cloud function:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
REPLICATE_API_TOKEN=r8_...
```

### Step 4: Upload Experience Version

WeChat DevTools → Details → **Upload** → Share QR code with alpha users

---

## Cloud Function Health Check

After deployment, test each function via WeChat DevTools console:

### mirasuit-claude-api
```javascript
wx.cloud.callFunction({ name: 'mirasuit-claude-api', data: { action: 'health' } })
// Expected: { status: 'ok', model: 'claude-3-5-haiku-20241022' }
```

### mirasuit-image-api
```javascript
wx.cloud.callFunction({ name: 'mirasuit-image-api', data: { action: 'health' } })
// Expected: { status: 'ok', model: 'dall-e-3' }
```

### mirasuit-video-api
```javascript
wx.cloud.callFunction({ name: 'mirasuit-video-api', data: { action: 'health' } })
// Expected: { status: 'ok', model: 'minimax-video-01' }
```

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| `errMsg: "cloud.callFunction:fail"` | Check cloud function deployed + env vars set in Cloud Console |
| `ANTHROPIC_API_KEY` not found | Set in WeChat Cloud Console (not `.env` file) |
| QR code not showing on H5 | Set `?appid=YOUR_WECHAT_APP_ID` on H5 URL |
| Canvas rendering broken | Check `wx.createCanvasContext` context in results.js |
| Share card blank | Verify canvas dimensions match device pixel ratio |

---

## Project Structure

```
mirasuit-miniprogram/
├── app.js / app.json / app.wxss    # App entry & global config
├── project.config.json             # WeChat DevTools config (set appid here)
├── pages/
│   ├── home/                       # Welcome page + CTA
│   ├── questionnaire/              # 8-question MBTI style test
│   ├── results/                    # Style report + AI image + canvas card
│   └── share/                      # 3-template share card (Classic/Minimal/Bold)
├── services/
│   ├── SecureAPIService.js         # Cloud function calls + local fallback
│   ├── QuestionnaireManager.js     # Test state management
│   └── UserProfileManager.js       # Profile persistence (localStorage)
└── cloud-functions/
    ├── mirasuit-claude-api/        # Anthropic Claude — style analysis
    ├── mirasuit-image-api/         # OpenAI DALL-E — outfit image
    └── mirasuit-video-api/         # Replicate MiniMax — style video
```

---

## Features

- **8-question MBTI-based style test** — personality + lifestyle + fashion preferences
- **16 personality style profiles** — INTJ→智性优雅型, ENTJ→权力质感型, etc.
- **Canvas-generated style cards** — no external image API needed for sharing
- **3-template share cards** — Classic (`#1a1a1a`) / Minimal (`#ffffff`) / Bold (`#000→#FF6B35`)
- **WeChat share integration** — `onShareAppMessage` + `onShareTimeline`
- **Local storage only** — no account required, data stays on device
- **5-minute API response cache** — reduces redundant API calls
- **Dual API fallback** — local style analysis if cloud functions unavailable

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | WeChat Mini Program (原生开发) |
| Backend | WeChat Cloud Functions (云开发) |
| Style Analysis | Anthropic Claude 3.5 Haiku |
| Image Generation | OpenAI DALL-E 3 |
| Video Generation | Replicate MiniMax |
| Code Hosting | GitHub (weidian0039/mirasuit-miniprogram) |
| H5 Landing | GitHub Pages (weidian0039.github.io/mirasuit-h5/) |

---

## Branding

- **Brand color:** `#1a1a1a` (deep black)
- **Accent color:** `#FF6B35` (burnt orange — Bold template)
- **Typography:** System fonts (`-apple-system`, `BlinkMacSystemFont`)
- **Design language:** Minimal luxury menswear aesthetic

---

## License

Private — MIRASUIT
