import { describe, it, after } from "node:test"
import assert from "node:assert/strict"
import { prisma } from "../../src/lib/prisma"
import { getCachedDashboardMetrics } from "../../src/lib/dashboard/metrics"

describe("Admin Dashboard: Metrics Aggregation & Quality Tracking", () => {
  after(async () => {
    await prisma.$disconnect()
    const pool = (globalThis as unknown as { pool?: { end: () => Promise<void> } }).pool
    if (pool) {
      await pool.end()
    }
  })

  it("loads cached dashboard metrics with context enrichment counts", async () => {
    const metrics = await getCachedDashboardMetrics()

    assert.ok(typeof metrics.totalQuotes === "number", "totalQuotes should be a number")
    assert.ok(typeof metrics.publishedQuotes === "number", "publishedQuotes should be a number")
    assert.ok(typeof metrics.noContextQuotes === "number", "noContextQuotes should be a number")
    assert.ok(typeof metrics.hasContextQuotes === "number", "hasContextQuotes should be a number")
    assert.ok(typeof metrics.featuredQuotes === "number", "featuredQuotes should be a number")
    assert.ok(typeof metrics.featuredPublishedQuotes === "number", "featuredPublishedQuotes should be a number")

    // The partition of non-deleted quotes into context enriched vs missing context
    assert.equal(
      metrics.noContextQuotes + metrics.hasContextQuotes,
      metrics.totalQuotes,
      "noContextQuotes + hasContextQuotes must equal totalQuotes"
    )
  })

  it("verifies noContextQuotes and hasContextQuotes match database records", async () => {
    const metrics = await getCachedDashboardMetrics()

    const dbNoContextCount = await prisma.quote.count({
      where: {
        deletedAt: null,
        AND: [
          { OR: [{ meaning: null }, { meaning: "" }] },
          { OR: [{ historicalContext: null }, { historicalContext: "" }] },
          { OR: [{ modernRelevance: null }, { modernRelevance: "" }] },
        ],
      },
    })

    const dbHasContextCount = await prisma.quote.count({
      where: {
        deletedAt: null,
        OR: [
          { AND: [{ meaning: { not: null } }, { meaning: { not: "" } }] },
          { AND: [{ historicalContext: { not: null } }, { historicalContext: { not: "" } }] },
          { AND: [{ modernRelevance: { not: null } }, { modernRelevance: { not: "" } }] },
        ],
      },
    })

    assert.equal(metrics.noContextQuotes, dbNoContextCount, "Dashboard noContextQuotes must match DB count")
    assert.equal(metrics.hasContextQuotes, dbHasContextCount, "Dashboard hasContextQuotes must match DB count")
  })

  it("verifies attribution quality and risk metrics", async () => {
    const metrics = await getCachedDashboardMetrics()

    const dbDisputedCount = await prisma.quote.count({
      where: {
        deletedAt: null,
        attributionStatus: "DISPUTED",
      },
    })

    const dbMisattributedCount = await prisma.quote.count({
      where: {
        deletedAt: null,
        attributionStatus: "MISATTRIBUTED",
      },
    })

    assert.equal(metrics.attributionDisputedQuotes, dbDisputedCount)
    assert.equal(metrics.attributionMisattributedQuotes, dbMisattributedCount)
  })

  it("verifies featured quotes counts match database records", async () => {
    const metrics = await getCachedDashboardMetrics()

    const dbFeaturedCount = await prisma.quote.count({
      where: {
        deletedAt: null,
        isFeatured: true,
      },
    })

    const dbFeaturedPublishedCount = await prisma.quote.count({
      where: {
        deletedAt: null,
        status: "PUBLISHED",
        isFeatured: true,
      },
    })

    assert.equal(metrics.featuredQuotes, dbFeaturedCount)
    assert.equal(metrics.featuredPublishedQuotes, dbFeaturedPublishedCount)
  })
})

