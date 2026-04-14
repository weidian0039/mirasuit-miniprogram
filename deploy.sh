#!/bin/bash
# MIRASUIT — Deploy Script
# Usage: ./deploy.sh <WECHAT_APP_ID> [ANTHROPIC_KEY] [OPENAI_KEY] [REPLICATE_KEY]
# ============================
#
# This script prepares the project for deployment.
# It does NOT deploy to WeChat — you do that via WeChat DevTools.
#
# What it does:
#   1. Updates project.config.json with your AppID
#   2. Generates a credential checklist for WeChat Cloud Console
#   3. Shows your next steps
#
# For full deploy instructions, see DEPLOY.md

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

APP_ID="${1:-}"
ANTHROPIC_KEY="${2:-}"
OPENAI_KEY="${3:-}"
REPLICATE_KEY="${4:-}"

echo "============================================"
echo "  MIRASUIT Deploy Prep"
echo "============================================"
echo ""

# Check AppID
if [ -z "$APP_ID" ]; then
  echo -e "${RED}❌ WECHAT_APP_ID is required${NC}"
  echo ""
  echo "Usage: ./deploy.sh <WECHAT_APP_ID> [ANTHROPIC_KEY] [OPENAI_KEY] [REPLICATE_KEY]"
  echo ""
  echo "Get your AppID at: https://mp.weixin.qq.com/"
  echo "  → Settings → Account Info → Mini Program → AppID"
  exit 1
fi

# Validate AppID format
if [[ ! "$APP_ID" =~ ^wx[a-f0-9]{16}$ ]]; then
  echo -e "${YELLOW}⚠️  AppID format looks unusual: $APP_ID${NC}"
  echo "    Expected format: wx + 16 hex chars (e.g., wx1a2b3c4d5e6f7g8h)"
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# 1. Update project.config.json
echo -e "${GREEN}① Updating project.config.json${NC}"
if [ -f "project.config.json" ]; then
  python3 -c "
import json
with open('project.config.json', 'r') as f:
    d = json.load(f)
d['appid'] = '$APP_ID'
with open('project.config.json', 'w') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
print('  AppID updated')
"
else
  echo -e "${RED}❌ project.config.json not found${NC}"
  exit 1
fi

# 2. Generate credential checklist
echo ""
echo -e "${GREEN}② WeChat Cloud Console — Environment Variables${NC}"
echo "  Go to: https://cloud.weixin.qq.com/"
echo "  Path: 云开发控制台 → 设置 → 环境变量 → 添加"
echo ""
echo "  Configure these variables (for ALL 3 cloud functions):"
echo ""
echo "  ┌─────────────────────────┬────────────────────────────────────┐"
echo "  │ Variable Name           │ Value                              │"
echo "  ├─────────────────────────┼────────────────────────────────────┤"

if [ -n "$ANTHROPIC_KEY" ]; then
  echo "  │ ANTHROPIC_API_KEY      │ $ANTHROPIC_KEY |"
else
  echo "  │ ANTHROPIC_API_KEY      │ sk-ant-...  ← you provide        │"
fi

if [ -n "$OPENAI_KEY" ]; then
  echo "  │ OPENAI_API_KEY         │ $OPENAI_KEY |"
else
  echo "  │ OPENAI_API_KEY         │ sk-proj-...  ← you provide        │"
fi

if [ -n "$REPLICATE_KEY" ]; then
  echo "  │ REPLICATE_API_KEY      │ $REPLICATE_KEY |"
else
  echo "  │ REPLICATE_API_KEY      │ r8_...  ← you provide             │"
fi

echo "  └─────────────────────────┴────────────────────────────────────┘"
echo ""
echo "  ⚠️  Each variable must be set for each cloud function:"
echo "      - mirasuit-claude-api  (needs ANTHROPIC_API_KEY)"
echo "      - mirasuit-image-api   (needs OPENAI_API_KEY, REPLICATE_API_KEY)"
echo "      - mirasuit-video-api  (needs REPLICATE_API_KEY)"

# 3. Next steps
echo ""
echo -e "${GREEN}③ Your Next Steps${NC}"
echo ""
echo "  1. Set environment variables in WeChat Cloud Console (step ② above)"
echo ""
echo "  2. Deploy cloud functions (WeChat DevTools):"
echo "     - Open this project in WeChat DevTools"
echo "     - Right-click cloud-functions/mirasuit-claude-api → 上传并部署 → 云端安装依赖"
echo "     - Right-click cloud-functions/mirasuit-image-api  → 上传并部署 → 云端安装依赖"
echo "     - Right-click cloud-functions/mirasuit-video-api → 上传并部署 → 云端安装依赖"
echo ""
echo "  3. Upload mini program (WeChat DevTools):"
echo "     - Click 上传 → Version 1.0.0 → 备注 Alpha Launch M-12"
echo "     - Go to https://mp.weixin.qq.com/ → 管理 → 版本管理 → 体验版二维码"
echo ""
echo "  4. Deploy H5 landing page:"
echo "     - netlify deploy --prod --dir=h5"
echo "     - Or: vercel --prod --publicDirectory=h5"
echo "     - Or: GitHub Pages → Settings → Pages → /h5 folder"
echo ""
echo "  5. Run verification:"
echo "     ./verify.sh <YOUR_CLOUD_ENV_ID>"
echo ""
echo -e "${GREEN}✅ Deploy prep complete${NC}"
