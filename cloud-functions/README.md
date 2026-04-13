# MIRASUIT 云函数部署指南

## 📋 概述

本文档说明如何部署 3 个云函数，**彻底解决 API Key 安全问题**：

| 云函数 | 功能 | API Key |
|--------|------|---------|
| `mirasuit-claude-api` | 性格分析 (Anthropic Claude) | `ANTHROPIC_API_KEY` |
| `mirasuit-image-api` | 图片生成 (DALL-E 3 + FLUX) | `OPENAI_API_KEY` + `REPLICATE_API_KEY` |
| `mirasuit-video-api` | 视频生成 (CogVideoX / I2VGen-XL) | `REPLICATE_API_KEY` |

## 🎯 为什么需要云函数？

**当前问题**：
- API Key 存储在客户端代码中
- 小程序代码可被反编译
- 攻击者可以获取 API Key 并滥用

**云函数解决方案**：
```
客户端              云函数              Claude API
   │                  │                   │
   │── 调用云函数 ───> │                   │
   │                  │── 调用 API Key ──> │
   │                  │<── API 响应 ──────│
   │<── 安全响应 ────│                   │
```

**安全优势**：
- ✅ API Key 完全隔离在云端
- ✅ 客户端无法访问 API Key
- ✅ 可以添加速率限制
- ✅ 可以添加缓存减少 API 调用
- ✅ 可以添加日志和监控

---

## 🚀 部署步骤（全部 3 个云函数）

### 第一步：在微信开发者工具中打开项目

1. 打开微信开发者工具
2. 打开 `mirasuit-miniprogram` 项目
3. 确保已开通云开发（工具栏 → 云开发）

### 第二步：上传 3 个云函数

对每个目录重复操作：

| 云函数目录 | 依赖 |
|-----------|------|
| `cloud-functions/mirasuit-claude-api/` | wx-server-sdk |
| `cloud-functions/mirasuit-image-api/` | wx-server-sdk |
| `cloud-functions/mirasuit-video-api/` | wx-server-sdk |

右键 → **"上传并部署：云端安装依赖"**（等待 1-2 分钟/个）

### 第三步：配置环境变量（微信云开发控制台）

打开 https://cloud.weixin.qq.com/ → 云函数 → 环境变量，添加：

```
ANTHROPIC_API_KEY=sk-ant-...         (mirasuit-claude-api)
OPENAI_API_KEY=sk-proj-...           (mirasuit-image-api)
REPLICATE_API_KEY=r8_...             (mirasuit-image-api + mirasuit-video-api)
```

### 第四步：修改小程序代码（已完成 ✅）

`pages/results/results.js` 已更新为：
```javascript
// ✅ useCloudFunction: true — 由 Tech Lead 预置
const apiService = new SecureAPIService({
  useCloudFunction: true,
  cloudFunctionName: 'mirasuit-claude-api'
});
// imageGenerator + videoGenerator 同理
```

### 第五步：E2E 验证

```bash
npm install
npx playwright install chromium
npx playwright test
```

---

## 🔍 验证清单

- [ ] `mirasuit-claude-api` 上传成功（环境变量：`ANTHROPIC_API_KEY`）
- [ ] `mirasuit-image-api` 上传成功（环境变量：`OPENAI_API_KEY`）
- [ ] `mirasuit-video-api` 上传成功（环境变量：`REPLICATE_API_KEY`）
- [ ] 云函数日志无 `not configured` 报错
- [ ] 问卷 → 结果页全流程跑通
- [ ] `npx playwright test` 全部通过

### ✅ 部署后必做的 ping 验证（WeChat DevTools 控制台）

部署完成后，在 **WeChat DevTools → Debugger Console** 运行以下代码，逐个验证：

