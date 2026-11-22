import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { sanitizeForTsquery } from "../../src/lib/quotes/search"

describe("Search: sanitizeForTsquery", () => {
  it("converts plain multi-word search queries into prefix tsquery format", () => {
    assert.equal(sanitizeForTsquery("rumi love"), "rumi:* & love:*")
    assert.equal(sanitizeForTsquery("stoic wisdom virtue"), "stoic:* & wisdom:* & virtue:*")
  })

  it("strips tsquery syntax operators and special punctuation", () => {
    assert.equal(sanitizeForTsquery("to be & not | to be!"), "to:* & be:* & not:* & to:* & be:*")
    assert.equal(sanitizeForTsquery("love:* & 'peace'"), "love:* & peace:*")
    assert.equal(sanitizeForTsquery("marcus (aurelius)"), "marcus:* & aurelius:*")
  })

  it("supports Unicode characters in thinkers' names", () => {
    assert.equal(sanitizeForTsquery("Nietzsche übermensch"), "Nietzsche:* & übermensch:*")
    assert.equal(sanitizeForTsquery("Confucius 道德"), "Confucius:* & 道德:*")
  })

  it("returns null for empty or whitespace-only inputs", () => {
    assert.equal(sanitizeForTsquery(""), null)
    assert.equal(sanitizeForTsquery("   "), null)
    assert.equal(sanitizeForTsquery("!@#$%^&*()"), null)
  })
})
