# M-12 Alpha Launch — Deploy Status

**Last Updated**: 2026-04-14
**Tech Lead**: 9015e695-4269-47df-a58a-b1342cbca7c2
**Commit**: bc384a8 (fix: add missing utils and prompts files)

---

## Verification Complete

- `node --check`: **17/17 JS files PASS** (2026-04-14 fix)
- Fixed: `utils/questionnaire.js`, `utils/userProfile.js`, `prompts/claude-templates-v2.js`
  - These were imported by pages but never committed — caused runtime crashes
- H5 landing page: live at `weidian0039.github.io/mirasuit-h5/` (separate repo)
- Cloud function env vars: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `REPLICATE_API_TOKEN`
- All 15 Paperclip issues: `done`

---

## CEO Manual Operations — Required Before Submitting for Review

### P0 — Must Do (blocks submission)

#### 1. `project.config.json` — Fill in WeChat AppID
```json
"appid": "wx...",  // ← Replace YOUR_WECHAT_APP_ID with your real AppID
```
Find your AppID in [WeChat DevTools](https://developers.weixin.qq.com/miniprogram/en/dev/) → Settings → ID

#### 2. Deploy 3 Cloud Functions via WeChat DevTools

Open the miniprogram project in WeChat DevTools, then for each:

| Function | Action |
|----------|--------|
| `cloud-functions/mirasuit-claude-api/` | Right-click → Upload and Deploy |
| `cloud-functions/mirasuit-image-api/` | Right-click → Upload and Deploy |
| `cloud-functions/mirasuit-video-api/` | Right-click → Upload and Deploy |

#### 3. Configure Cloud Function Environment Variables

In [WeChat Cloud Console](https://cloud.weixin.qq.com/):
1. Navigate to Cloud Functions → Each function → Settings → Environment Variables
2. Add these for each function:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...
   REPLICATE_API_TOKEN=r8_...
   ```

#### 4. Verify `useCloudFunction: true` in Code (already done)

Results page already uses cloud functions. No code changes needed.

---

### P2 — After P0 (optional polish)

#### `h5/index.html` — Replace stub short link

Line ~343: Replace `wechatSearchUrl: 'https://wxaurl.com/'` with your WeChat URL scheme or short link.

---

## H5 Landing Page

Already live: **https://weidian0039.github.io/mirasuit-h5/**

For WeChat sharing, use URL format:
```
https://weidian0039.github.io/mirasuit-h5/?appid=YOUR_WECHAT_APP_ID&mbti=INTJ
```

---

## File Inventory (this commit)

### New Services (M-13/M-14/M-15)
- `services/analytics.js` — Funnel tracking + API success rate
- `services/feedback.js` — Star rating + comment + stage
- `services/cache.js` — Lazy-loaded cache
- `services/logger.js` — Structured logging
- `services/claude.js` — Direct Claude API
- `services/imageGenerator.js` — Direct DALL-E 3 / FLUX
- `services/videoGenerator.js` — Direct CogVideoX / I2VGen-XL
- `services/secure-api.js` — Cloud function proxy
- `services/secure-api-config.example.js` — Example config

### New Pages
- `pages/profile/` — Profile page with feedback modal (M-13)

### Updated Cloud Functions
- `cloud-functions/mirasuit-claude-api/` — Full env-var pattern
- `cloud-functions/mirasuit-image-api/` — DALL-E 3 + FLUX support
- `cloud-functions/mirasuit-video-api/` — CogVideoX + I2VGen-XL

### New H5
- `h5/index.html` — Landing page with appid URL param injection

---

## Submitting for WeChat Review

After completing P0 steps above:
1. In WeChat DevTools → Upload (top-right)
2. Submit experience version
3. Wait for WeChat review (~1-7 days)
