export type RateLimitResult = {
  allowed: boolean;
  configured: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  reason?: 'misconfigured' | 'backend-error' | 'limit-exceeded';
};

const isProduction = () => process.env.NODE_ENV === 'production';

export function getClientIp(req: Request): string {
  const cfIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

async function hashIdentifier(value: string): Promise<string> {
  const salt = process.env.RATE_LIMIT_SALT || 'rti-rate-limit-v1';
  const bytes = new TextEncoder().encode(`${salt}:${value}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

export async function enforceRateLimit(
  req: Request,
  options: { bucket: string; limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return {
      allowed: !isProduction(),
      configured: false,
      limit: options.limit,
      remaining: isProduction() ? 0 : options.limit,
      resetSeconds: options.windowSeconds,
      reason: isProduction() ? 'misconfigured' : undefined,
    };
  }

  try {
    const clientHash = await hashIdentifier(getClientIp(req));
    const key = `rti:ratelimit:${options.bucket}:${clientHash}`;
    const script =
      "local current=redis.call('INCR',KEYS[1]); " +
      "if current==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; " +
      "local ttl=redis.call('TTL',KEYS[1]); return {current,ttl}";

    const response = await fetch(redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        'EVAL',
        script,
        '1',
        key,
        String(options.windowSeconds),
      ]),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Rate-limit backend returned HTTP ${response.status}`);
    }

    const payload = await response.json().catch(() => null);
    const current = Number(payload?.result?.[0]);
    const ttl = Number(payload?.result?.[1]);

    if (!Number.isFinite(current)) {
      throw new Error('Invalid rate-limit backend response');
    }

    const remaining = Math.max(0, options.limit - current);
    const allowed = current <= options.limit;

    return {
      allowed,
      configured: true,
      limit: options.limit,
      remaining,
      resetSeconds:
        Number.isFinite(ttl) && ttl > 0 ? ttl : options.windowSeconds,
      reason: allowed ? undefined : 'limit-exceeded',
    };
  } catch (error) {
    console.error(
      'Rate-limit check failed:',
      error instanceof Error ? error.message : String(error),
    );

    return {
      allowed: !isProduction(),
      configured: true,
      limit: options.limit,
      remaining: 0,
      resetSeconds: options.windowSeconds,
      reason: isProduction() ? 'backend-error' : undefined,
    };
  }
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'Retry-After': result.allowed ? '0' : String(Math.max(result.resetSeconds, 1)),
  };
}

export async function verifyTurnstile(
  req: Request,
  token: unknown,
): Promise<{ success: boolean; configured: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return {
      success: !isProduction(),
      configured: false,
      error: isProduction()
        ? 'Bot protection is not configured.'
        : undefined,
    };
  }

  if (typeof token !== 'string' || !token.trim()) {
    return {
      success: false,
      configured: true,
      error: 'Turnstile verification token is required.',
    };
  }

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
  });

  const remoteIp = getClientIp(req);
  if (remoteIp !== 'unknown') body.set('remoteip', remoteIp);

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      return {
        success: false,
        configured: true,
        error: 'Turnstile verification service is unavailable.',
      };
    }

    const payload = await response.json().catch(() => null);
    return {
      success: payload?.success === true,
      configured: true,
      error:
        payload?.success === true
          ? undefined
          : 'Bot verification failed. Please retry.',
    };
  } catch {
    return {
      success: false,
      configured: true,
      error: 'Turnstile verification service is unavailable.',
    };
  }
}
