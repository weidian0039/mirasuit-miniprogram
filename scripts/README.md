# MIRASUIT Scripts

## Usage

All scripts require Node.js 18+ and are run from the project root:

```bash
cd ~/mirasuit-miniprogram
node scripts/<script-name.js> [args...]
```

---

## analyze-feedback.js

**Purpose**: M-17 Alpha Feedback Analysis
**Prerequisites**: Feedback data exported from mini program

```bash
# Table format (recommended)
node scripts/analyze-feedback.js --source=local --format=table

# JSON format (for CI / export)
node scripts/analyze-feedback.js --source=local --format=json > data/m17-analysis.json
```

**Sample data** (for testing without live data):
```bash
# Uses data/feedback-local.json
node scripts/analyze-feedback.js --source=local --format=table
```

**Output sections**:
- Rating distribution (1-5 stars) with visual bar chart
- Average rating overall and by funnel stage
- Comment theme extraction (Chinese + English keywords)
- MBTI breakdown of respondents
- Feedback submission rate by stage
- MIRASUIT Consultant Assessment with actionable recommendations

---

## Deploy Scripts (Shell)

See `deploy.sh`, `verify.sh`, and `preflight-check.sh` in the project root.

### deploy.sh
Fills `project.config.json` with your AppID and guides you through env var setup.

```bash
./deploy.sh <WECHAT_APP_ID> [ANTHROPIC_KEY] [OPENAI_KEY] [REPLICATE_KEY]
```

### verify.sh
Cloud function health check. Run after deploy.

```bash
./verify.sh <WECHAT_CLOUD_ENV_ID>
```

### preflight-check.sh
Pre-deploy prerequisites checklist.

```bash
./preflight-check.sh
```

### mirasuit-deploy-watchdog.sh
Automated M-16 trigger. Checks every 10 min if `project.config.json` appid is configured.
When CEO runs `./deploy.sh <APPID>`, this script detects it and prints next steps.

```bash
# Install: add to crontab
crontab -e
# Add line:
*/10 * * * * ~/bin/mirasuit-deploy-watchdog.sh >> ~/mirasuit-deploy.log 2>&1

# Or copy into project:
cp scripts/mirasuit-deploy-watchdog.sh ~/bin/
chmod +x ~/bin/mirasuit-deploy-watchdog.sh
```

---

## Env Var Naming

| Variable | Notes |
|----------|-------|
| `REPLICATE_API_KEY` | NOT `REPLICATE_API_TOKEN` — code uses `REPLICATE_API_KEY` |
| `ANTHROPIC_API_KEY` | Anthropic API key for personality analysis |
| `OPENAI_API_KEY` | OpenAI API key for DALL-E image generation |
