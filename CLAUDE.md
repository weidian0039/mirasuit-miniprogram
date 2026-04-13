# MIRASUIT MIRA App — Pre-Alpha Setup

## Required: API Keys

Before deploying, set these keys in WeChat Cloud Console (cloud.weixin.qq.com):

| Key | Cloud Function | Provider |
|-----|---------------|----------|
| `ANTHROPIC_API_KEY` | `mirasuit-claude-api` | console.anthropic.com |
| `OPENAI_API_KEY` | `mirasuit-image-api` | platform.openai.com |
| `REPLICATE_API_KEY` | `mirasuit-image-api` + `mirasuit-video-api` | replicate.com |
| `WECHAT_APP_ID` | — (WeChat DevTools project config) | developers.weixin.qq.com |

## Setup Steps (Pre-Alpha: Done ✅ — awaiting keys)

> **Step-by-step deploy checklist**: See `M-11-PRE-ALPHA-DEPLOY.md` — contains exact WeChat Cloud Console screenshots, API key formats, and troubleshooting guide.

### ✅ Done (Tech Lead)
- [x] Cloud function `mirasuit-claude-api` — personality analysis (Anthropic Claude)
  - **FIX 2026-04-10 v2**: `cloud.cloudAPI()` → `axios.post()` (不存在的方法 → Node.js 标准 HTTP 客户端)
  - `wx-server-runtime` 不存在，已撤销；改用 `axios ~1.6.0`（已本地验证 1.15.0 ✅）
- [x] Cloud function `mirasuit-image-api` — image generation (DALL-E 3 + FLUX)
  - **FIX 2026-04-10 v2**: `cloud.cloudContainer.callContainer()` → `axios.post()` (不存在的方法 → 直接调用 OpenAI/Replicate API)
  - `wx-server-runtime` 不存在，已撤销；改用 `axios ~1.6.0`
- [x] Cloud function `mirasuit-video-api` — video generation (CogVideoX/I2VGen-XL)
  - **FIX 2026-04-10 v2**: `cloud.cloudContainer.callContainer()` → `axios.post()` / `axios.get()` (同上)
  - `wx-server-runtime` 不存在，已撤销；改用 `axios ~1.6.0`
- [x] `results.js` useCloudFunction: true (all 3 services)
- [x] `imageGenerator.js` cloud function routing
- [x] `videoGenerator.js` cloud function routing
- [x] `project.config.json` — created with `cloudfunctionRoot: "./cloud-functions/"` (user fills in `appid` before opening in WeChat DevTools)
- [x] `h5/index.html` — external traffic entry page (deploy to Netlify/Vercel/GitHub Pages, replace `YOUR_WECHAT_APP_ID` on line 333)
- [x] All 20 JS files pass `node --check` ✅
- [x] `axios 1.15.0` installed and verified ✅
- [x] FLUX input params fixed — `guidance`→`guidance_scale`, `num_images` removed, `aspect_ratio:'1:1'` added, `seed` added, `steps:4` (schnell model)
- [x] Video model versions fixed — fake version hashes → model string shorthand (`THUDM/CogVideoX-5b`, `bytedance/i2vgen-xl`), auto-resolves to latest

### ⏳ Blocked on User: API Keys

### 1. Configure Environment Variables

In [WeChat Cloud Console](https://cloud.weixin.qq.com/):
- 云函数 → 环境变量 → 添加：

```
ANTHROPIC_API_KEY=sk-ant-...       (mirasuit-claude-api)
OPENAI_API_KEY=sk-proj-...         (mirasuit-image-api)
REPLICATE_API_KEY=r8_...            (mirasuit-image-api + mirasuit-video-api)
```

### 2. Deploy Cloud Functions

In WeChat DevTools, right-click each cloud function directory → "上传并部署：云端安装依赖":
```
cloud-functions/mirasuit-claude-api/
cloud-functions/mirasuit-image-api/
cloud-functions/mirasuit-video-api/
```

### 3. WeChat Mini Program Deployment

1. Open project in WeChat DevTools
2. Project Config → AppID → fill `WECHAT_APP_ID`
3. Upload as experience version
4. Share test link with 5-10 alpha users

### 4. Monitor

Track these metrics after launch:
- Questionnaire completion rate (target: >60%)
- API call success rate (target: >95%)
- Page load time (target: <2s)

## Local Development

```bash
npm install
cp .env.example .env  # fill in keys
npx playwright test   # run E2E tests
```

## Architecture

- WeChat Mini Program frontend (5 pages: home, questionnaire, profile, results, share)
- 3 cloud functions for API key protection
- Anthropic Claude for personality analysis
- DALL-E 3 / FLUX for image generation
- CogVideoX / I2VGen-XL for video generation
- Local storage for user profiles (privacy-first)
- Share page: `pages/share/share` — canvas-generated share cards (3 templates), WeChat deep link, timeline/app message sharing
- H5 landing page: `h5/index.html` — brand-aligned landing for external deep link traffic, WeChat detection, QR placeholder, responsive
