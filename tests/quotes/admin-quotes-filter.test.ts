import { describe, it, after } from "node:test"
import assert from "node:assert/strict"
import { prisma } from "../../src/lib/prisma"

// Mirroring the filter resolver function from src/app/admin/(protected)/quotes/page.tsx
function getQuoteFilter(value: string | string[] | undefined) {
  if (typeof value !== "string") return "all"
  if (value === "draft") return "draft"
  if (value === "archived") return "archived"
  if (value === "unverified") return "unverified"
  if (value === "unattributed") return "unattributed"
  if (value === "missing-source") return "missing-source"
  if (value === "no-tags") return "no-tags"
  if (
    value === "no-context" ||
    value === "missing-context" ||
    value === "without-context" ||
    value === "no-interpretation" ||
    value === "missing-interpretation" ||
    value === "without-interpretation"
  ) {
    return "no-context"
  }
  if (value === "orphaned") return "orphaned"
  return "all"
}

describe("Admin Quotes: Interpretation & Context Filter", () => {
  after(async () => {
    await prisma.$disconnect()
    const pool = (globalThis as unknown as { pool?: { end: () => Promise<void> } }).pool
    if (pool) {
      await pool.end()
    }
  })

  it("resolves filter param aliases to 'no-context'", () => {
    assert.equal(getQuoteFilter("no-context"), "no-context")
    assert.equal(getQuoteFilter("missing-context"), "no-context")
    assert.equal(getQuoteFilter("without-context"), "no-context")
    assert.equal(getQuoteFilter("no-interpretation"), "no-context")
    assert.equal(getQuoteFilter("missing-interpretation"), "no-context")
    assert.equal(getQuoteFilter("without-interpretation"), "no-context")

    // Retains standard filters
    assert.equal(getQuoteFilter("all"), "all")
    assert.equal(getQuoteFilter("draft"), "draft")
    assert.equal(getQuoteFilter("missing-source"), "missing-source")
    assert.equal(getQuoteFilter("no-tags"), "no-tags")
    assert.equal(getQuoteFilter("orphaned"), "orphaned")
    assert.equal(getQuoteFilter(undefined), "all")
    assert.equal(getQuoteFilter("unknown-value"), "all")
  })

  it("queries quotes without Interpretation & Context using Prisma where input", async () => {
    const noContextQuotes = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        AND: [
          { OR: [{ meaning: null }, { meaning: "" }] },
          { OR: [{ historicalContext: null }, { historicalContext: "" }] },
          { OR: [{ modernRelevance: null }, { modernRelevance: "" }] },
        ],
      },
      select: {
        id: true,
        meaning: true,
        historicalContext: true,
        modernRelevance: true,
      },
      take: 10,
    })

    assert.ok(noContextQuotes.length > 0, "Should return quotes lacking interpretation & context")
    for (const q of noContextQuotes) {
      assert.ok(!q.meaning || q.meaning.trim() === "", `Quote ${q.id} should not have meaning`)
      assert.ok(
        !q.historicalContext || q.historicalContext.trim() === "",
        `Quote ${q.id} should not have historicalContext`
      )
      assert.ok(
        !q.modernRelevance || q.modernRelevance.trim() === "",
        `Quote ${q.id} should not have modernRelevance`
      )
    }
  })

  it("raw SQL query calculates noContext count accurately", async () => {
    const rows = await prisma.$queryRaw<Array<{ noContext: number; total: number }>>`
      SELECT
        COUNT(*)::int AS "total",
        COUNT(*) FILTER (
          WHERE ("meaning" IS NULL OR TRIM("meaning") = '')
            AND ("historicalContext" IS NULL OR TRIM("historicalContext") = '')
            AND ("modernRelevance" IS NULL OR TRIM("modernRelevance") = '')
        )::int AS "noContext"
      FROM "Quote" q
      WHERE "deletedAt" IS NULL;
    `

    assert.ok(rows.length === 1)
    const { total, noContext } = rows[0]
    assert.ok(total > 0, "Database should contain quotes")
    assert.ok(noContext > 0, "Should count quotes without interpretation & context")
    assert.ok(noContext <= total, "noContext count should not exceed total")

    // Compare with Prisma count to verify consistency
    const prismaCount = await prisma.quote.count({
      where: {
        deletedAt: null,
        AND: [
          { OR: [{ meaning: null }, { meaning: "" }] },
          { OR: [{ historicalContext: null }, { historicalContext: "" }] },
          { OR: [{ modernRelevance: null }, { modernRelevance: "" }] },
        ],
      },
    })

    assert.equal(noContext, prismaCount, "Raw SQL count must match Prisma where count exactly")
  })

  it("excludes quotes that have interpretation or context", async () => {
    // Find quotes that DO have meaning or context
    const enrichedQuotes = await prisma.quote.findMany({
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
      },
    })

    if (enrichedQuotes.length > 0) {
      const enrichedIds = new Set(enrichedQuotes.map((q) => q.id))

      const filterResults = await prisma.quote.findMany({
        where: {
          deletedAt: null,
          AND: [
            { OR: [{ meaning: null }, { meaning: "" }] },
            { OR: [{ historicalContext: null }, { historicalContext: "" }] },
            { OR: [{ modernRelevance: null }, { modernRelevance: "" }] },
          ],
        },
        select: { id: true },
      })

      for (const result of filterResults) {
        assert.ok(
          !enrichedIds.has(result.id),
          `Quote ${result.id} has interpretation/context and must NOT be in no-context results`
        )
      }
    }
  })
})
