import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  isSafeExternalUrl,
  isValidWikidataId,
  sanitizeSearchQuery,
  parseSafePageNumber,
  sanitizeSlug,
} from "../../src/lib/security/input"

describe("Security: isSafeExternalUrl", () => {
  it("allows valid https and http URLs", () => {
    assert.equal(isSafeExternalUrl("https://en.wikipedia.org/wiki/Marcus_Aurelius"), true)
    assert.equal(isSafeExternalUrl("http://example.com/source.pdf"), true)
    assert.equal(isSafeExternalUrl("https://books.google.com/books?id=123&lpg=PA1"), true)
  })

  it("rejects dangerous URI schemes (XSS vectors)", () => {
    assert.equal(isSafeExternalUrl("javascript:alert(document.domain)"), false)
    assert.equal(isSafeExternalUrl("data:text/html,<script>alert(1)</script>"), false)
    assert.equal(isSafeExternalUrl("vbscript:msgbox(1)"), false)
    assert.equal(isSafeExternalUrl("file:///C:/Windows/System32/calc.exe"), false)
    assert.equal(isSafeExternalUrl("blob:https://example.com/uuid"), false)
  })

  it("rejects protocol-relative, malformed, or non-string inputs", () => {
    assert.equal(isSafeExternalUrl("//evil.com/phish"), false)
    assert.equal(isSafeExternalUrl("not-a-url"), false)
    assert.equal(isSafeExternalUrl(""), false)
    assert.equal(isSafeExternalUrl("   "), false)
    assert.equal(isSafeExternalUrl(null), false)
    assert.equal(isSafeExternalUrl(undefined), false)
  })
})

describe("Security: isValidWikidataId", () => {
  it("accepts canonical Wikidata entity IDs", () => {
    assert.equal(isValidWikidataId("Q42"), true)
    assert.equal(isValidWikidataId("Q1"), true)
    assert.equal(isValidWikidataId("Q123456789"), true)
  })

  it("rejects non-canonical or malicious Wikidata formats", () => {
    assert.equal(isValidWikidataId("q42"), false) // lowercase
    assert.equal(isValidWikidataId("Q"), false) // missing digits
    assert.equal(isValidWikidataId("P42"), false) // property, not entity
    assert.equal(isValidWikidataId("Q42; DROP TABLE"), false)
    assert.equal(isValidWikidataId("Q42<script>"), false)
    assert.equal(isValidWikidataId(""), false)
    assert.equal(isValidWikidataId(null), false)
    assert.equal(isValidWikidataId(undefined), false)
  })
})

describe("Security: sanitizeSearchQuery", () => {
  it("strips control characters and collapses whitespace", () => {
    const raw = "  hello \x00\x1f world \t\n  test  "
    assert.equal(sanitizeSearchQuery(raw), "hello world test")
  })

  it("bounds output to specified maxLength", () => {
    const long = "a".repeat(150)
    assert.equal(sanitizeSearchQuery(long, 80).length, 80)
  })

  it("handles null and undefined gracefully", () => {
    assert.equal(sanitizeSearchQuery(null), "")
    assert.equal(sanitizeSearchQuery(undefined), "")
  })
})

describe("Security: parseSafePageNumber", () => {
  it("parses valid page numbers", () => {
    assert.equal(parseSafePageNumber("1"), 1)
    assert.equal(parseSafePageNumber("42"), 42)
    assert.equal(parseSafePageNumber(10), 10)
  })

  it("clamps invalid or negative numbers to 1", () => {
    assert.equal(parseSafePageNumber("-5"), 1)
    assert.equal(parseSafePageNumber("0"), 1)
    assert.equal(parseSafePageNumber("abc"), 1)
    assert.equal(parseSafePageNumber(null), 1)
    assert.equal(parseSafePageNumber(undefined), 1)
  })

  it("clamps excessive page numbers to maxPage limit", () => {
    assert.equal(parseSafePageNumber("999999", 500), 500)
  })
})

describe("Security: sanitizeSlug", () => {
  it("removes path traversal sequences and slashes", () => {
    assert.equal(sanitizeSlug("../../../etc/passwd"), "etcpasswd")
    assert.equal(sanitizeSlug("quotes\\evil\\slug"), "quotesevilslug")
  })

  it("bounds slug length", () => {
    const long = "slug-".repeat(50)
    assert.ok(sanitizeSlug(long, 100).length <= 100)
  })
})
