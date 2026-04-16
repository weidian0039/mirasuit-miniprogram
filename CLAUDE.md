# MIRASUIT MIRA App — Tech Lead Reference

## Project Root (Development)

> **IMPORTANT**: Development happens in `~/mirasuit-miniprogram/` (git-synced with GitHub).
> The paperclip workspace path (`.../projects/.../mirasuit-miniprogram/`) contains test files not on GitHub.
> Always use `~/mirasuit-miniprogram/` for git operations and development.

```
~/mirasuit-miniprogram/           ← GitHub: weidian0039/mirasuit-miniprogram
├── cloud-functions/
│   ├── mirasuit-claude-api/      ← Anthropic Claude personality analysis
│   ├── mirasuit-image-api/       ← DALL-E 3 + FLUX image generation
│   └── mirasuit-video-api/       ← CogVideoX + I2VGen-XL video generation
├── pages/                        ← 5 WeChat pages
├── services/                     ← 9 services
├── utils/                        ← questionnaire + userProfile managers
├── prompts/                      ← CSO-approved brand-aligned prompts
├── h5/                           ← landing page
├── verify.sh                      ← Cloud function health check (M-16 ready)
├── deploy.sh                      ← AppID config + deploy checklist
├── preflight-check.sh             ← Pre-deploy environment check
└── project.config.json            ← CEO fills in appid
```

## GitHub Push Log

| Date | Commit | Summary |
|------|--------|---------|
| 2026-04-14 | `ea89adc` | docs: update M-12 deploy status |
| 2026-04-14 | `bc384a8` | fix: add missing utils + prompts (530 lines) |
| 2026-04-14 | `83916b6` | feat: add verify.sh cloud function health check |
| 2026-04-14 | `fd3dff9` | fix: remove unnecessary npm install from CI |
| 2026-04-14 | `02fa455` | feat: add CI, deploy.sh, fix REPLICATE variable naming |
| 2026-04-13 | `ac6c619` | feat: add Cloudflare Web Analytics snippet to H5 |
| 2026-04-13 | `25b541d` | feat: Sprint 4 complete — M-11 through M-15 merged |

## Deploy Scripts (Available)

```bash
# 1. Pre-flight check (run first)
./preflight-check.sh

# 2. Deploy prep (fills AppID + generates env var checklist)
./deploy.sh wx1234567890abcdef

# 3. Post-deploy verification (run after cloud functions deployed)
./verify.sh <WECHAT_CLOUD_ENV_ID>
```

## M-12 CEO Deploy Operations (P0 — 4 items)

### Using deploy.sh (automates items 1-2)

```bash
cd ~/mirasuit-miniprogram
./deploy.sh <WECHAT_APP_ID> [ANTHROPIC_KEY] [OPENAI_KEY] [REPLICATE_KEY]
```

| Item | Status | Tool |
|------|--------|------|
| Fill AppID | CEO | `deploy.sh` or WeChat DevTools |
| Configure env vars | CEO | WeChat Cloud Console |
| Deploy cloud functions | CEO | WeChat DevTools right-click → upload |
| Replace short link | CEO | Manual |

### Env vars to configure (WeChat Cloud Console)

```
ANTHROPIC_API_KEY  → mirasuit-claude-api
OPENAI_API_KEY     → mirasuit-image-api
REPLICATE_API_KEY  → mirasuit-image-api + mirasuit-video-api
```

### Verify (after deploy)

```bash
./verify.sh <YOUR_CLOUD_ENV_ID>
```

## Code Verification

- `node --check`: All 21 JS files in `~/mirasuit-miniprogram/` pass
- `bash -n *.sh`: All 3 shell scripts pass
- `git log --oneline`: 12 commits on main, all pushed

## Sprint 5 Triggers

| Issue | Title | Trigger |
|-------|-------|---------|
| M-16 | Post-Deploy Verification | `verify.sh` returns all ✅ |
| M-17 | Alpha Feedback Analysis | 5-10 alpha users tested |
| M-18 | Bug Fixes | M-17 findings |
| M-19 | Beta Launch Prep | M-18 fixes |

## Brand Voice

Sophisticated, Understated, Premium. No hyperbole — no "best", "perfect", "ultimate".
