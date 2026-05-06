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
├── scripts/
│   ├── analyze-feedback.js        ← M-17 feedback analysis (table + JSON output)
│   └── README.md                  ← Scripts documentation
├── data/
│   └── feedback-local.json         ← Sample data for M-17 script testing
└── project.config.json            ← CEO fills in appid
```

## GitHub Push Log

| Date | Commit | Summary |
|------|--------|---------|
| 2026-04-17 | `fb02767` | fix: M-12-DEPLOY-STATUS.md — REPLICATE_API_TOKEN→KEY (critical) |
| 2026-04-17 | `5d0ef9d` | docs: scripts/README.md — tooling + M-17 usage |
| 2026-04-17 | `f10ff4b` | fix: share page — M-15 lazy Analytics (consistent) |
| 2026-04-16 | `6607111` | fix: results page _trackAPI infinite recursion (critical) |
| 2026-04-16 | `ed65cb5` | feat: Sprint 5 plan + M-17 feedback analysis script |
| 2026-04-16 | `6a7477d` | feat: branded OG image PNG (mirasuit-h5) |
| 2026-04-14 | `4fb8c7e` | fix: image CF FLUX polling — getPredictionStatus action |
| 2026-04-14 | `25d64b1` | fix: H5 QR code + OG tags + script structure |

## Deploy Scripts (Available)

```bash
# 1. Pre-flight check (run first)
./preflight-check.sh

# 2. Deploy prep (fills AppID + generates env var checklist)
./deploy.sh wx1234567890abcdef

# 3. Post-deploy verification (run after cloud functions deployed)
./verify.sh <WECHAT_CLOUD_ENV_ID>
```

See `scripts/README.md` for M-17 feedback analysis usage.

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

- `node --check`: All 22 JS files pass (2026-04-20)
- `bash -n *.sh`: All 3 shell scripts pass
- `git log --oneline`: 31 commits on main, all pushed

## Sprint 5 Triggers

| Issue | Title | Status |
|-------|-------|--------|
| M-16 | Post-Deploy Verification | blocked on M-12 CEO deploy |
| M-17 | Alpha Feedback Analysis | blocked on M-16 |
| M-18 | Bug Fixes | done — 6 fixes pre-committed (FLUX polling, _trackAPI recursion, share lazy Analytics, questionnaire funnel, REPLICATE key docs ×2) |
| M-19 | Beta Launch Prep | blocked on M-18 |

## Brand Voice

Sophisticated, Understated, Premium. No hyperbole — no "best", "perfect", "ultimate".
