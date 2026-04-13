#!/bin/bash
# MIRASUIT — Pre-Flight Check
# Run this to verify your setup before deploying
# =========================

set -e

echo "============================================"
echo "  MIRASUIT Pre-Flight Check"
echo "============================================"
echo ""

PASS=0
FAIL=0

check() {
  if [ $? -eq 0 ]; then
    echo "  ✅ $1"
    PASS=$((PASS+1))
  else
    echo "  ❌ $1"
    FAIL=$((FAIL+1))
  fi
}

# 1. Node.js available
echo "1. Checking Node.js..."
node --version > /dev/null 2>&1
check "Node.js installed ($(node --version 2>/dev/null || echo 'missing'))"

# 2. WeChat DevTools available (macOS)
echo "2. Checking WeChat DevTools..."
if [ -d "/Applications/wechatdevtools.app" ]; then
  echo "  ✅ WeChat DevTools installed"
  PASS=$((PASS+1))
elif [ -d "$HOME/Applications/wechatdevtools.app" ]; then
  echo "  ✅ WeChat DevTools installed"
  PASS=$((PASS+1))
else
  echo "  ⚠️  WeChat DevTools not found in /Applications"
  echo "     Download: https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html"
  FAIL=$((FAIL+1))
fi

# 3. project.config.json exists and has appid
echo "3. Checking project.config.json..."
if [ -f "project.config.json" ]; then
  APPID=$(python3 -c "import json; d=json.load(open('project.config.json')); print(d.get('appid',''))" 2>/dev/null || echo "")
  if [ "$APPID" != "" ] && [ "$APPID" != "YOUR_WECHAT_APP_ID" ]; then
    echo "  ✅ App ID configured: $APPID"
    PASS=$((PASS+1))
  else
    echo "  ❌ App ID not set — edit project.config.json"
    FAIL=$((FAIL+1))
  fi
else
  echo "  ❌ project.config.json not found"
  FAIL=$((FAIL+1))
fi

# 4. Cloud functions exist
echo "4. Checking cloud functions..."
if [ -d "cloud-functions/mirasuit-claude-api" ] && \
   [ -d "cloud-functions/mirasuit-image-api" ] && \
   [ -d "cloud-functions/mirasuit-video-api" ]; then
  echo "  ✅ All 3 cloud functions present"
  PASS=$((PASS+1))
else
  echo "  ❌ Missing cloud functions"
  FAIL=$((FAIL+1))
fi

# 5. JS syntax check
echo "5. Checking JavaScript syntax..."
JS_ERRORS=0
for f in $(find . -name "*.js" -not -path "./node_modules/*"); do
  node --check "$f" 2>/dev/null || JS_ERRORS=$((JS_ERRORS+1))
done
if [ $JS_ERRORS -eq 0 ]; then
  echo "  ✅ All JS files pass syntax check"
  PASS=$((PASS+1))
else
  echo "  ❌ $JS_ERRORS JS file(s) have syntax errors"
  FAIL=$((FAIL+1))
fi

# 6. .env template
echo "6. Checking API key template..."
if [ -f ".env.example" ]; then
  echo "  ✅ .env.example present — fill in your keys before Step 3"
  PASS=$((PASS+1))
else
  echo "  ⚠️  .env.example not found"
fi

echo ""
echo "============================================"
echo "  Result: $PASS passed, $FAIL failed"
echo "============================================"
echo ""
if [ $FAIL -eq 0 ]; then
  echo "✅ Ready to deploy! Follow DEPLOY.md Step 2 onwards."
  echo "   (Step 1 — App ID — already done)"
else
  echo "❌ Fix the failed items before deploying."
  echo "   Check DEPLOY.md for instructions."
fi
