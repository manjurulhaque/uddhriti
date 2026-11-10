import { NextResponse } from "next/server"

export type RateLimitConfig = {
  limit: number
  windowMs: number
}

export type RateLimitSuccess = { ok: true }
export type RateLimitFailure = { ok: false; retryAfter: number }
export type RateLimitResult = RateLimitSuccess | RateLimitFailure

export interface RateLimitStore {
  limit(key: string, config: RateLimitConfig): Promise<RateLimitResult> | RateLimitResult
  limitSync?(key: string, config: RateLimitConfig): RateLimitResult
  reset?(): Promise<void> | void
}

export const RATE_LIMITS = {
  import: { limit: 5, windowMs: 60_000 },
  bulk: { limit: 10, windowMs: 60_000 },
  recalculate: { limit: 2, windowMs: 60_000 },
  diagnostics: { limit: 30, windowMs: 60_000 },
  adminMutation: { limit: 60, windowMs: 60_000 },
  quoteView: { limit: 60, windowMs: 60_000 },
  quoteShare: { limit: 30, windowMs: 60_000 },
  publicApi: { limit: 120, windowMs: 60_000 },
  randomQuote: { limit: 40, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>

export type RateLimitProfile = keyof typeof RATE_LIMITS

/**
 * In-memory sliding window bucket rate limit store with auto-cleanup.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>()

  private cleanupExpiredBuckets(now: number) {
    if (this.buckets.size > 2000) {
      for (const [key, bucket] of this.buckets.entries()) {
        if (now >= bucket.resetAt) {
          this.buckets.delete(key)
        }
      }
    }
  }

  limitSync(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now()
    this.cleanupExpiredBuckets(now)

    const bucket = this.buckets.get(key)
    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + config.windowMs })
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

  limit(key: string, config: RateLimitConfig): RateLimitResult {
    return this.limitSync(key, config)
  }

  reset(): void {
    this.buckets.clear()
  }

  get size(): number {
    return this.buckets.size
  }
}

export interface UpstashRateLimitOptions {
  url?: string
  token?: string
  prefix?: string
  timeoutMs?: number
  fallbackStore?: RateLimitStore
  fetchFn?: typeof fetch
}

const UPSTASH_SLIDING_WINDOW_LUA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {c, ttl}
`.trim()

/**
 * Distributed rate limit store powered by Upstash Redis REST API.
 * Uses atomic Lua sliding window script and automatically falls back to in-memory
 * store if external Redis is unreachable, misconfigured, or times out.
 */
export class UpstashRestRateLimitStore implements RateLimitStore {
  private url: string
  private token: string
  private prefix: string
  private timeoutMs: number
  private fallbackStore: RateLimitStore
  private fetchFn: typeof fetch

  constructor(options: UpstashRateLimitOptions = {}) {
    let rawUrl = (
      options.url ||
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_URL ||
      ""
    ).trim()
    if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
      rawUrl = `https://${rawUrl}`
    }
    this.url = rawUrl.replace(/\/+$/, "")
    this.token = (
      options.token ||
      process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.KV_REST_API_TOKEN ||
      ""
    ).trim()
    this.prefix = options.prefix || "rl"
    this.timeoutMs = options.timeoutMs ?? 1000
    this.fallbackStore = options.fallbackStore || defaultMemoryStore
    this.fetchFn = options.fetchFn || globalThis.fetch
  }

  isConfigured(): boolean {
    return Boolean(this.url && this.token)
  }

  async limit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    if (!this.isConfigured()) {
      return this.fallbackStore.limit(key, config)
    }

    const redisKey = `${this.prefix}:${key}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await this.fetchFn(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          "EVAL",
          UPSTASH_SLIDING_WINDOW_LUA,
          1,
          redisKey,
          String(config.windowMs),
        ]),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Upstash returned HTTP ${response.status}`)
      }

      const data = (await response.json()) as {
        result?: [number | string, number | string]
        error?: string
      }

      if (data.error || !Array.isArray(data.result)) {
        throw new Error(data.error || "Unexpected response structure from Upstash REST")
      }

      const count = Number(data.result[0])
      const ttlMs = Math.max(1, Number(data.result[1]))

      if (count > config.limit) {
        return {
          ok: false,
          retryAfter: Math.max(1, Math.ceil(ttlMs / 1000)),
        }
      }

      return { ok: true }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[RateLimit] Upstash REST failed, falling back to local memory store:", error)
      }
      return this.fallbackStore.limit(key, config)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  limitSync(key: string, config: RateLimitConfig): RateLimitResult {
    if (typeof this.fallbackStore.limitSync === "function") {
      return this.fallbackStore.limitSync(key, config)
    }
    return defaultMemoryStore.limitSync(key, config)
  }

  async reset(): Promise<void> {
    if (this.fallbackStore.reset) {
      await this.fallbackStore.reset()
    }
  }
}

