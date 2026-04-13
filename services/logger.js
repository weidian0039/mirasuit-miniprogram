/**
 * MIRASUIT 日志服务
 * 提供结构化日志和错误追踪
 */

class Logger {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      level: config.level || 'info', // 'debug' | 'info' | 'warn' | 'error'
      prefix: config.prefix || '[MIRA]',
      remoteLogging: config.remoteLogging || false,
      maxLogSize: config.maxLogSize || 100 // 最大日志条数
    };

    this.logs = [];
    this.sessionId = this._generateSessionId();
  }

  /**
   * 生成会话 ID
   * @private
   */
  _generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 格式化日志条目
   * @private
   */
  _formatLogEntry(level, message, data = {}) {
    return {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      data,
      platform: 'miniprogram',
      version: getApp()?.globalData?.version || '1.0.0'
    };
  }

  /**
   * 添加日志到内存
   * @private
   */
  _addLog(entry) {
    if (this.logs.length >= this.config.maxLogSize) {
      this.logs.shift(); // 移除最旧的日志
    }
    this.logs.push(entry);
  }

  /**
   * 输出日志（控制台）
   * @private
   */
  _output(entry) {
    const { level, message, data, timestamp } = entry;
    const prefix = `${this.config.prefix} [${level}]`;

    switch (level) {
      case 'DEBUG':
        console.debug(prefix, timestamp, message, data);
        break;
      case 'INFO':
        console.info(prefix, timestamp, message, data);
        break;
      case 'WARN':
        console.warn(prefix, timestamp, message, data);
        break;
      case 'ERROR':
        console.error(prefix, timestamp, message, data);
        break;
    }
  }

  /**
   * 远程日志上报（可选）
   * @private
   */
  async _remoteLog(entry) {
    if (!this.config.remoteLogging) {
      return;
    }

    try {
      // TODO: 实现远程日志上报
      // 可以上报到自己的服务器或第三方服务（如 Sentry）
      console.log('[Remote Log]', entry);
    } catch (error) {
      console.error('Remote logging failed:', error);
    }
  }

  /**
   * 记录日志
   * @private
   */
  _log(level, message, data = {}) {
    if (!this.config.enabled) {
      return;
    }

    // 级别过滤
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] < levels[this.config.level]) {
      return;
    }

    const entry = this._formatLogEntry(level, message, data);
    this._addLog(entry);
    this._output(entry);
    this._remoteLog(entry);

    return entry;
  }

  /**
   * Debug 级别日志
   */
  debug(message, data = {}) {
    return this._log('debug', message, data);
  }

  /**
   * Info 级别日志
   */
  info(message, data = {}) {
    return this._log('info', message, data);
  }

  /**
   * Warning 级别日志
   */
  warn(message, data = {}) {
    return this._log('warn', message, data);
  }

  /**
   * Error 级别日志
   */
  error(message, data = {}) {
    return this._log('error', message, data);
  }

  /**
   * API 调用日志（专用）
   */
  apiCall(method, url, data = {}) {
    return this.info('API Call', {
      method,
      url,
      ...data,
      category: 'api'
    });
  }

  /**
   * API 错误日志（专用）
   */
  apiError(method, url, error, data = {}) {
    return this.error('API Error', {
      method,
      url,
      error: error.message || error,
      errorType: error.name,
      stack: error.stack,
      ...data,
      category: 'api_error'
    });
  }

  /**
   * 性能日志（专用）
   */
  performance(operation, duration, data = {}) {
    return this.info('Performance', {
      operation,
      duration: `${duration}ms`,
      ...data,
      category: 'performance'
    });
  }

  /**
   * 用户行为日志（专用）
   */
  userAction(action, data = {}) {
    return this.info('User Action', {
      action,
      page: getCurrentPages().pop()?.route || 'unknown',
      ...data,
      category: 'user_action'
    });
  }

  /**
   * 获取所有日志
   */
  getLogs(level = null) {
    if (level) {
      return this.logs.filter(log => log.level === level.toUpperCase());
    }
    return [...this.logs];
  }

  /**
   * 清空日志
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * 导出日志（用于调试）
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 性能监控装饰器
   */
  async measure(operation, fn) {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.performance(operation, duration, { success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.performance(operation, duration, { success: false, error: error.message });
      throw error;
    }
  }

  /**
   * 错误边界捕获
   */
  captureError(error, context = {}) {
    return this.error('Uncaught Error', {
      error: error.message,
      stack: error.stack,
      ...context,
      category: 'uncaught_error'
    });
  }
}

// 创建全局 logger 实例
const logger = new Logger({
  enabled: true,
  level: 'info',
  remoteLogging: false // 开启后需要配置远程日志服务
});

module.exports = logger;
