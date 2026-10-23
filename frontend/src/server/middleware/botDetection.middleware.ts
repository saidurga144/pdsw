import { NextRequest } from 'next/server';

interface RequestTimingRecord {
  timestamps: number[];
  uniquePaths: Set<string>;
}

declare global {
  // eslint-disable-next-line no-var
  var _botTrackingStore: Map<string, RequestTimingRecord> | undefined;
}

export class BotDetectionService {
  private static getStore(): Map<string, RequestTimingRecord> {
    if (!global._botTrackingStore) {
      global._botTrackingStore = new Map();
    }
    return global._botTrackingStore;
  }

  /**
   * Analyzes request velocity, interval variance, and unique path diversity to flag automated bots.
   */
  static evaluateBotBehavior(req: NextRequest, clientIp: string): {
    isBot: boolean;
    confidence: number; // 0 - 100
    reason?: string;
  } {
    const store = this.getStore();
    const now = Date.now();
    const pathname = req.nextUrl.pathname;
    let record = store.get(clientIp);

    if (!record) {
      record = {
        timestamps: [now],
        uniquePaths: new Set([pathname]),
      };
      store.set(clientIp, record);
      return { isBot: false, confidence: 0 };
    }

    // Retain sliding window of last 20 requests
    record.timestamps.push(now);
    if (record.timestamps.length > 20) {
      record.timestamps.shift();
    }
    record.uniquePaths.add(pathname);

    // If fewer than 5 requests, insufficient data
    if (record.timestamps.length < 5) {
      return { isBot: false, confidence: 10 };
    }

    // 1. Calculate average interval between consecutive requests
    let totalInterval = 0;
    for (let i = 1; i < record.timestamps.length; i++) {
      totalInterval += record.timestamps[i] - record.timestamps[i - 1];
    }
    const avgIntervalMs = totalInterval / (record.timestamps.length - 1);

    // 2. High velocity probe (< 80ms average interval = machine speed)
    if (avgIntervalMs < 80) {
      return {
        isBot: true,
        confidence: 95,
        reason: `Sub-human request interval detected (${Math.round(avgIntervalMs)}ms avg)`,
      };
    }

    // 3. Rapid directory crawling: > 12 unique paths requested in under 3 seconds
    const timeSpan = record.timestamps[record.timestamps.length - 1] - record.timestamps[0];
    if (timeSpan < 3000 && record.uniquePaths.size >= 12) {
      return {
        isBot: true,
        confidence: 90,
        reason: `High velocity unique endpoint enumeration (${record.uniquePaths.size} paths in ${timeSpan}ms)`,
      };
    }

    return { isBot: false, confidence: 15 };
  }
}
