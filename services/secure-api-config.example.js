/**
 * API Key 配置示例
 *
 * ⚠️ 安全警告：
 * 1. 不要将真实的 API key 提交到版本控制系统
 * 2. 使用环境变量或云函数存储 API key
 * 3. 开发环境使用配置文件，生产环境使用云函数
 */

// 开发环境配置示例
const developmentConfig = {
  // ❌ 不推荐：硬编码 API key（仅用于本地测试）
  anthropicApiKey: 'your-api-key-here', // 替换为真实的 API key

  // ✅ 推荐：从环境变量读取
  // anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  // ✅ 最佳实践：使用云函数
  useCloudFunction: true,
  cloudFunctionName: 'mirasuit-claude-api'
};

// 生产环境配置（使用云函数）
const productionConfig = {
  // 生产环境必须使用云函数
  useCloudFunction: true,
  cloudFunctionName: 'mirasuit-claude-api',

  // 禁用客户端 API key
  anthropicApiKey: null
};

// 根据环境选择配置
const config = process.env.NODE_ENV === 'production'
  ? productionConfig
  : developmentConfig;

module.exports = config;
