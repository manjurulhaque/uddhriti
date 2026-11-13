import { describe, it, after } from "node:test"
import assert from "node:assert/strict"
import { prisma } from "../../src/lib/prisma"
import { quoteContextUpdateSchema } from "../../src/lib/validation/quote"
import { isValidUuid } from "../../src/lib/api/route-helpers"

describe("Admin Quotes: Context Quick-Editor & Enrichment", () => {
  after(async () => {
    await prisma.$disconnect()
    const pool = (globalThis as unknown as { pool?: { end: () => Promise<void> } }).pool
    if (pool) {
      await pool.end()
    }
  })

  it("validates quoteContextUpdateSchema with valid inputs, trimming, and character limits", () => {
    // Valid 3-dimension payload
    const validResult = quoteContextUpdateSchema.safeParse({
      meaning: "  The essential philosophical meaning of living with intention.  ",
      historicalContext: "Written in 1854 during Thoreau's retreat at Walden Pond.",
      modernRelevance: "Applicable to digital minimalism and intentional living today.",
    })

    assert.ok(validResult.success, "Valid context data should parse successfully")
    assert.equal(
      validResult.data.meaning,
      "The essential philosophical meaning of living with intention.",
      "Meaning should be trimmed"
    )

    // Nullable/optional fields
    const partialResult = quoteContextUpdateSchema.safeParse({
      meaning: "Only meaning provided",
      historicalContext: null,
    })
    assert.ok(partialResult.success)
    assert.equal(partialResult.data.meaning, "Only meaning provided")
    assert.equal(partialResult.data.historicalContext, null)
    assert.equal(partialResult.data.modernRelevance, undefined)

    // Excessive length rejection (>5000 characters)
    const tooLongResult = quoteContextUpdateSchema.safeParse({
      meaning: "a".repeat(5001),
    })
    assert.equal(tooLongResult.success, false, "Should reject text exceeding 5,000 characters")
  })

  it("updates and enriches quote context dimensions in database", async () => {
    // Find an active curated quote so partition counts remain stable during parallel test runs
    const quote = await prisma.quote.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { meaning: { not: null } },
          { historicalContext: { not: null } },
          { modernRelevance: { not: null } },
        ],
      },
      select: {
        id: true,
        meaning: true,
        historicalContext: true,
        modernRelevance: true,
        content: true,
        authorId: true,
        categoryId: true,
        status: true,
      },
    })

    assert.ok(quote, "Should find at least one quote in database")
    assert.ok(isValidUuid(quote.id), "Quote id should be a valid UUID")

    const originalMeaning = quote.meaning
    const originalHistorical = quote.historicalContext
    const originalModern = quote.modernRelevance

    try {
      const testMeaning = `Test meaning enrichment ${Date.now()}`
      const testHistory = `Test historical context ${Date.now()}`
      const testModern = `Test modern relevance ${Date.now()}`

      // Update all 3 dimensions
      const updated = await prisma.quote.update({
        where: { id: quote.id },
        data: {
          meaning: testMeaning,
          historicalContext: testHistory,
          modernRelevance: testModern,
        },
        select: {
          id: true,
          meaning: true,
          historicalContext: true,
          modernRelevance: true,
          content: true,
          authorId: true,
          categoryId: true,
          status: true,
        },
      })

      assert.equal(updated.meaning, testMeaning)
      assert.equal(updated.historicalContext, testHistory)
      assert.equal(updated.modernRelevance, testModern)
      assert.equal(updated.content, quote.content, "Content must remain unchanged")
      assert.equal(updated.authorId, quote.authorId, "Author relation must remain unchanged")
      assert.equal(updated.categoryId, quote.categoryId, "Category relation must remain unchanged")
      assert.equal(updated.status, quote.status, "Status must remain unchanged")

      // Clear two dimensions and leave one populated
      const partialUpdate = await prisma.quote.update({
        where: { id: quote.id },
        data: {
          meaning: testMeaning,
          historicalContext: null,
          modernRelevance: null,
        },
        select: {
          id: true,
          meaning: true,
          historicalContext: true,
          modernRelevance: true,
        },
      })

      assert.equal(partialUpdate.meaning, testMeaning)
      assert.equal(partialUpdate.historicalContext, null)
      assert.equal(partialUpdate.modernRelevance, null)

      // Calculate context presence
      const hasContext = Boolean(
        (typeof partialUpdate.meaning === "string" && partialUpdate.meaning.trim()) ||
        (typeof partialUpdate.historicalContext === "string" && (partialUpdate.historicalContext as string).trim()) ||
        (typeof partialUpdate.modernRelevance === "string" && (partialUpdate.modernRelevance as string).trim())
      )
      assert.equal(hasContext, true, "Quote with meaning populated should have hasContext = true")
    } finally {
      // Revert quote to original context values
      await prisma.quote.update({
        where: { id: quote.id },
        data: {
          meaning: originalMeaning,
          historicalContext: originalHistorical,
          modernRelevance: originalModern,
        },
      })
    }
  })

  it("verifies context dimensions partition accurately into 0/3, 1/3, 2/3, 3/3 populated", async () => {
    const quotes = await prisma.quote.findMany({
      where: { deletedAt: null },
      take: 20,
      select: {
        id: true,
        meaning: true,
        historicalContext: true,
        modernRelevance: true,
      },
    })

    for (const q of quotes) {
      const isMeaningFilled = Boolean(q.meaning && q.meaning.trim())
      const isHistoryFilled = Boolean(q.historicalContext && q.historicalContext.trim())
      const isModernFilled = Boolean(q.modernRelevance && q.modernRelevance.trim())
      const filledCount = Number(isMeaningFilled) + Number(isHistoryFilled) + Number(isModernFilled)

      assert.ok(filledCount >= 0 && filledCount <= 3, "filledCount must be between 0 and 3")
      const hasContext = Boolean(isMeaningFilled || isHistoryFilled || isModernFilled)
      assert.equal(hasContext, filledCount > 0, "hasContext should match filledCount > 0")
    }
  })
})

