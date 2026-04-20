#!/bin/bash
# MIRASUIT Deploy Watchdog
# Checks every 10 minutes if CEO has run ./deploy.sh <APPID>
# If appid is configured, prints notification and exits
# ============================
# To install: add to crontab: */10 * * * * ~/bin/mirasuit-deploy-watchdog.sh >> ~/mirasuit-deploy.log 2>&1

MINIPROGRAM_DIR="$HOME/mirasuit-miniprogram"
LOG_DIR="$HOME/mirasuit-deploy.log"

check_deploy() {
  if [ ! -f "$MINIPROGRAM_DIR/project.config.json" ]; then
    return  # not cloned yet
  fi

  APPID=$(python3 -c "import json; d=json.load(open('$MINIPROGRAM_DIR/project.config.json')); print(d.get('appid',''))" 2>/dev/null)

  if [ "$APPID" = "YOUR_WECHAT_APP_ID" ] || [ -z "$APPID" ]; then
    return  # not deployed yet, silent
  fi

  echo "[$(date)] 🚀 CEO DEPLOYED! appid=$APPID"
  echo "[$(date)] Next: cd $MINIPROGRAM_DIR && ./verify.sh <ENV_ID>"
  echo "[$(date)] Then execute M-16 Post-Deploy Verification"
  exit 0  # one notification, then exit — CEO will handle from here
}

check_deploy
