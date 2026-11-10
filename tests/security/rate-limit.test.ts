import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  getClientIp,
  rateLimit,
  RATE_LIMITS,
  enforceAdminRateLimit,
  enforceIpRateLimit,
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
