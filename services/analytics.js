/**
 * MIRASUIT Analytics Service — M-14 Sprint 4
 * Funnel tracking + API success rate monitoring
 *
 * Tracks:
 * - Funnel: home_view → questionnaire_start → questionnaire_complete → results_view → share_view
 * - API success rate per service (claude, image, video)
 * - Page load times (performance baseline)
 * - Error rates by type
 *
 * Storage: Local-first (wx.setStorageSync), synced to cloud when deployed
 */

const LOG_KEY = 'mira_analytics';
const SESSION_KEY = 'mira_session';
const BATCH_SIZE = 20; // Flush after N events

class Analytics {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      uploadBatch: config.uploadBatch !== false, // Send to cloud when batch full
      cloudFunctionName: config.cloudFunctionName || 'mirasuit-analytics-api',
      useCloudFunction: config.useCloudFunction || false,
    };

    // M-15 Performance: defer storage reads to first method call (not on critical path)
    this._sessionReady = false;
    this._eventsReady = false;
  }

  // M-15: Lazy init — call storage reads only when first needed
  _ensureReady() {
    if (!this._sessionReady) {
      this._initSession();
      this._sessionReady = true;
    }
    if (!this._eventsReady) {
      this._loadPendingEvents();
      this._eventsReady = true;
    }
  }

  // ─── Session Management ──────────────────────────────────────────

  _initSession() {
    try {
      const existing = wx.getStorageSync(SESSION_KEY);
      const now = Date.now();

      if (existing && (now - existing.startedAt) < 30 * 60 * 1000) {
        // Session younger than 30 min — reuse
        this.session = existing;
        this.session.eventCount = (this.session.eventCount || 0);
      } else {
        // New session
        this.session = {
          id: `sess_${now}_${Math.random().toString(36).substr(2, 6)}`,
          startedAt: now,
          userAgent: 'WeChat-MiniProgram',
          firstSource: this._getEntrySource(),
        };
        wx.setStorageSync(SESSION_KEY, this.session);
      }
    } catch (e) {
      this.session = { id: `sess_${Date.now()}`, startedAt: Date.now() };
    }
  }

  _getEntrySource() {
    try {
      const app = getApp();
      return app?.globalData?.entrySource || 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  // ─── Event Tracking ─────────────────────────────────────────────

  /**
   * Track a funnel event
   * @param {string} stage - funnel stage key
   * @param {object} metadata - extra data
   */
  trackFunnel(stage, metadata = {}) {
    this._ensureReady(); // M-15: defer storage init to first event
    this._track('funnel', stage, {
      ...metadata,
      sessionDuration: Date.now() - this.session.startedAt,
    });
  }

  /**
   * Track API call result
   * @param {string} service - 'claude' | 'image' | 'video'
   * @param {boolean} success
   * @param {number} latencyMs
   * @param {string} errorType - optional error classification
   */
  trackAPI(service, success, latencyMs, errorType = null) {
    this._ensureReady(); // M-15: defer storage init to first event
    this._track('api', service, {
      success,
      latencyMs,
      errorType,
      timestamp: Date.now(),
    });
  }

  /**
   * Track page load time
   * @param {string} page - page name
   * @param {number} loadTimeMs
   */
  trackPageLoad(page, loadTimeMs) {
    this._ensureReady(); // M-15: defer storage init to first event
    this._track('performance', page, {
      loadTimeMs,
      timestamp: Date.now(),
    });
  }

  /**
   * Track user action
   * @param {string} action - action key
   * @param {object} metadata
   */
  trackAction(action, metadata = {}) {
    this._ensureReady(); // M-15: defer storage init to first event
    this._track('action', action, metadata);
  }

  // ─── Core Track ─────────────────────────────────────────────────

  _track(category, name, data = {}) {
    if (!this.config.enabled) return;

    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      category,
      name,
      data,
      sessionId: this.session.id,
      timestamp: Date.now(),
      page: this._getCurrentPage(),
    };

    this.pendingEvents.push(event);
    this.session.eventCount = (this.session.eventCount || 0) + 1;

    // Persist
    try {
      wx.setStorageSync(LOG_KEY, {
        events: this.pendingEvents.slice(-500), // Keep last 500
        session: this.session,
      });
    } catch (e) {
      // Storage full — drop oldest 50%
      this.pendingEvents = this.pendingEvents.slice(-Math.floor(this.pendingEvents.length / 2));
    }

    // Flush if batch full
    if (this.pendingEvents.length >= BATCH_SIZE) {
      this.flush();
    }
  }

  // ─── Funnel Metrics ────────────────────────────────────────────

  /**
   * Compute funnel conversion rates from stored events
   * @returns {object} funnel metrics
   */
  getFunnelMetrics() {
    this._ensureReady(); // M-15: defer storage init
    try {
      const events = this.pendingEvents;

      const counts = {
        home_view: 0,
        questionnaire_start: 0,
        questionnaire_resume: 0,
        questionnaire_complete: 0,
        results_view: 0,
        share_view: 0,
      };

      const stageOrder = ['home_view', 'questionnaire_start', 'questionnaire_resume', 'questionnaire_complete', 'results_view', 'share_view'];

      events.forEach(e => {
        if (e.category === 'funnel' && counts.hasOwnProperty(e.name)) {
          counts[e.name]++;
        }
      });

      const rates = {};
      const firstCount = counts[stageOrder[0]]; // home_view — denominator for all rates
      stageOrder.forEach((stage, i) => {
        if (i === 0) {
          rates[stage] = counts[stage] > 0 ? 1 : 0;
        } else {
          rates[stage] = firstCount > 0 ? (counts[stage] / firstCount) : 0;
        }
      });

      return { counts, rates, totalSessions: this.session ? 1 : 0 };
    } catch (e) {
      return { counts: {}, rates: {}, totalSessions: 0 };
    }
  }

  /**
   * Compute API success rates from stored events
   * @returns {object} API metrics
   */
  getAPIMetrics() {
    this._ensureReady(); // M-15: defer storage init
    try {
      const events = this.pendingEvents;

      const services = { claude: [], image: [], video: [] };
      events.forEach(e => {
        if (e.category === 'api' && services.hasOwnProperty(e.name)) {
          services[e.name].push(e.data);
        }
      });

      const result = {};
      Object.entries(services).forEach(([svc, calls]) => {
        if (calls.length === 0) {
          result[svc] = { count: 0, successRate: null, avgLatencyMs: null };
        } else {
          const successes = calls.filter(c => c.success).length;
          const latencies = calls.map(c => c.latencyMs || 0).filter(l => l > 0);
          result[svc] = {
            count: calls.length,
            successRate: successes / calls.length,
            avgLatencyMs: latencies.length > 0
              ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
              : null,
            errorBreakdown: this._errorBreakdown(calls.filter(c => !c.success)),
          };
        }
      });

      return result;
    } catch (e) {
      return {};
    }
  }

  _errorBreakdown(failedCalls) {
    const breakdown = {};
    failedCalls.forEach(c => {
      const key = c.errorType || 'unknown';
      breakdown[key] = (breakdown[key] || 0) + 1;
    });
    return breakdown;
  }

  // ─── Cloud Sync ─────────────────────────────────────────────────

  /**
   * Flush pending events to cloud (once cloud function deployed)
   */
  async flush() {
    this._ensureReady(); // M-15: defer storage init
    if (this.pendingEvents.length === 0) return;

    const eventsToSend = this.pendingEvents.slice();
    this.pendingEvents = [];

    if (!this.config.useCloudFunction) {
      // Pre-Alpha fallback: just keep local
      return;
    }

    try {
      const result = await wx.cloud.callFunction({
        name: this.config.cloudFunctionName,
        data: {
          action: 'batch_events',
          payload: {
            events: eventsToSend,
            session: this.session,
          },
        },
      });

      if (result?.errMsg?.includes('ok')) {
        // Successfully synced
      }
    } catch (e) {
      // Cloud unavailable — restore to pending
      this.pendingEvents = eventsToSend.concat(this.pendingEvents);
    }
  }

  // ─── Persistence ────────────────────────────────────────────────

  _loadPendingEvents() {
    try {
      const stored = wx.getStorageSync(LOG_KEY);
      if (stored?.events) {
        // Loaded from persistence
        this.pendingEvents = stored.events;
        if (stored.session) {
          this.session = stored.session;
        }
      } else {
        // No persisted data: start fresh
        this.pendingEvents = [];
      }
    } catch (e) {
      // Storage unavailable: keep in-memory events
      this.pendingEvents = [];
    }
  }

  // ─── Utilities ──────────────────────────────────────────────────

  _getCurrentPage() {
    try {
      const pages = getCurrentPages();
      return pages.length > 0 ? pages[pages.length - 1].route : 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  /**
   * Clear all analytics data (for testing / privacy)
   */
  clear() {
    this._ensureReady(); // M-15: ensure initialized before clearing
    this.pendingEvents = [];
    try {
      wx.removeStorageSync(LOG_KEY);
      wx.removeStorageSync(SESSION_KEY);
    } catch (e) {
      // ignore
    }
    this._initSession();
  }

  /**
   * Export all stored events (for debugging)
   */
  export() {
    this._ensureReady(); // M-15: ensure events loaded before export
    // Source of truth is always in-memory pendingEvents.
    // Storage is a persistence layer used for crash recovery and cross-session
    // continuity — export() returns live state, not stale storage reads.
    return {
      events: this.pendingEvents || [],
      session: this.session,
    };
  }
}

module.exports = Analytics;
