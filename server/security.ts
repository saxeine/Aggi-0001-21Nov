/**
 * Security headers + in-memory per-IP rate limiting.
 *
 * Rate limiting is intentionally simple: a fixed-window counter per IP per
 * route group, kept in process memory. It is a guard-rail against runaway
 * clients, not a replacement for upstream provider quotas.
 */
import type { Request, Response, NextFunction } from 'express';

export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.removeHeader('X-Powered-By');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
}

interface WindowCounter {
  windowStart: number;
  count: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  /** Message/code for the JSON error body. */
  message?: string;
}

/**
 * Fixed-window rate limiter keyed by client IP. In-memory; resets with the
 * process. `max` requests per windowMs per key are allowed; the rest get 429.
 */
export function rateLimiter({ windowMs, max, message = 'Too many requests' }: RateLimitOptions) {
  const counters = new Map<string, WindowCounter>();
  let lastSweep = Date.now();

  // Periodically drop stale counters so the map does not grow forever.
  const sweep = () => {
    const now = Date.now();
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const [key, entry] of counters) {
      if (now - entry.windowStart >= windowMs) counters.delete(key);
    }
  };

  return (req: Request, res: Response, next: NextFunction) => {
    sweep();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = counters.get(key);
    if (!entry || now - entry.windowStart >= windowMs) {
      entry = { windowStart: now, count: 0 };
      counters.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({ error: message, retryAfter: retryAfterSec });
      return;
    }
    next();
  };
}
