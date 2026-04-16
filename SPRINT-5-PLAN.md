# Sprint 5: Alpha → Beta Iteration

**Trigger**: M-12 CEO deploy completion
**Status**: Blocked until M-12 done
**Owner**: Tech Lead + CEO

---

## Issue Dependency Chain

```
M-12 CEO Deploy  ──→  M-16 Post-Deploy Verification  ──→  M-17 Feedback Analysis  ──→  M-18 Bug Fixes  ──→  M-19 Beta Launch
   (P0)                    (verify.sh)                        (analyze-feedback.js)              (code)                 (prep)
```

---

## M-16: Post-Deploy Verification

**Paperclip Issue**: Sprint 5 backlog
**Owner**: Tech Lead
**Trigger**: CEO completes M-12 deploy

### Pre-Deploy Readiness
- [ ] `./deploy.sh <APPID>` fills `project.config.json`
- [ ] 3 cloud functions deployed: `mirasuit-claude-api`, `mirasuit-image-api`, `mirasuit-video-api`
- [ ] Env vars set: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `REPLICATE_API_KEY`
- [ ] `wechatSearchUrl` stub replaced (P2)

### Verification Steps
```bash
# 1. Run cloud function health checks
./verify.sh <WECHAT_CLOUD_ENV_ID>

# 2. Manual smoke test (WeChat DevTools simulator)
#    Home → Questionnaire → Results → Share
#    Verify all API calls succeed (no error toasts)

# 3. Check Cloudflare Pages deploy
open https://weidian0039.github.io/mirasuit-h5/
# Verify: QR code renders, OG image shows, no console errors
```

### Success Criteria
- All 3 cloud functions return `{ success: true }` on health check
- Mini program loads without JS errors
- H5 landing page renders QR + OG image correctly
- No `actorRunId` or auth errors in DevTools console

---

## M-17: Alpha Feedback Analysis

**Paperclip Issue**: Sprint 5 backlog
**Owner**: Tech Lead
**Trigger**: M-16 verified

### Data Collection
```bash
# Export feedback from mini program (devtools storage panel)
# Or: Query WeChat Cloud DB for mira_feedback collection
```

### Running the Analysis
```bash
# Table format (recommended)
node scripts/analyze-feedback.js --source=local --format=table

# JSON format (for CI / export)
node scripts/analyze-feedback.js --source=local --format=json > data/m17-analysis.json
```

### Funnel Metrics (via AnalyticsService)
```javascript
// In DevTools console or via cloud sync
const Analytics = require('./services/analytics');
const a = new Analytics();
console.log(a.getFunnelMetrics());
console.log(a.getAPIMetrics());
```

### Key Questions
1. Which funnel stage has highest drop-off?
2. Average rating by stage — is questionnaire or results underperforming?
3. What themes dominate negative feedback (1-2★)?
4. Are MBTI types well-represented (>4 types)?
5. API success rate per service — any service >10% failure?

### Output
- `data/m17-analysis.json` — raw analysis
- Update this file with findings
- Create M-18 bug/improvement issues based on findings

---

## M-18: Bug Fixes & Improvements

**Paperclip Issue**: Sprint 5 backlog
**Owner**: Tech Lead
**Trigger**: M-17 analysis complete

### Already Fixed (Pre-Sprint-5)
| Fix | Commit | Description |
|-----|--------|-------------|
| FLUX async polling | `4fb8c7e` | Image CF: add `getPredictionStatus` action + polling handler |
| H5 QR code | `25d64b1` | Google Charts API QR generation + OG/Twitter meta |

### M-18 Tasks (from M-17 findings)
Based on M-17 output, create issues for:
- [ ] Address 1-2★ rating patterns (if >20%)
- [ ] Improve funnel drop-off stage (if any >30% drop)
- [ ] Fix any API service with >10% failure rate
- [ ] UI/UX improvements from feedback themes
- [ ] Any accuracy issues in style recommendations

### Verification
```bash
# Re-run after fixes
node scripts/analyze-feedback.js --source=local --format=table
# Check metrics improved vs M-17 baseline
```

---

## M-19: Beta Launch Preparation

**Paperclip Issue**: Sprint 5 backlog
**Owner**: Tech Lead + CEO
**Trigger**: M-18 all fixes committed

### Beta Launch Checklist
- [ ] M-12 all cloud functions healthy (re-verify)
- [ ] M-18 bug fixes committed and pushed
- [ ] Performance baselines confirmed (M-15):
  - [ ] App launch < 2s
  - [ ] Questionnaire load < 500ms
  - [ ] Results page load < 3s (after API call)
- [ ] Feedback collection mechanism confirmed
- [ ] Analytics funnel tracking confirmed
- [ ] README.md updated with beta instructions
- [ ] H5 landing page live and rendering correctly

### Beta User Recruitment (CEO)
- [ ] Identify 5-10 alpha users for beta
- [ ] Share H5 QR code / link
- [ ] Collect feedback via in-app feedback button

### Definition of Done
- Beta users can complete full flow: Home → Questionnaire → Results → Share
- At least one positive rating (4-5★) received
- No blocking JS errors in DevTools console
- Share card generates successfully

---

## Scripts Reference

| Script | Purpose | Status |
|--------|---------|--------|
| `scripts/analyze-feedback.js` | M-17 feedback analysis | ✅ Ready |
| `verify.sh` | Cloud function health check | ✅ Ready |
| `deploy.sh` | AppID + env var fill | ✅ Ready |
| `preflight-check.sh` | Pre-deploy prerequisites | ✅ Ready |

## Env Var Naming (Critical)

```
REPLICATE_API_KEY    # NOT REPLICATE_API_TOKEN
ANTHROPIC_API_KEY
OPENAI_API_KEY
WECHAT_APP_ID        # for deploy.sh only
```
