import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { enrichQuotesBatch } from "../../src/lib/quotes/batch-enricher"

describe("Batch AI Enrichment for Existing Quotes", () => {
  it("handles empty or invalid quoteIds array gracefully", async () => {
    const result = await enrichQuotesBatch({
      quoteIds: [],
    })

    assert.ok(result.success, "Should succeed with empty input")
    assert.strictEqual(result.totalRequested, 0)
    assert.strictEqual(result.totalProcessed, 0)
    assert.strictEqual(result.successCount, 0)
    assert.strictEqual(result.skippedCount, 0)
    assert.strictEqual(result.errorCount, 0)
    assert.deepStrictEqual(result.items, [])
  })

  it("filters out invalid UUIDs safely", async () => {
    const result = await enrichQuotesBatch({
      quoteIds: ["not-a-uuid", "12345", "random-text"],
    })

    assert.ok(result.success)
    assert.strictEqual(result.totalRequested, 0)
    assert.strictEqual(result.totalProcessed, 0)
  })

  it("safely handles non-existent quote UUIDs by returning empty processed items", async () => {
    const nonExistentUuid = "00000000-0000-0000-0000-000000000099"

    const result = await enrichQuotesBatch({
      quoteIds: [nonExistentUuid],
    })

    assert.ok(result.success)
    assert.strictEqual(result.totalRequested, 1)
    assert.strictEqual(result.totalProcessed, 0)
    assert.strictEqual(result.items.length, 0)
  })

  it("respects default enrichment options and correctly structures result shape", async () => {
    const dummyUuid = "00000000-0000-0000-0000-000000000001"

    const result = await enrichQuotesBatch({
      quoteIds: [dummyUuid],
      options: {
        enrichContext: true,
        enrichTags: true,
        enrichSource: true,
        enrichVerification: true,
        autoPublish: false,
        overwriteExisting: false,
      },
    })

    assert.ok(result.success)
    assert.ok(typeof result.totalRequested === "number")
    assert.ok(typeof result.totalProcessed === "number")
    assert.ok(typeof result.successCount === "number")
    assert.ok(typeof result.skippedCount === "number")
    assert.ok(typeof result.errorCount === "number")
    assert.ok(Array.isArray(result.items))
  })
})
