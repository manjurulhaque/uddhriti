import { NextResponse } from "next/server"

type RateLimitConfig = {
  limit: number
  windowMs: number
}

type RateLimitSuccess = { ok: true }
type RateLimitFailure = { ok: false; retryAfter: number }
type RateLimitResult = RateLimitSuccess | RateLimitFailure

const buckets = new Map<string, { count: number; resetAt: number }>()

export const RATE_LIMITS = {
  import: { limit: 5, windowMs: 60_000 },
  bulk: { limit: 10, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
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

export function enforceAdminRateLimit(adminId: string, profile: keyof typeof RATE_LIMITS) {
  const result = rateLimit(`${profile}:${adminId}`, RATE_LIMITS[profile])
  if (!result.ok) {
    return rateLimitResponse(result)
  }

  return null
}
