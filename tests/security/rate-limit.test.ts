import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { getClientIp, rateLimit, RATE_LIMITS } from "../../src/lib/api/rate-limit"

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
