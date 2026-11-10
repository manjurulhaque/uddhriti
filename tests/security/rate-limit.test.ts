import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  getClientIp,
  rateLimit,
  rateLimitAsync,
  RATE_LIMITS,
  enforceAdminRateLimit,
  enforceAdminRateLimitAsync,
  enforceIpRateLimit,
  enforceIpRateLimitAsync,
  MemoryRateLimitStore,
  UpstashRestRateLimitStore,
  getRateLimitStore,
  setRateLimitStore,
  resetRateLimitStore,
} from "../../src/lib/api/rate-limit"

describe("Security: getClientIp", () => {
  it("prioritizes Cloudflare cf-connecting-ip header", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.195",
      "x-forwarded-for": "198.51.100.1, 10.0.0.1",
    })
    assert.equal(getClientIp(headers), "203.0.113.195")
  })

  it("extracts client IP from x-forwarded-for first hop", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.42, 10.0.0.2",
    })
    assert.equal(getClientIp(headers), "198.51.100.42")
  })

  it("falls back to x-real-ip when proxy headers are absent", () => {
    const headers = new Headers({
      "x-real-ip": "192.0.2.1",
    })
    assert.equal(getClientIp(headers), "192.0.2.1")
  })

  it("defaults to 127.0.0.1 for local or headerless requests", () => {
    const headers = new Headers()
    assert.equal(getClientIp(headers), "127.0.0.1")
  })

  it("handles Next.js ReadonlyHeaders (which has both .get() and an internal .headers proxy)", () => {
    // Simulates Next.js HeadersAdapter / ReadonlyHeaders structure
    const mockNextHeaders = {
      headers: { "cf-connecting-ip": "198.51.100.99" }, // Note: no .get() on .headers
      get: (name: string) => (name.toLowerCase() === "cf-connecting-ip" ? "198.51.100.99" : null),
    } as unknown as Headers
    assert.equal(getClientIp(mockNextHeaders), "198.51.100.99")
  })

  it("extracts IP from Request object with .headers property", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "198.51.100.55" },
    })
    assert.equal(getClientIp(req), "198.51.100.55")
  })
})

describe("Security: rateLimit sliding window", () => {
  it("allows requests under the configured threshold", () => {
    const key = `test-user-${Date.now()}`
    const config = { limit: 3, windowMs: 10_000 }

    const res1 = rateLimit(key, config)
    const res2 = rateLimit(key, config)
    const res3 = rateLimit(key, config)

    assert.equal(res1.ok, true)
    assert.equal(res2.ok, true)
    assert.equal(res3.ok, true)
  })

  it("blocks requests that exceed the limit and returns retryAfter", () => {
    const key = `test-blocked-${Date.now()}`
    const config = { limit: 2, windowMs: 5_000 }

    rateLimit(key, config)
    rateLimit(key, config)
    const resBlocked = rateLimit(key, config)

    assert.equal(resBlocked.ok, false)
    if (!resBlocked.ok) {
      assert.ok(resBlocked.retryAfter > 0)
      assert.ok(resBlocked.retryAfter <= 5)
    }
  })

  it("verifies RATE_LIMITS profiles are configured strictly", () => {
    assert.equal(RATE_LIMITS.randomQuote.limit, 40)
    assert.equal(RATE_LIMITS.recalculate.limit, 2)
    assert.equal(RATE_LIMITS.publicApi.limit, 120)
    assert.equal(RATE_LIMITS.quoteView.limit, 60)
    assert.equal(RATE_LIMITS.adminMutation.limit, 60)
    assert.equal(RATE_LIMITS.diagnostics.limit, 30)
  })
})

describe("Security: enforceAdminRateLimit", () => {
  it("allows requests under the profile limit", () => {
    const adminId = `admin-allowed-${Date.now()}`
    const result = enforceAdminRateLimit(adminId, "recalculate")
    assert.equal(result, null)
  })

  it("returns 429 response with Retry-After header when limit exceeded", async () => {
    const adminId = `admin-exceeded-${Date.now()}`
    // Profile "recalculate" has limit = 2
    assert.equal(enforceAdminRateLimit(adminId, "recalculate"), null)
    assert.equal(enforceAdminRateLimit(adminId, "recalculate"), null)

    const response = enforceAdminRateLimit(adminId, "recalculate")
    assert.ok(response !== null)
    assert.equal(response.status, 429)

    const retryAfter = response.headers.get("Retry-After")
    assert.ok(retryAfter !== null)
    assert.ok(Number(retryAfter) > 0)

    const body = await response.json()
    assert.equal(body.error, "Too many requests")
    assert.ok(typeof body.retryAfter === "number")
  })

  it("isolates rate limits between different administrators", () => {
    const adminA = `admin-a-${Date.now()}`
    const adminB = `admin-b-${Date.now()}`

    // Exhaust adminA's quota
    enforceAdminRateLimit(adminA, "recalculate")
    enforceAdminRateLimit(adminA, "recalculate")
    const blockedA = enforceAdminRateLimit(adminA, "recalculate")
    assert.ok(blockedA !== null)
    assert.equal(blockedA.status, 429)

    // adminB should still be unaffected
    const allowedB = enforceAdminRateLimit(adminB, "recalculate")
    assert.equal(allowedB, null)
  })

  it("isolates rate limits across different profiles for the same administrator", () => {
    const adminId = `admin-multi-profile-${Date.now()}`

    // Exhaust quota for "recalculate" (limit 2)
    enforceAdminRateLimit(adminId, "recalculate")
    enforceAdminRateLimit(adminId, "recalculate")
    const blockedRecalculate = enforceAdminRateLimit(adminId, "recalculate")
    assert.ok(blockedRecalculate !== null)

    // adminMutation profile should still be unblocked
    const allowedMutation = enforceAdminRateLimit(adminId, "adminMutation")
    assert.equal(allowedMutation, null)
  })
})

