import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildCspDirectives, buildCspHeader } from "../../src/lib/security/csp"

describe("Security: Content Security Policy (CSP Hardening)", () => {
  it("enforces strict production script policy without unsafe-eval", () => {
    const directives = buildCspDirectives({ isDev: false })
    const scriptSrc = directives["script-src"]

    assert.ok(Array.isArray(scriptSrc))
    assert.ok(scriptSrc.includes("'self'"))
    assert.ok(scriptSrc.includes("https://va.vercel-scripts.com"))
    // In production, unsafe-eval MUST NOT be present
    assert.equal(scriptSrc.includes("'unsafe-eval'"), false)
  })

  it("permits unsafe-eval only in development mode for Next.js Fast Refresh", () => {
    const devDirectives = buildCspDirectives({ isDev: true })
    assert.ok(devDirectives["script-src"].includes("'unsafe-eval'"))

    const prodDirectives = buildCspDirectives({ isDev: false })
    assert.equal(prodDirectives["script-src"].includes("'unsafe-eval'"), false)
  })

  it("restricts img-src strictly to approved image hosts and rejects generic https: wildcard", () => {
    const directives = buildCspDirectives({ isDev: false })
    const imgSrc = directives["img-src"]

    assert.ok(Array.isArray(imgSrc))
    assert.ok(imgSrc.includes("'self'"))
    assert.ok(imgSrc.includes("data:"))
    assert.ok(imgSrc.includes("blob:"))
    assert.ok(imgSrc.includes("https://commons.wikimedia.org"))
    assert.ok(imgSrc.includes("https://upload.wikimedia.org"))
    assert.ok(imgSrc.includes("https://thumb.wikimedia.org"))
    assert.ok(imgSrc.includes("https://*.wikimedia.org"))
    assert.ok(imgSrc.includes("https://*.wikipedia.org"))
    assert.ok(imgSrc.includes("https://covers.openlibrary.org"))

    // CRITICAL: Ensure generic https: wildcard is eliminated
    assert.equal(imgSrc.includes("https:"), false)
    assert.equal(imgSrc.includes("http:"), false)
    assert.equal(imgSrc.includes("*"), false)
  })

  it("strictly disables dangerous plugin, frame, and media embedding", () => {
    const directives = buildCspDirectives({ isDev: false })

    assert.deepEqual(directives["object-src"], ["'none'"])
    assert.deepEqual(directives["frame-src"], ["'none'"])
    assert.deepEqual(directives["frame-ancestors"], ["'none'"])
    assert.deepEqual(directives["media-src"], ["'none'"])
    assert.deepEqual(directives["base-uri"], ["'self'"])
    assert.deepEqual(directives["form-action"], ["'self'"])
    assert.deepEqual(directives["manifest-src"], ["'self'"])
    assert.deepEqual(directives["worker-src"], ["'self'", "blob:"])
    assert.ok("upgrade-insecure-requests" in directives)
    assert.ok("block-all-mixed-content" in directives)
  })

  it("allows connect-src to Supabase and Vercel Analytics with custom URL injection", () => {
    const directives = buildCspDirectives({
      isDev: false,
      supabaseUrl: "https://custom-supabase-project.example.com/v1",
      additionalConnectSrc: ["https://api.custom-metrics.internal"],
    })
    const connectSrc = directives["connect-src"]

    assert.ok(connectSrc.includes("'self'"))
    assert.ok(connectSrc.includes("https://*.supabase.co"))
    assert.ok(connectSrc.includes("wss://*.supabase.co"))
    assert.ok(connectSrc.includes("https://*.vercel-insights.com"))
    assert.ok(connectSrc.includes("https://*.vercel-analytics.com"))
    assert.ok(connectSrc.includes("https://custom-supabase-project.example.com"))
    assert.ok(connectSrc.includes("https://api.custom-metrics.internal"))
  })

  it("builds a correctly formatted, semicolon-delimited CSP header string", () => {
    const header = buildCspHeader({ isDev: false })

    assert.ok(typeof header === "string")
    assert.ok(header.includes("default-src 'self'"))
    assert.ok(header.includes("object-src 'none'"))
    assert.ok(header.includes("frame-ancestors 'none'"))
    assert.ok(header.includes("frame-src 'none'"))
    assert.ok(header.includes("media-src 'none'"))
    assert.ok(header.includes("upgrade-insecure-requests"))
    assert.ok(header.includes("block-all-mixed-content"))
    // Ensure no double semicolons or leading/trailing whitespace
    assert.equal(header.includes(";;"), false)
    assert.equal(header.startsWith(";"), false)
  })
})

