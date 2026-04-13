# MIRASUIT — Deploy Guide

**Estimated time: 20 minutes** | **No coding required — this is all GUI steps**

---

## Before You Start

You need 4 things. If you don't have them yet, get them first.

| What you need | Where to get it | Time |
|--------------|----------------|------|
| WeChat App ID | [WeChat Developer Console](https://mp.weixin.qq.com/) → Settings → Account Info | 5 min (register if needed) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) | 2 min |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | 2 min |
| `REPLICATE_API_TOKEN` | [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) | 2 min |

---

## Step 1: Update App ID (30 seconds)

Open `project.config.json` in this repo and replace `YOUR_WECHAT_APP_ID`:

```json
{
  "appid": "wx1234567890abcdef"   ← replace with your real App ID
}
```

> **Where to find your App ID:** WeChat Developer Console → Settings → Account Info → App ID

---

## Step 2: Deploy Cloud Functions (10 minutes)

1. Download and install [WeChat Developer Tools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. Log in with your WeChat account
3. Click **Import Project** → select this `mirasuit-miniprogram` folder
4. Set App ID to match what you entered in Step 1
5. Click **Confirm**

For each cloud function, right-click the folder and deploy:

```
cloud-functions/
├── mirasuit-claude-api/    → Right-click → Upload and Deploy → Upload and Deploy (with cloud dependencies)
├── mirasuit-image-api/     → Same process
└── mirasuit-video-api/     → Same process
```

Wait ~1 minute per function for deployment to complete.

---

## Step 3: Configure API Keys (5 minutes)

1. Open [WeChat Cloud Console](https://cloud.weixin.qq.com/)
2. Select your environment (usually the default one)
3. Go to **Functions** → click each function → **Settings** → **Environment Variables**
4. Add these to **each** function:

```
ANTHROPIC_API_KEY=sk-ant-...(your Anthropic key)
OPENAI_API_KEY=sk-proj-...(your OpenAI key)
REPLICATE_API_TOKEN=r8_...(your Replicate token)
```

> **Important:** These go in each function's environment variables, NOT in a `.env` file.

---

## Step 4: Upload Experience Version (2 minutes)

In WeChat Developer Tools:
1. Click **Details** (top right)
2. Click **Upload**
3. Add a version note (e.g., "v1.0 Alpha")
4. Click **Submit**

WeChat will review within 1-7 days. You get a notification when it's live.

---

## Step 5: Share with Alpha Users

Once approved, share your miniprogram QR code:

**Your H5 landing page** (for sharing on social media):
```
https://weidian0039.github.io/mirasuit-h5/?appid=YOUR_APP_ID
```

Replace `YOUR_APP_ID` with your actual App ID. This page shows a QR code that opens the miniprogram directly.

---

## Verification Checklist

Run this after each step to confirm it worked:

### After Step 2 (Cloud Functions)
In WeChat DevTools console, run:
```javascript
wx.cloud.callFunction({ name: 'mirasuit-claude-api', data: { action: 'health' } })
// Expected: { status: 'ok', apiKeyConfigured: true }
```

### After Step 3 (API Keys)
Same health check should show `apiKeyConfigured: true` for all 3 functions.

### After Step 4 (Upload)
- Check [WeChat Developer Console](https://mp.weixin.qq.com/) → Version Management
- Your uploaded version should appear within seconds

### After Step 5 (QR Code)
Open the H5 URL with your App ID and verify the QR code renders.

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| "appid not found" | Double-check Step 1 — App ID must match exactly |
| Cloud function deploy fails | Make sure you're logged into WeChat DevTools |
| API keys not working | They're set per-function in Cloud Console, not in a file |
| QR code shows blank | Make sure the App ID is correct in the URL parameter |
| Upload button greyed out | Make sure App ID is set in project.config.json |

---

## What's Already Done

Everything below was pre-configured and pushed to GitHub. You don't need to touch this:

- 52 source files (pages, services, cloud functions) ✅
- 11 JavaScript files, all syntax-verified ✅
- 4 tabBar icons (81x81 PNG) ✅
- `app.wxml` root template ✅
- `app.json` tabBar configuration ✅
- 3 cloud functions with health check endpoints ✅
- README with full project docs ✅
- `sitemap.xml` for SEO ✅
- GitHub Pages H5 landing (auto-deploys on push) ✅

---

## Questions?

Check the [README.md](README.md) for project structure and tech details.