// ── Store Registry & Singletons ──────────────────────────────────────────────

const defaultMemoryStore = new MemoryRateLimitStore()
let activeStore: RateLimitStore | null = null

export function getRateLimitStore(): RateLimitStore {
  if (activeStore) return activeStore

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

  if (url && token) {
    activeStore = new UpstashRestRateLimitStore({
      url,
      token,
      fallbackStore: defaultMemoryStore,
    })
    return activeStore
  }

  return defaultMemoryStore
}

export function setRateLimitStore(store: RateLimitStore | null): void {
  activeStore = store
}

export function resetRateLimitStore(): void {
  activeStore = null
  defaultMemoryStore.reset()
}

// ── Rate Limiting APIs ───────────────────────────────────────────────────────

/**
 * Synchronous in-memory rate limit check for immediate response paths.
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const store = getRateLimitStore()
  if (typeof store.limitSync === "function") {
    return store.limitSync(key, config)
  }
  return defaultMemoryStore.limitSync(key, config)
}

/**
 * Asynchronous distributed rate limit check supporting Upstash Redis / KV across
 * serverless instances, with automatic local fallback.
 */
export async function rateLimitAsync(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const store = getRateLimitStore()
  try {
    return await store.limit(key, config)
  } catch {
    return defaultMemoryStore.limitSync(key, config)
  }
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

function extractHeader(
  requestOrHeaders: Request | Headers | { headers: Headers } | unknown,
  name: string
): string | null {
  if (!requestOrHeaders || typeof requestOrHeaders !== "object") {
    return null
  }

  // 1. Direct Headers object, Next.js ReadonlyHeaders, or custom header instance (has .get() method)
  if ("get" in requestOrHeaders && typeof (requestOrHeaders as { get: unknown }).get === "function") {
    return (requestOrHeaders as { get: (headerName: string) => string | null }).get(name)
  }

  // 2. Request object or wrapper object with .headers property
  if ("headers" in requestOrHeaders && requestOrHeaders.headers && typeof requestOrHeaders.headers === "object") {
    const inner = requestOrHeaders.headers
    if ("get" in inner && typeof (inner as { get: unknown }).get === "function") {
      return (inner as { get: (headerName: string) => string | null }).get(name)
    }
    const direct = (inner as Record<string, unknown>)[name.toLowerCase()]
    if (typeof direct === "string") return direct
  }

  // 3. Fallback for plain header dictionary
  const direct = (requestOrHeaders as Record<string, unknown>)[name.toLowerCase()]
  if (typeof direct === "string") return direct

  return null
}

export function getClientIp(
  requestOrHeaders: Request | Headers | { headers: Headers } | Record<string, unknown>
): string {
  const cfIp = extractHeader(requestOrHeaders, "cf-connecting-ip")
  if (cfIp) return cfIp.trim()

  const trueClientIp = extractHeader(requestOrHeaders, "true-client-ip")
  if (trueClientIp) return trueClientIp.trim()

  const xRealIp = extractHeader(requestOrHeaders, "x-real-ip")
  if (xRealIp) return xRealIp.trim()

  const xForwardedFor = extractHeader(requestOrHeaders, "x-forwarded-for")
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0]?.trim()
    if (first) return first
  }

  return "127.0.0.1"
}

export function enforceIpRateLimit(
  request: Request,
  profile: RateLimitProfile,
  extraKey = ""
): NextResponse | null {
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

export async function enforceIpRateLimitAsync(
  request: Request,
  profile: RateLimitProfile,
  extraKey = ""
): Promise<NextResponse | null> {
  const ip = getClientIp(request)
  const key = `${profile}:${ip}${extraKey ? `:${extraKey}` : ""}`
  const result = await rateLimitAsync(key, RATE_LIMITS[profile])
  if (!result.ok) {
    const accept = request.headers.get("accept") || ""
    const isHtml = accept.includes("text/html")
    return rateLimitResponse(result, isHtml)
  }

  return null
}

export function enforceAdminRateLimit(
  adminId: string,
  profile: RateLimitProfile
): NextResponse | null {
  const result = rateLimit(`${profile}:${adminId}`, RATE_LIMITS[profile])
  if (!result.ok) {
    return rateLimitResponse(result)
  }

  return null
}

export async function enforceAdminRateLimitAsync(
  adminId: string,
  profile: RateLimitProfile
): Promise<NextResponse | null> {
  const result = await rateLimitAsync(`${profile}:${adminId}`, RATE_LIMITS[profile])
  if (!result.ok) {
    return rateLimitResponse(result)
  }

  return null
}
