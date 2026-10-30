import { NextResponse } from "next/server"

type RateLimitConfig = {
  limit: number
  windowMs: number
}

type RateLimitSuccess = { ok: true }
type RateLimitFailure = { ok: false; retryAfter: number }
type RateLimitResult = RateLimitSuccess | RateLimitFailure

const buckets = new Map<string, { count: number; resetAt: number }>()

// Periodic garbage collection for expired buckets to prevent memory leaks
function cleanupExpiredBuckets(now: number) {
  if (buckets.size > 2000) {
    for (const [key, bucket] of buckets.entries()) {
      if (now >= bucket.resetAt) {
        buckets.delete(key)
      }
    }
  }
}

export const RATE_LIMITS = {
  import: { limit: 5, windowMs: 60_000 },
  bulk: { limit: 10, windowMs: 60_000 },
  quoteView: { limit: 60, windowMs: 60_000 },
  quoteShare: { limit: 30, windowMs: 60_000 },
  publicApi: { limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  cleanupExpiredBuckets(now)

  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs })
    return { ok: true }
  }

  if (bucket.count >= config.limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  bucket.count += 1
  return { ok: true }
}

export function rateLimitResponse(result: RateLimitFailure) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfter },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
      },
    }
  )
}

export function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp.trim()

  const trueClientIp = request.headers.get("true-client-ip")
  if (trueClientIp) return trueClientIp.trim()

  const xRealIp = request.headers.get("x-real-ip")
  if (xRealIp) return xRealIp.trim()

  const xForwardedFor = request.headers.get("x-forwarded-for")
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0]?.trim()
    if (first) return first
  }

  return "127.0.0.1"
}

export function enforceIpRateLimit(
  request: Request,
  profile: keyof typeof RATE_LIMITS,
  extraKey = ""
) {
  const ip = getClientIp(request)
  const key = `${profile}:${ip}${extraKey ? `:${extraKey}` : ""}`
  const result = rateLimit(key, RATE_LIMITS[profile])
  if (!result.ok) {
    return rateLimitResponse(result)
  }

  return null
}

export function enforceAdminRateLimit(adminId: string, profile: keyof typeof RATE_LIMITS) {
  const result = rateLimit(`${profile}:${adminId}`, RATE_LIMITS[profile])
  if (!result.ok) {
    return rateLimitResponse(result)
  }

  return null
}