```javascript
// 验证 1：Claude API
wx.cloud.callFunction({
  name: 'mirasuit-claude-api',
  data: { action: 'ping' },
  success: res => console.log('✅ mira-claude-api:', JSON.stringify(res.result)),
  fail: err => console.error('❌ mira-claude-api FAILED:', err)
});

// 验证 2：Image API
wx.cloud.callFunction({
  name: 'mirasuit-image-api',
  data: { action: 'ping' },
  success: res => console.log('✅ mira-image-api:', JSON.stringify(res.result)),
  fail: err => console.error('❌ mira-image-api FAILED:', err)
});

// 验证 3：Video API
wx.cloud.callFunction({
  name: 'mirasuit-video-api',
  data: { action: 'ping' },
  success: res => console.log('✅ mira-video-api:', JSON.stringify(res.result)),
  fail: err => console.error('❌ mira-video-api FAILED:', err)
});
```

**预期输出**：`{ success: true, result: { status: 'ok' }, service: 'mirasuit-xxx-api' }`

> 注意：ping 不检查 API key，只检查函数是否正确部署。API key 错误会在实际调用时报错。

---

## 📊 云函数功能速查

### mirasuit-claude-api
| Action | 功能 | 缓存 |
|--------|------|------|
| `analyzePersonality` | 性格分析 (Claude) | 7 天 |
| `getStyleRecommendations` | 风格推荐 | 7 天 |
| `getPersonalizedAdvice` | 个性化建议 | 5 分钟 |

### mirasuit-image-api
| Action | 功能 | 缓存 |
|--------|------|------|
| `generateStyleImage` | 风格图片 (DALL-E 3 + FLUX fallback) | 7 天 |

### mirasuit-video-api
| Action | 功能 | 缓存 |
|--------|------|------|
| `generateStyleVideo` | 风格视频 (CogVideoX / I2VGen-XL) | 7 天 |
| `getVideoStatus` | 查询视频生成状态（异步轮询） | — |

### 所有云函数通用 Action
| Action | 功能 | 说明 |
|--------|------|------|
| `ping` | 健康检查 | 验证函数是否正确部署，**不检查 API key** |

### 内置功能
1. **速率限制**：每分钟最多 10 次调用
2. **缓存**：减少 API 调用，节省成本
3. **错误处理**：统一的错误响应格式
4. **日志**：所有调用都有日志记录

---

## 💰 成本节省

**假设**：
- 每天 1,000 个用户
- 每个用户调用 2 次 API
- Claude API 费用：$3/百万 tokens

**有云函数缓存后**：
- 缓存命中率 > 70%
- 实际 API 调用减少 70%
- 每月节省约 $126

---

## 🔧 故障排除

### 问题 1：云函数上传失败

**原因**：依赖包安装失败

**解决方案**：
1. 确保网络连接正常
2. 右键点击云函数目录 → "上传并部署：云端安装依赖"
3. 等待 2-3 分钟

### 问题 2：API Key 未配置

**错误日志**：`API Key not configured`

**解决方案**：
1. 在云开发控制台 → 云函数 → 环境变量
2. 添加 `ANTHROPIC_API_KEY` 环境变量
3. 重新部署云函数

### 问题 3：调用失败

**错误响应**：`{"success": false, "error": "API_ERROR"}`

**解决方案**：
1. 检查云函数日志（云开发控制台 → 云函数 → 日志）
2. 确认 API Key 有足够的配额
3. 确认 API Key 未过期

### 问题 4：速率限制

**错误响应**：`{"success": false, "error": "RATE_LIMIT_EXCEEDED"}`

**解决方案**：
1. 这是正常行为，保护 API 不被滥用
2. 等待 1 分钟后重试

---

## 📞 后续支持

**遇到问题？**
1. 检查云函数日志（云开发控制台 → 云函数 → 日志）
2. 查看本文档的故障排除章节
3. 联系技术支持

---

## ✅ 安全检查清单

最终部署前确认：

- [ ] API Key 只存在于云函数环境变量中
- [ ] 客户端代码中没有真实的 API Key
- [ ] 云函数有速率限制
- [ ] 云函数有错误处理
- [ ] 云函数有日志记录

---

**创建者**: Tech Lead (9015e695-4269-47df-a58a-b1342cbca7c2)
**日期**: 2026-04-12
**状态**: ✅ 代码就绪 — `ping` action 已添加，`node --check` 全部通过，等待 CEO 提供 WECHAT_APP_ID + API keys 完成部署
