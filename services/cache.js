/**
 * MIRASUIT 缓存服务
 * 减少 API 调用成本，提升用户体验
 */

const logger = require('./logger');

class CacheService {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      defaultTTL: config.defaultTTL || 7 * 24 * 3600, // 默认 7 天（秒）
      prefix: config.prefix || 'mirasuit_cache_',
      maxSize: config.maxSize || 100 // 最大缓存条目数
    };

    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // M-15 Performance: defer storage reads to first access — not on constructor path
    this._loaded = false;
  }

  // M-15: Lazy load from storage on first use
  _ensureLoaded() {
    if (!this._loaded) {
      this._loadFromStorage();
      this._loaded = true;
    }
  }

  /**
   * 生成缓存键
   * @private
   */
  _generateKey(key) {
    return `${this.config.prefix}${key}`;
  }

  /**
   * 生成哈希值（用于对象键）
   * @private
   */
  _hash(obj) {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为 32 位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 从本地存储加载缓存
   * @private
   */
  _loadFromStorage() {
    try {
      const keys = wx.getStorageInfoSync().keys;
      const cacheKeys = keys.filter(key => key.startsWith(this.config.prefix));

      cacheKeys.forEach(key => {
        try {
          const item = wx.getStorageSync(key);
          if (item && item.expiresAt > Date.now()) {
            this.cache.set(key, item);
          } else {
            // 过期的缓存，删除
            wx.removeStorageSync(key);
          }
        } catch (error) {
          logger.warn('Failed to load cache item', { key });
        }
      });

      logger.info('Cache loaded from storage', {
        count: this.cache.size
      });
    } catch (error) {
      logger.error('Failed to load cache', { error: error.message });
    }
  }

  /**
   * 保存到本地存储
   * @private
   */
  _saveToStorage(key, value) {
    try {
      wx.setStorageSync(key, value);
    } catch (error) {
      logger.error('Failed to save cache', { key, error: error.message });
    }
  }

  /**
   * 从本地存储删除
   * @private
   */
  _removeFromStorage(key) {
    try {
      wx.removeStorageSync(key);
    } catch (error) {
      logger.warn('Failed to remove cache from storage', { key });
    }
  }

  /**
   * 检查缓存大小限制
   * @private
   */
  _checkSizeLimit() {
    if (this.cache.size >= this.config.maxSize) {
      // 使用 LRU 策略：删除最旧的条目
      const oldestKey = this.cache.keys().next().value;
      this.delete(oldestKey);
      logger.debug('Cache evicted (LRU)', { key: oldestKey });
    }
  }

  /**
   * 获取缓存
   */
  get(key) {
    if (!this.config.enabled) {
      return null;
    }
    this._ensureLoaded(); // M-15: defer storage init

    const cacheKey = this._generateKey(key);
    const item = this.cache.get(cacheKey);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (item.expiresAt < Date.now()) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    logger.debug('Cache hit', { key });

    return item.value;
  }

  /**
   * 设置缓存
   */
  set(key, value, ttl = null) {
    if (!this.config.enabled) {
      return;
    }
    this._ensureLoaded(); // M-15: defer storage init

    const cacheKey = this._generateKey(key);
    const expiresAt = Date.now() + (ttl || this.config.defaultTTL) * 1000;

    const item = {
      value,
      expiresAt,
      createdAt: Date.now()
    };

    this._checkSizeLimit();
    this.cache.set(cacheKey, item);
    this._saveToStorage(cacheKey, item);

    this.stats.sets++;
    logger.debug('Cache set', { key, ttl });
  }

  /**
   * 删除缓存
   */
  delete(key) {
    this._ensureLoaded(); // M-15: defer storage init
    const cacheKey = this._generateKey(key);
    const deleted = this.cache.delete(cacheKey);

    if (deleted) {
      this._removeFromStorage(cacheKey);
      this.stats.deletes++;
      logger.debug('Cache deleted', { key });
    }

    return deleted;
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this._ensureLoaded(); // M-15: defer storage init
    this.cache.forEach((value, key) => {
      this._removeFromStorage(key);
    });

    const count = this.cache.size;
    this.cache.clear();

    logger.info('Cache cleared', { count });
  }

  /**
   * 检查缓存是否存在且有效
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * 获取或设置（缓存穿透保护）
   */
  async getOrSet(key, factory, ttl = null) {
    // 尝试从缓存获取
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // 缓存未命中，调用工厂函数
    try {
      const value = await factory();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      logger.error('Cache factory error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size
    };
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    this.cache.forEach((item, key) => {
      if (item.expiresAt < now) {
        this.delete(key.replace(this.config.prefix, ''));
        cleaned++;
      }
    });

    logger.info('Cache cleanup completed', { cleaned });
    return cleaned;
  }

  /**
   * 导出缓存（用于调试）
   */
  export() {
    const data = {};
    this.cache.forEach((value, key) => {
      data[key] = value;
    });
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导入缓存（用于测试）
   */
  import(data) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;

      Object.entries(parsed).forEach(([key, value]) => {
        if (value.expiresAt > Date.now()) {
          this.cache.set(key, value);
        }
      });

      logger.info('Cache imported', { count: this.cache.size });
    } catch (error) {
      logger.error('Failed to import cache', { error: error.message });
    }
  }
}

// 创建全局缓存实例
const cache = new CacheService({
  enabled: true,
  defaultTTL: 7 * 24 * 3600, // 7 天
  maxSize: 100
});

module.exports = cache;
