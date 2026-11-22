import { describe, it, after } from "node:test"
import assert from "node:assert/strict"
import { prisma } from "../../src/lib/prisma"
import { isValidUuid } from "../../src/lib/api/route-helpers"
import { deriveAdminSortKey, deriveVerificationConfidence } from "../../src/lib/quoteAutomation"

describe("Admin Quotes: AI-Assisted Verification & Database Lifecycle", () => {
  after(async () => {
    await prisma.$disconnect()
    const pool = (globalThis as unknown as { pool?: { end: () => Promise<void> } }).pool
    if (pool) {
      await pool.end()
    }
  })

  it("verifies confidence and admin sort key derivation calculations", () => {
    // Verified + CONFIRMED
    const confHigh = deriveVerificationConfidence({
      isVerified: true,
      attributionStatus: "CONFIRMED",
    })
    assert.equal(confHigh, 1.0)

    // Verified + DISPUTED
    const confDisp = deriveVerificationConfidence({
      isVerified: true,
      attributionStatus: "DISPUTED",
    })
    assert.equal(confDisp, 0.65)

    // Unverified + MISATTRIBUTED
    const confMis = deriveVerificationConfidence({
      isVerified: false,
      attributionStatus: "MISATTRIBUTED",
    })
    assert.equal(confMis, 0.05)

    // Admin sort key calculation
    const keyPublishedVerified = deriveAdminSortKey({
      status: "PUBLISHED",
      isFeatured: true,
      isVerified: true,
      attributionStatus: "CONFIRMED",
    })
    // 100 (PUBLISHED) + 50 (isFeatured) + 25 (isVerified) + 10 (CONFIRMED) = 185
    assert.equal(keyPublishedVerified, 185)

    const keyDraftMisattributed = deriveAdminSortKey({
      status: "DRAFT",
      isFeatured: false,
      isVerified: false,
      attributionStatus: "MISATTRIBUTED",
    })
    // 20 (DRAFT) - 30 (MISATTRIBUTED) = -10
    assert.equal(keyDraftMisattributed, -10)
  })

  it("updates and stores quote verification fields in PostgreSQL", async () => {
    const quote = await prisma.quote.findFirst({
      where: { deletedAt: null },
      select: {
        id: true,
        isVerified: true,
        attributionStatus: true,
        verificationConfidence: true,
        verificationNote: true,
        adminSortKey: true,
        status: true,
      },
    })

    assert.ok(quote, "Should find at least one active quote in database")
    assert.ok(isValidUuid(quote.id), "Quote id should be a valid UUID")

    const originalVerified = quote.isVerified
    const originalAttribution = quote.attributionStatus
    const originalNote = quote.verificationNote
    const originalConfidence = quote.verificationConfidence

    try {
      const testNote = `Scholarly primary citation test ${Date.now()}`
      const testConfidence = 0.95
      const nextSortKey = deriveAdminSortKey({
        status: quote.status,
        isVerified: true,
        attributionStatus: "CONFIRMED",
      })

      const updated = await prisma.quote.update({
        where: { id: quote.id },
        data: {
          isVerified: true,
          attributionStatus: "CONFIRMED",
          verificationConfidence: testConfidence.toFixed(2),
          verificationNote: testNote,
          adminSortKey: nextSortKey,
        },
        select: {
          id: true,
          isVerified: true,
          attributionStatus: true,
          verificationConfidence: true,
          verificationNote: true,
          adminSortKey: true,
        },
      })

      assert.equal(updated.isVerified, true)
      assert.equal(updated.attributionStatus, "CONFIRMED")
      assert.equal(Number(updated.verificationConfidence), 0.95)
      assert.equal(updated.verificationNote, testNote)
      assert.equal(updated.adminSortKey, nextSortKey)

      // Fetch fresh record from DB to verify persistence
      const fresh = await prisma.quote.findUnique({
        where: { id: quote.id },
        select: {
          isVerified: true,
          attributionStatus: true,
          verificationConfidence: true,
          verificationNote: true,
        },
      })

      assert.ok(fresh)
      assert.equal(fresh.isVerified, true)
      assert.equal(fresh.attributionStatus, "CONFIRMED")
      assert.equal(fresh.verificationNote, testNote)
      assert.equal(Number(fresh.verificationConfidence), 0.95)
    } finally {
      // Restore original state
      await prisma.quote.update({
        where: { id: quote.id },
        data: {
          isVerified: originalVerified,
          attributionStatus: originalAttribution,
          verificationConfidence: originalConfidence,
          verificationNote: originalNote,
        },
      })
    }
  })
})

