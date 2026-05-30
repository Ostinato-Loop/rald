// RALD Rate Limiting — Cloudflare KV-backed sliding window
// Falls back to no-op when KV is unavailable (dev mode).
// LILCKY STUDIO LIMITED

export interface RateLimitConfig {
  key: string;           // e.g. "otp:send:+234801..."
  limit: number;         // max requests
  windowSeconds: number; // window size in seconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;       // unix seconds
}

// KV interface — Cloudflare KV binding
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/**
 * Sliding-window rate limiter using Cloudflare KV.
 * Stores a JSON array of timestamps for the given key.
 */
export async function checkRateLimit(
  kv: KVNamespace | undefined,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (!kv) {
    // No KV configured — allow all in dev mode
    return { allowed: true, remaining: config.limit, resetAt: Math.floor(Date.now() / 1000) + config.windowSeconds };
  }

  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSeconds;
  const kvKey = `rl:${config.key}`;

  let timestamps: number[] = [];
  try {
    const raw = await kv.get(kvKey);
    if (raw) timestamps = JSON.parse(raw) as number[];
  } catch { /* corrupt entry */ }

  // Slide the window — drop timestamps older than the window
  timestamps = timestamps.filter((t) => t > windowStart);

  const allowed = timestamps.length < config.limit;
  const remaining = Math.max(0, config.limit - timestamps.length - (allowed ? 1 : 0));
  const resetAt = timestamps.length > 0 ? timestamps[0]! + config.windowSeconds : now + config.windowSeconds;

  if (allowed) {
    timestamps.push(now);
    try {
      await kv.put(kvKey, JSON.stringify(timestamps), { expirationTtl: config.windowSeconds + 60 });
    } catch { /* KV write failure is non-fatal */ }
  }

  return { allowed, remaining, resetAt };
}

// ── Preset configs ────────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  // OTP send: 5 per 10 minutes per identifier
  otpSend: (identifier: string): RateLimitConfig => ({
    key: `otp:send:${identifier}`,
    limit: 5,
    windowSeconds: 600,
  }),
  // Login attempts: 10 per 15 minutes per IP
  login: (ip: string): RateLimitConfig => ({
    key: `login:${ip}`,
    limit: 10,
    windowSeconds: 900,
  }),
  // Register: 5 per hour per IP
  register: (ip: string): RateLimitConfig => ({
    key: `register:${ip}`,
    limit: 5,
    windowSeconds: 3600,
  }),
  // Password reset: 3 per 15 minutes per email
  passwordReset: (email: string): RateLimitConfig => ({
    key: `pwd_reset:${email}`,
    limit: 3,
    windowSeconds: 900,
  }),
  // API: 1000 per minute per API key
  api: (keyPrefix: string): RateLimitConfig => ({
    key: `api:${keyPrefix}`,
    limit: 1000,
    windowSeconds: 60,
  }),
} as const;

export function getClientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
