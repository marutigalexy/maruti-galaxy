export const RATE_LIMIT_MESSAGE = "Too many requests. Try again later.";

export const LOGIN_RATE_LIMIT = {
  limit: 10,
  windowMs: 15 * 60 * 1000,
} as const;

export const EXPORT_RATE_LIMIT = {
  limit: 20,
  windowMs: 15 * 60 * 1000,
} as const;

export type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitStore = Map<string, RateLimitBucket>;

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
};

const store: RateLimitStore = new Map();

export function clientIpFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return headerList.get("x-real-ip")?.trim() || "local";
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
  buckets: RateLimitStore = store,
): RateLimitResult {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: Math.ceil(windowMs / 1000) };
  }
  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { allowed: true, retryAfterSec: Math.ceil((current.resetAt - now) / 1000) };
}

export function consumeLoginRateLimit(ip: string, now = Date.now()): RateLimitResult {
  return consumeRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT.limit, LOGIN_RATE_LIMIT.windowMs, now);
}

export function consumeExportRateLimit(ip: string, now = Date.now()): RateLimitResult {
  return consumeRateLimit(`export:${ip}`, EXPORT_RATE_LIMIT.limit, EXPORT_RATE_LIMIT.windowMs, now);
}