describe("Security: enforceIpRateLimit", () => {
  it("allows legitimate requests under threshold", () => {
    const req = new Request("https://example.com/api/search?q=test", {
      headers: { "x-real-ip": `198.51.100.${Math.floor(Math.random() * 200 + 10)}` },
    })
    const response = enforceIpRateLimit(req, "publicApi")
    assert.equal(response, null)
  })

  it("returns HTML 429 page when Accept includes text/html", async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 200 + 10)}`
    // Use an extra key to exhaust quota quickly without polluting global namespace
    const testKey = `html-test-${Date.now()}`

    // Profile recalculate has limit = 2
    for (let i = 0; i < RATE_LIMITS.recalculate.limit; i++) {
      const req = new Request("https://example.com/quotes/random", {
        headers: { "x-real-ip": ip, accept: "text/html" },
      })
      enforceIpRateLimit(req, "recalculate", testKey)
    }

    const blockedReq = new Request("https://example.com/quotes/random", {
      headers: { "x-real-ip": ip, accept: "text/html,application/xhtml+xml" },
    })
    const response = enforceIpRateLimit(blockedReq, "recalculate", testKey)
    assert.ok(response !== null)
    assert.equal(response.status, 429)
    assert.ok(response.headers.get("Content-Type")?.includes("text/html"))

    const html = await response.text()
    assert.ok(html.includes("Too Many Requests"))
    assert.ok(html.includes("Rate Limited"))
  })
})

describe("Security: MemoryRateLimitStore & Pluggable Adapter", () => {
  it("enforces sliding-window limits using MemoryRateLimitStore directly", () => {
    const store = new MemoryRateLimitStore()
    const config = { limit: 2, windowMs: 10_000 }
    const key = `mem-test-${Date.now()}`

    assert.deepEqual(store.limitSync(key, config), { ok: true })
    assert.deepEqual(store.limitSync(key, config), { ok: true })
    const blocked = store.limitSync(key, config)
    assert.equal(blocked.ok, false)
    if (!blocked.ok) {
      assert.ok(blocked.retryAfter > 0)
    }
  })

  it("resets bucket memory cleanly on store.reset()", () => {
    const store = new MemoryRateLimitStore()
    const config = { limit: 1, windowMs: 10_000 }
    const key = `reset-test-${Date.now()}`

    store.limitSync(key, config)
    assert.equal(store.size, 1)
    store.reset()
    assert.equal(store.size, 0)
    // After reset, same key is allowed again
    assert.deepEqual(store.limitSync(key, config), { ok: true })
  })

  it("allows custom store registration via setRateLimitStore", async () => {
    let customCallCount = 0
    const mockStore = {
      limit: async () => {
        customCallCount++
        return { ok: true as const }
      },
      limitSync: () => {
        customCallCount++
        return { ok: true as const }
      },
    }

    setRateLimitStore(mockStore)
    assert.equal(getRateLimitStore(), mockStore)

    rateLimit("test-custom", { limit: 5, windowMs: 1000 })
    await rateLimitAsync("test-custom-async", { limit: 5, windowMs: 1000 })
    assert.equal(customCallCount, 2)

    resetRateLimitStore()
    assert.notEqual(getRateLimitStore(), mockStore)
  })
})

describe("Security: UpstashRestRateLimitStore", () => {
  it("detects configuration based on URL and token", () => {
    const unconfigured = new UpstashRestRateLimitStore({ url: "", token: "" })
    assert.equal(unconfigured.isConfigured(), false)

    const configured = new UpstashRestRateLimitStore({
      url: "https://example-redis.upstash.io",
      token: "mock-token",
    })
    assert.equal(configured.isConfigured(), true)
  })

  it("normalizes URLs lacking https protocol and strips trailing slashes", async () => {
    let capturedUrl = ""
    const mockFetch = async (input: RequestInfo | URL) => {
      capturedUrl = String(input)
      return new Response(JSON.stringify({ result: [1, 60000] }), { status: 200 })
    }

    const store = new UpstashRestRateLimitStore({
      url: "my-redis.upstash.io///",
      token: "secret-token",
      fetchFn: mockFetch as unknown as typeof fetch,
    })

    const res = await store.limit("test-url-norm", { limit: 5, windowMs: 60_000 })
    assert.equal(res.ok, true)
    assert.equal(capturedUrl, "https://my-redis.upstash.io")
  })

  it("parses successful Redis EVAL counter and returns ok when under limit", async () => {
    const mockFetch = async () => {
      return new Response(JSON.stringify({ result: [2, 58000] }), { status: 200 })
    }

    const store = new UpstashRestRateLimitStore({
      url: "https://example.upstash.io",
      token: "mock-token",
      fetchFn: mockFetch as unknown as typeof fetch,
    })

    const result = await store.limit("test-allow", { limit: 5, windowMs: 60_000 })
    assert.equal(result.ok, true)
  })

  it("calculates retryAfter correctly when limit exceeded in Redis", async () => {
    const mockFetch = async () => {
      // 6 calls, 45,200 ms TTL remaining
      return new Response(JSON.stringify({ result: [6, 45200] }), { status: 200 })
    }

    const store = new UpstashRestRateLimitStore({
      url: "https://example.upstash.io",
      token: "mock-token",
      fetchFn: mockFetch as unknown as typeof fetch,
    })

    const result = await store.limit("test-exceed", { limit: 5, windowMs: 60_000 })
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.retryAfter, 46) // Math.ceil(45200 / 1000)
    }
  })

  it("falls back gracefully to memory store when Upstash returns HTTP error", async () => {
    const fallbackStore = new MemoryRateLimitStore()
    const mockFetch = async () => {
      return new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })
    }

    const store = new UpstashRestRateLimitStore({
      url: "https://example.upstash.io",
      token: "bad-token",
      fallbackStore,
      fetchFn: mockFetch as unknown as typeof fetch,
    })

    const key = `fallback-http-500-${Date.now()}`
    const config = { limit: 2, windowMs: 10_000 }

    // Should succeed via fallback store instead of throwing
    const res1 = await store.limit(key, config)
    const res2 = await store.limit(key, config)
    const resBlocked = await store.limit(key, config)

    assert.equal(res1.ok, true)
    assert.equal(res2.ok, true)
    assert.equal(resBlocked.ok, false)
  })

  it("falls back gracefully to memory store when fetch throws or aborts", async () => {
    const fallbackStore = new MemoryRateLimitStore()
    const mockFetch = async () => {
      throw new Error("Network connection dropped")
    }

    const store = new UpstashRestRateLimitStore({
      url: "https://example.upstash.io",
      token: "mock-token",
      fallbackStore,
      fetchFn: mockFetch as unknown as typeof fetch,
    })

    const key = `fallback-network-err-${Date.now()}`
    const config = { limit: 1, windowMs: 10_000 }

    const res1 = await store.limit(key, config)
    const res2 = await store.limit(key, config)

    assert.equal(res1.ok, true)
    assert.equal(res2.ok, false)
  })
})

describe("Security: Distributed Async Enforcement Helpers", () => {
  it("enforceIpRateLimitAsync blocks requests exceeding profile threshold", async () => {
    const ip = `198.51.100.${Math.floor(Math.random() * 200 + 10)}`
    const extraKey = `async-ip-test-${Date.now()}`

    // Profile recalculate has limit = 2
    for (let i = 0; i < RATE_LIMITS.recalculate.limit; i++) {
      const req = new Request("https://example.com/api/test", {
        headers: { "x-real-ip": ip },
      })
      const res = await enforceIpRateLimitAsync(req, "recalculate", extraKey)
      assert.equal(res, null)
    }

    const blockedReq = new Request("https://example.com/api/test", {
      headers: { "x-real-ip": ip },
    })
    const response = await enforceIpRateLimitAsync(blockedReq, "recalculate", extraKey)
    assert.ok(response !== null)
    assert.equal(response.status, 429)

    const data = await response.json()
    assert.equal(data.error, "Too many requests")
  })

  it("enforceAdminRateLimitAsync isolates quotas across administrators", async () => {
    const adminA = `admin-async-a-${Date.now()}`
    const adminB = `admin-async-b-${Date.now()}`

    // Profile recalculate limit = 2
    await enforceAdminRateLimitAsync(adminA, "recalculate")
    await enforceAdminRateLimitAsync(adminA, "recalculate")
    const blockedA = await enforceAdminRateLimitAsync(adminA, "recalculate")
    assert.ok(blockedA !== null)
    assert.equal(blockedA.status, 429)

    const allowedB = await enforceAdminRateLimitAsync(adminB, "recalculate")
    assert.equal(allowedB, null)
  })
})
