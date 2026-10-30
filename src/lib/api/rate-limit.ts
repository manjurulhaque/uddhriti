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
  recalculate: { limit: 2, windowMs: 60_000 },
  quoteView: { limit: 60, windowMs: 60_000 },
  quoteShare: { limit: 30, windowMs: 60_000 },
  publicApi: { limit: 120, windowMs: 60_000 },
  randomQuote: { limit: 40, windowMs: 60_000 },
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

export function rateLimitResponse(result: RateLimitFailure, isHtml = false) {
  if (isHtml) {
    return new NextResponse(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Too Many Requests</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#faf9f5;color:#212529;"><div style="text-align:center;padding:2.5rem 2rem;max-width:480px;background:#fff;border-radius:1.25rem;border:1px solid rgba(0,0,0,0.08);box-shadow:0 12px 36px rgba(0,0,0,0.06);"><span style="display:inline-block;padding:0.25rem 0.75rem;border-radius:9999px;background:#fee2e2;color:#991b1b;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:1rem;">Rate Limited</span><h1 style="margin:0 0 0.75rem;font-size:1.5rem;font-weight:700;">Too Many Requests</h1><p style="color:#666;font-size:0.95rem;line-height:1.6;margin:0 0 1.5rem;">You are exploring random quotations too quickly. Please wait ${result.retryAfter} seconds before trying again.</p><a href="/quotes" style="display:inline-block;padding:0.65rem 1.25rem;border-radius:9999px;background:#212529;color:#faf9f5;font-size:0.875rem;font-weight:600;text-decoration:none;">Browse All Quotations</a></div></body></html>`,
      {
        status: 429,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Retry-After": String(result.retryAfter),
        },
      }
    )
  }

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
    const accept = request.headers.get("accept") || ""
    const isHtml = accept.includes("text/html")
    return rateLimitResponse(result, isHtml)
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
