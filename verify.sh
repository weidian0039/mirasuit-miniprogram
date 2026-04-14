#!/bin/bash
# MIRASUIT — Cloud Function Health Check Script
# Usage: ./verify.sh <WECHAT_CLOUD_ENV_ID>
# Example: ./verify.sh tcb-xxxxxxxx-xxxx
#
# This script verifies all 3 cloud functions are deployed and responding.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENV_ID="${1:-}"

echo "============================================"
echo "  MIRASUIT — Cloud Function Health Check"
echo "============================================"
echo ""

if [ -z "$ENV_ID" ]; then
  echo -e "${RED}❌ ENV_ID is required${NC}"
  echo ""
  echo "Usage: ./verify.sh <WECHAT_CLOUD_ENV_ID>"
  echo ""
  echo "Find your ENV_ID at: https://cloud.weixin.qq.com/"
  echo "  → 云开发控制台 → 环境 → 复制环境 ID"
  echo "  Format: tcb-xxxxxxxx-xxxx"
  exit 1
fi

# Strip tcb- prefix if user included it
CLOUD_ENV_NAME="${ENV_ID#tcb-}"

FAILED=0

# Function to check a cloud function
check_function() {
  local NAME="$1"
  local FUNC_NAME="$2"

  echo -n "  Checking $NAME... "

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 30 \
    "https://${CLOUD_ENV_NAME}.service.tcb.tencentyun.com/${FUNC_NAME}/index" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ HTTP $HTTP_CODE${NC}"
  elif [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "500" ]; then
    echo -e "${YELLOW}⚠️  HTTP $HTTP_CODE (function deployed but returned error — check env vars)${NC}"
  else
    echo -e "${RED}❌ HTTP $HTTP_CODE (not reachable)${NC}"
    FAILED=$((FAILED + 1))
  fi
}

echo -e "${GREEN}Verifying cloud functions for env: ${ENV_ID}${NC}"
echo ""

check_function "mirasuit-claude-api" "mirasuit-claude-api"
check_function "mirasuit-image-api"  "mirasuit-image-api"
check_function "mirasuit-video-api"  "mirasuit-video-api"

echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All cloud functions are reachable${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Set environment variables in WeChat Cloud Console"
  echo "     → cloud.weixin.qq.com → 云函数 → Settings → 环境变量"
  echo "  2. Open project in WeChat DevTools → Upload → Submit for review"
  echo "  3. Deploy H5 landing page (netlify/vercel/github pages)"
else
  echo -e "${RED}❌ $FAILED function(s) not reachable${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Cloud functions deployed? (WeChat DevTools → right-click → Upload and Deploy)"
  echo "  2. ENV_ID correct? (cloud.weixin.qq.com → 环境 → 复制环境 ID)"
  echo "  3. Network access? (try curl from terminal)"
fi

echo ""
echo "============================================"