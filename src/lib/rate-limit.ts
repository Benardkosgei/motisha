/**
 * lib/rate-limit.ts
 *
 * Simple in-process sliding-window rate limiter.
 * Works in Next.js serverless/edge environments without Redis.
 * Each Next.js worker process has its own map — good enough for
 * preventing spam bursts; not a distributed limiter.
 *
 * Usage:
 *   const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60_000 });
 *   if (!limiter.check(ip)) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 *   }
 */

interface Entry {
  timestamps: number[];
}

export interface RateLimiter {
  /** Returns true if the request is allowed, false if rate-limited. */
  check(key: string): boolean;
}

export function createRateLimiter(options: {
  maxRequests: number;
  windowMs: number;
}): RateLimiter {
  const { maxRequests, windowMs } = options;
  const store = new Map<string, Entry>();

  // Periodically clean up stale entries to prevent memory leaks
  // (every 10 minutes, prune keys with no recent activity)
  if (typeof setInterval !== 'undefined') {
    setInterval(() => {
      const cutoff = Date.now() - windowMs;
      for (const [key, entry] of store.entries()) {
        const recent = entry.timestamps.filter(t => t > cutoff);
        if (recent.length === 0) {
          store.delete(key);
        } else {
          entry.timestamps = recent;
        }
      }
    }, 10 * 60 * 1000).unref?.();
  }

  return {
    check(key: string): boolean {
      const now = Date.now();
      const cutoff = now - windowMs;
      const entry = store.get(key) ?? { timestamps: [] };

      // Remove expired timestamps
      entry.timestamps = entry.timestamps.filter(t => t > cutoff);

      if (entry.timestamps.length >= maxRequests) {
        store.set(key, entry);
        return false; // rate limited
      }

      entry.timestamps.push(now);
      store.set(key, entry);
      return true; // allowed
    },
  };
}

// ─── Pre-built limiters ───────────────────────────────────────────────────────

/** 5 bookings per 10 minutes per IP */
export const bookingsLimiter = createRateLimiter({ maxRequests: 5, windowMs: 10 * 60_000 });

/** 1 welcome email per 5 minutes per IP */
export const welcomeEmailLimiter = createRateLimiter({ maxRequests: 1, windowMs: 5 * 60_000 });

/** 1 subscription-confirmed email per 5 minutes per IP */
export const subscriptionEmailLimiter = createRateLimiter({ maxRequests: 1, windowMs: 5 * 60_000 });

/**
 * Extract the best available IP from Next.js request headers.
 * Falls back to 'unknown' if none found.
 */
export function getClientIp(request: { headers: { get(name: string): string | null } }): string {
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
