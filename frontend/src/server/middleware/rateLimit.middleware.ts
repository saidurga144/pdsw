import { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  firstRequestTime: number;
  lastRequestTime: number;
  consecutive404s: number;
  blockedUntil?: number;
}

// Global runtime rate limit stores
declare global {
  // eslint-disable-next-line no-var
  var _ipRateLimitStore: Map<string, RateLimitRecord> | undefined;
  // eslint-disable-next-line no-var
  var _accountRateLimitStore: Map<string, RateLimitRecord> | undefined;
}

export interface RateLimitOptions {
  windowMs: number; // e.g. 60,000 for 1 min
  maxRequests: number; // e.g. 120
  blockDurationMs?: number; // e.g. 15 * 60 * 1000 (15 min)
}

export class RateLimiter {
  private static getIpStore(): Map<string, RateLimitRecord> {
    if (!global._ipRateLimitStore) {
      global._ipRateLimitStore = new Map();
    }
    return global._ipRateLimitStore;
  }

  private static getAccountStore(): Map<string, RateLimitRecord> {
    if (!global._accountRateLimitStore) {
      global._accountRateLimitStore = new Map();
    }
    return global._accountRateLimitStore;
  }

  /**
   * Checks whether an IP or identifier is currently blocked
   */
  static isBlocked(identifier: string): { blocked: boolean; remainingSeconds?: number } {
    // In local development, permit loopback testing unless explicitly testing block response
    if (process.env.NODE_ENV === 'development' && (identifier === '127.0.0.1' || identifier === '::1' || identifier === 'localhost')) {
      return { blocked: false };
    }

    const store = this.getIpStore();
    const record = store.get(identifier);
    if (!record || !record.blockedUntil) {
      return { blocked: false };
    }

    const now = Date.now();
    if (now < record.blockedUntil) {
      const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
      return { blocked: true, remainingSeconds };
    }

    // Block has expired, clear block
    record.blockedUntil = undefined;
    record.count = 0;
    record.consecutive404s = 0;
    return { blocked: false };
  }

  /**
   * Unblocks an IP address (used for admin unblocking or test reset)
   */
  static unblockIp(identifier: string): void {
    const store = this.getIpStore();
    store.delete(identifier);
  }

  /**
   * Evaluates rate limiting for an identifier (IP address or Account Email)
   */
  static checkRateLimit(
    identifier: string,
    options: RateLimitOptions = { windowMs: 60000, maxRequests: 120, blockDurationMs: 900000 }
  ): {
    allowed: boolean;
    currentCount: number;
    remaining: number;
    resetTimeMs: number;
    blocked: boolean;
    retryAfterSeconds?: number;
  } {
    const store = this.getIpStore();
    const now = Date.now();
    let record = store.get(identifier);

    // 1. Check if currently blocked
    if (record?.blockedUntil && now < record.blockedUntil) {
      const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
      return {
        allowed: false,
        currentCount: record.count,
        remaining: 0,
        resetTimeMs: record.blockedUntil,
        blocked: true,
        retryAfterSeconds,
      };
    }

    // 2. Initialize or slide window
    if (!record || now - record.firstRequestTime > options.windowMs) {
      record = {
        count: 1,
        firstRequestTime: now,
        lastRequestTime: now,
        consecutive404s: record?.consecutive404s || 0,
      };
      store.set(identifier, record);
      return {
        allowed: true,
        currentCount: 1,
        remaining: options.maxRequests - 1,
        resetTimeMs: now + options.windowMs,
        blocked: false,
      };
    }

    // 3. Increment request count within current window
    record.count += 1;
    record.lastRequestTime = now;

    if (record.count > options.maxRequests) {
      const blockDuration = options.blockDurationMs || 300000; // 5 mins default
      record.blockedUntil = now + blockDuration;
      const retryAfterSeconds = Math.ceil(blockDuration / 1000);
      return {
        allowed: false,
        currentCount: record.count,
        remaining: 0,
        resetTimeMs: record.blockedUntil,
        blocked: true,
        retryAfterSeconds,
      };
    }

    const resetTimeMs = record.firstRequestTime + options.windowMs;
    const remaining = Math.max(0, options.maxRequests - record.count);

    return {
      allowed: true,
      currentCount: record.count,
      remaining,
      resetTimeMs,
      blocked: false,
    };
  }

  /**
   * Tracks 404 / Invalid Endpoint anomalies. If consecutive 404s exceed threshold, temporarily blocks IP.
   */
  static record404Anomaly(
    ip: string,
    threshold: number = 15,
    blockDurationMs: number = 900000 // 15 mins
  ): { shouldBlock: boolean; consecutive404s: number } {
    const store = this.getIpStore();
    const now = Date.now();
    let record = store.get(ip);

    if (!record) {
      record = {
        count: 1,
        firstRequestTime: now,
        lastRequestTime: now,
        consecutive404s: 1,
      };
      store.set(ip, record);
      return { shouldBlock: false, consecutive404s: 1 };
    }

    record.consecutive404s += 1;
    record.lastRequestTime = now;

    if (record.consecutive404s >= threshold) {
      record.blockedUntil = now + blockDurationMs;
      return { shouldBlock: true, consecutive404s: record.consecutive404s };
    }

    return { shouldBlock: false, consecutive404s: record.consecutive404s };
  }

  /**
   * Manually blocks an IP for a given duration (used by automated WAF triggers)
   */
  static blockIp(ip: string, durationMs: number = 900000, reason: string = 'WAF_TRIGGER'): void {
    const store = this.getIpStore();
    const now = Date.now();
    const existing = store.get(ip) || { count: 0, firstRequestTime: now, lastRequestTime: now, consecutive404s: 0 };
    existing.blockedUntil = now + durationMs;
    store.set(ip, existing);
  }
}
