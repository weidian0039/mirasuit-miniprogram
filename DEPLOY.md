# MIRASUIT M-12 Alpha Launch — 部署指南

**执行时间**: ~20 分钟
**Tech Lead**: 9015e695-4269-47df-a58a-b1342cbca7c2
**最后更新**: 2026-04-12

---

## 一键部署（推荐）

```bash
cd mirasuit-miniprogram

# 只需填入 AppID，其他参数可选
./deploy.sh <WECHAT_APP_ID> [ANTHROPIC_KEY] [OPENAI_KEY] [REPLICATE_KEY]

# 示例（带 API key）
./deploy.sh wx1234567890abcdef sk-ant-xxx sk-proj-xxx r8_xxx

# 示例（仅 AppID）
./deploy.sh wx1234567890abcdef
```

脚本会自动：
- ✅ 更新 `project.config.json` 的 AppID
- ✅ 生成环境变量配置说明
- ✅ 生成云函数部署指南
- ✅ 生成 H5 部署指南
- ✅ 生成小程序上传指南
- ✅ 生成 `verify.sh` 验证脚本

---

## 手动部署（不用脚本）

### Step 1 — project.config.json（第 45 行）

```json
"appid": "wx你的真实AppID"
```

### Step 2 — 环境变量（微信云控制台）

**网址**: https://cloud.weixin.qq.com/
**路径**: 云开发控制台 → 设置 → 环境变量 → 添加

| 变量名 | 值 |
|--------|-----|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `OPENAI_API_KEY` | `sk-proj-...` |
| `REPLICATE_API_KEY` | `r8_...` |

### Step 3 — 云函数部署（WeChat DevTools）

必须从 WeChat DevTools 打开 `mirasuit-miniprogram` 项目：

1. 右键 `cloud-functions/mirasuit-claude-api` → 上传并部署（云端安装依赖）
2. 右键 `cloud-functions/mirasuit-image-api` → 上传并部署（云端安装依赖）
3. 右键 `cloud-functions/mirasuit-video-api` → 上传并部署（云端安装依赖）

### Step 4 — H5 部署

```bash
# Netlify
netlify deploy --prod --dir=h5 --site=YOUR_SITE_ID

# Vercel
vercel --prod --publicDirectory=h5
```

**H5 URL 必须包含 appid**:
```
https://your-domain.com/?appid=wx123...
```

**微信短链**（h5/index.html 第 343 行）:
```javascript
// 当前占位符:
const wechatSearchUrl = `https://wxaurl.com/`;
// 替换为微信公众平台生成的 URL Link
```

### Step 5 — 小程序上传（WeChat DevTools）

1. 确认 `project.config.json` 的 `appid` 已填写
2. 点击「上传」→ 填写版本号 `1.0.0` → 备注 `Alpha Launch M-12`
3. 登录微信公众平台 → 管理 → 版本管理 → 体验版二维码

---

## 验证部署

云函数部署 + 环境变量配置完成后，运行:

```bash
./verify.sh <WECHAT_CLOUD_ENV_ID>

# 查找 ENV_ID: 微信云控制台 → 云开发 → 环境 → 复制环境 ID
# 格式: tcb-xxxxxxxx-xxxx
```

**预期结果**:
```
① ✅ HTTP 200 — claude-api 正常
② ✅ HTTP 200 — image-api 正常
③ ✅ HTTP 200 — video-api 正常
```

---

## 已知占位符（需替换）

| 文件 | 行号 | 当前值 | 替换为 |
|------|------|--------|--------|
| `project.config.json` | 45 | `""` | `wx真实AppID` |
| `h5/index.html` | 343 | `https://wxaurl.com/` | 微信短链 URL Link |
| `app.js` | 20 | `YOUR_ANTHROPIC_KEY` | `sk-ant-...` |
| `app.js` | 23 | `YOUR_OPENAI_KEY` | `sk-proj-...` |
| `app.js` | 24 | `YOUR_REPLICATE_KEY` | `r8_...` |

---

## 代码验证（19/19 通过）

```bash
find pages services utils cloud-functions -name "*.js" | xargs node --check
# Result: 19/19 PASS ✅
```

---

## 阻塞项

| 阻塞项 | Owner | 状态 |
|--------|-------|------|
| WeChat AppID | CEO | ⏳ 等待 |
| API 密钥 | CEO | ⏳ 等待 |
| 云函数部署 | CEO（WeChat DevTools） | ⏳ 等待 |
| H5 部署 | CEO | ⏳ 等待 |
| 小程序上传 | CEO | ⏳ 等待 |
