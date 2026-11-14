import { describe, it, after } from "node:test"
import assert from "node:assert/strict"
import { prisma } from "../../src/lib/prisma"
import { isValidUuid } from "../../src/lib/api/route-helpers"
import { deriveAdminSortKey } from "../../src/lib/quoteAutomation"

describe("Admin Quotes: Publication Lifecycle & Database State", () => {
  after(async () => {
    await prisma.$disconnect()
    const pool = (globalThis as unknown as { pool?: { end: () => Promise<void> } }).pool
    if (pool) {
      await pool.end()
    }
  })

  it("updates quote to PUBLISHED state with publishedAt timestamp and recalculates sort key", async () => {
    const quote = await prisma.quote.findFirst({
      where: { deletedAt: null },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        isFeatured: true,
        isVerified: true,
        attributionStatus: true,
        adminSortKey: true,
      },
    })

    assert.ok(quote, "Should find at least one active quote in database")
    assert.ok(isValidUuid(quote.id), "Quote id should be a valid UUID")

    const originalStatus = quote.status
    const originalPublishedAt = quote.publishedAt
    const originalFeatured = quote.isFeatured
    const originalSortKey = quote.adminSortKey

    try {
      const now = new Date()
      const nextSortKey = deriveAdminSortKey({
        status: "PUBLISHED",
        isFeatured: true,
        isVerified: quote.isVerified,
        attributionStatus: quote.attributionStatus,
      })

      const updated = await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: "PUBLISHED",
          publishedAt: now,
          isFeatured: true,
          adminSortKey: nextSortKey,
        },
        select: {
          id: true,
          status: true,
          publishedAt: true,
          isFeatured: true,
          adminSortKey: true,
        },
      })

      assert.equal(updated.status, "PUBLISHED")
      assert.ok(updated.publishedAt)
      assert.equal(updated.isFeatured, true)
      assert.equal(updated.adminSortKey, nextSortKey)

      // Test unpublishing back to DRAFT
      const draftSortKey = deriveAdminSortKey({
        status: "DRAFT",
        isFeatured: false,
        isVerified: quote.isVerified,
        attributionStatus: quote.attributionStatus,
      })

      const unpublished = await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: "DRAFT",
          isFeatured: false,
          adminSortKey: draftSortKey,
        },
        select: {
          status: true,
          isFeatured: true,
          adminSortKey: true,
        },
      })

      assert.equal(unpublished.status, "DRAFT")
      assert.equal(unpublished.isFeatured, false)
      assert.equal(unpublished.adminSortKey, draftSortKey)
    } finally {
      // Restore original state
      await prisma.quote.update({
        where: { id: quote.id },
        data: {
          status: originalStatus,
          publishedAt: originalPublishedAt,
          isFeatured: originalFeatured,
          adminSortKey: originalSortKey,
        },
      })
    }
  })
})

