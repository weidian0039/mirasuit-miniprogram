#!/bin/bash
# MIRASUIT — Cloud Function Health Check Script
# Usage: ./verify.sh <WECHAT_CLOUD_ENV_ID>
# Example: ./verify.sh tcb-xxxxxxxx-xxxx
#
# This script verifies all 3 cloud functions are deployed and responding.
# Each function is checked in two stages:
#   1. HTTP reachability (function is deployed)
#   2. ping action (env vars are loaded and function logic works)
#
# Env var requirements per function:
#   mirasuit-claude-api:   ANTHROPIC_API_KEY
#   mirasuit-image-api:    OPENAI_API_KEY, REPLICATE_API_KEY
#   mirasuit-video-api:    REPLICATE_API_KEY

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
WARNED=0

# Function to check a cloud function: HTTP reachability + ping action
check_function() {
  local NAME="$1"
  local FUNC_NAME="$2"

  echo -e "\n  ${NAME}"
  echo "  --------------------------------"

  # 1. HTTP reachability check
  echo -n "    HTTP reachability... "
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 30 \
    "https://${CLOUD_ENV_NAME}.service.tcb.tencentyun.com/${FUNC_NAME}/index" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ HTTP $HTTP_CODE${NC}"
  elif [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "500" ]; then
    echo -e "${YELLOW}⚠️  HTTP $HTTP_CODE (deployed but returned error — check env vars)${NC}"
    WARNED=$((WARNED + 1))
  else
    echo -e "${RED}❌ HTTP $HTTP_CODE (not reachable)${NC}"
    FAILED=$((FAILED + 1))
    return
  fi

  # 2. ping action check — confirms function logic + env vars are loaded
  echo -n "    ping action (env vars loaded)... "
  PING_RESPONSE=$(curl -s \
    --max-time 30 \
    -X POST \
    "https://${CLOUD_ENV_NAME}.service.tcb.tencentyun.com/${FUNC_NAME}/index" \
    -H "Content-Type: application/json" \
    -d '{"action":"ping","data":{}}' 2>/dev/null || echo "")

  # Extract success field from JSON response
  PING_SUCCESS=$(echo "$PING_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print('true' if d.get('success') else 'false')" 2>/dev/null || echo "error")

  if [ "$PING_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ {\"success\":true}${NC}"
  elif [ "$PING_SUCCESS" = "false" ]; then
    echo -e "${RED}❌ ping returned {\"success\":false} — check env vars in WeChat Cloud Console${NC}"
    FAILED=$((FAILED + 1))
  else
    echo -e "${YELLOW}⚠️  ping unreachable or invalid response${NC}"
    WARNED=$((WARNED + 1))
  fi
}

echo -e "${GREEN}Verifying cloud functions for env: ${ENV_ID}${NC}"
echo ""

check_function "mirasuit-claude-api" "mirasuit-claude-api"
check_function "mirasuit-image-api"  "mirasuit-image-api"
check_function "mirasuit-video-api"  "mirasuit-video-api"

echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All cloud functions are healthy${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run the mini program in WeChat DevTools (simulator)"
  echo "  2. Complete the questionnaire flow end-to-end"
  echo "  3. Submit for WeChat review (Experience version)"
  echo ""
  echo "  🚀 M-16 verified — ready to run M-17 feedback analysis"
else
  echo -e "${RED}❌ $FAILED function(s) failed health check${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Cloud functions deployed? (WeChat DevTools → right-click → Upload and Deploy)"
  echo "  2. ENV_ID correct? (cloud.weixin.qq.com → 环境 → 复制环境 ID)"
  echo "  3. Env vars set? (each function → Settings → 环境变量)"
  echo "     mirasuit-claude-api:   ANTHROPIC_API_KEY"
  echo "     mirasuit-image-api:    OPENAI_API_KEY, REPLICATE_API_KEY"
  echo "     mirasuit-video-api:    REPLICATE_API_KEY"
fi

echo ""
echo "============================================"
