import { describe, it, after, before } from "node:test"
import assert from "node:assert/strict"
import { prisma } from "../../src/lib/prisma"
import { recalculateCollectionQuoteCounts } from "../../src/lib/quoteCountSync"
import { isValidUuid } from "../../src/lib/api/route-helpers"

describe("Admin Collections: Quotes Management & Count Synchronization", () => {
  let testCollectionId: string
  let testQuoteId1: string
  let testQuoteId2: string

  before(async () => {
    // Find or create a test collection
    const collection = await prisma.collection.create({
      data: {
        title: "Test Test Collection for Quotes",
        slug: `test-collection-${Date.now()}`,
        visibility: "PUBLIC",
      },
    })
    testCollectionId = collection.id

    // Fetch two active quotes for testing
    const quotes = await prisma.quote.findMany({
      where: { deletedAt: null },
      take: 2,
      select: { id: true, status: true },
    })

    assert.ok(quotes.length >= 2, "Need at least 2 quotes in database for collection test")
    testQuoteId1 = quotes[0].id
    testQuoteId2 = quotes[1].id
  })

  after(async () => {
    // Cleanup test collection and join records
    if (testCollectionId) {
      await prisma.quoteCollection.deleteMany({
        where: { collectionId: testCollectionId },
      })
      await prisma.collection.delete({
        where: { id: testCollectionId },
      })
    }
    await prisma.$disconnect()
    const pool = (globalThis as unknown as { pool?: { end: () => Promise<void> } }).pool
    if (pool) {
      await pool.end()
    }
  })

  it("adds quotes to collection with sequential position tracking", async () => {
    assert.ok(isValidUuid(testCollectionId))
    assert.ok(isValidUuid(testQuoteId1))
    assert.ok(isValidUuid(testQuoteId2))

    // Add first quote at position 1
    const item1 = await prisma.quoteCollection.create({
      data: {
        collectionId: testCollectionId,
        quoteId: testQuoteId1,
        position: 1,
      },
    })
    assert.equal(item1.quoteId, testQuoteId1)
    assert.equal(item1.position, 1)

    // Add second quote at position 2
    const item2 = await prisma.quoteCollection.create({
      data: {
        collectionId: testCollectionId,
        quoteId: testQuoteId2,
        position: 2,
      },
    })
    assert.equal(item2.quoteId, testQuoteId2)
    assert.equal(item2.position, 2)

    // Verify both are present in the collection
    const members = await prisma.quoteCollection.findMany({
      where: { collectionId: testCollectionId },
      orderBy: { position: "asc" },
    })
    assert.equal(members.length, 2)
    assert.equal(members[0].quoteId, testQuoteId1)
    assert.equal(members[1].quoteId, testQuoteId2)
  })

  it("recalculates collection quoteCount considering only published quotes", async () => {
    // Recalculate collection quote counts
    await recalculateCollectionQuoteCounts(prisma, [testCollectionId])

    const collection = await prisma.collection.findUnique({
      where: { id: testCollectionId },
      select: { quoteCount: true },
    })
    assert.ok(collection)

    // Count published quotes manually to verify
    const expectedPublishedCount = await prisma.quote.count({
      where: {
        id: { in: [testQuoteId1, testQuoteId2] },
        status: "PUBLISHED",
        deletedAt: null,
      },
    })

    assert.equal(collection.quoteCount, expectedPublishedCount)
  })

  it("reorders quotes in collection by updating positions", async () => {
    // Swap positions: item1 becomes position 2, item2 becomes position 1
    await prisma.$transaction([
      prisma.quoteCollection.update({
        where: {
          quoteId_collectionId: {
            quoteId: testQuoteId1,
            collectionId: testCollectionId,
          },
        },
        data: { position: 2 },
      }),
      prisma.quoteCollection.update({
        where: {
          quoteId_collectionId: {
            quoteId: testQuoteId2,
            collectionId: testCollectionId,
          },
        },
        data: { position: 1 },
      }),
    ])

    const reordered = await prisma.quoteCollection.findMany({
      where: { collectionId: testCollectionId },
      orderBy: { position: "asc" },
    })

    assert.equal(reordered[0].quoteId, testQuoteId2)
    assert.equal(reordered[0].position, 1)
    assert.equal(reordered[1].quoteId, testQuoteId1)
    assert.equal(reordered[1].position, 2)
  })

  it("removes a quote from collection and updates quoteCount accurately", async () => {
    // Remove quote 1
    await prisma.quoteCollection.delete({
      where: {
        quoteId_collectionId: {
          quoteId: testQuoteId1,
          collectionId: testCollectionId,
        },
      },
    })

    await recalculateCollectionQuoteCounts(prisma, [testCollectionId])

    const remaining = await prisma.quoteCollection.findMany({
      where: { collectionId: testCollectionId },
    })
    assert.equal(remaining.length, 1)
    assert.equal(remaining[0].quoteId, testQuoteId2)

    const expectedCount = await prisma.quote.count({
      where: {
        id: testQuoteId2,
        status: "PUBLISHED",
        deletedAt: null,
      },
    })

    const collection = await prisma.collection.findUnique({
      where: { id: testCollectionId },
      select: { quoteCount: true },
    })
    assert.ok(collection)
    assert.equal(collection.quoteCount, expectedCount)
  })

  it("syncs collection quoteCount when a member quote status transitions between DRAFT and PUBLISHED", async () => {
    // Ensure testQuoteId2 is in collection
    const inCol = await prisma.quoteCollection.findUnique({
      where: {
        quoteId_collectionId: {
          quoteId: testQuoteId2,
          collectionId: testCollectionId,
        },
      },
    })
    if (!inCol) {
      await prisma.quoteCollection.create({
        data: {
          quoteId: testQuoteId2,
          collectionId: testCollectionId,
          position: 1,
        },
      })
    }

    // Force testQuoteId2 to DRAFT
    await prisma.quote.update({
      where: { id: testQuoteId2 },
      data: { status: "DRAFT" },
    })

    await recalculateCollectionQuoteCounts(prisma, [testCollectionId])

    let collection = await prisma.collection.findUnique({
      where: { id: testCollectionId },
      select: { quoteCount: true },
    })
    assert.equal(collection?.quoteCount, 0, "Collection quoteCount should be 0 when member quote is DRAFT")

    // Force testQuoteId2 back to PUBLISHED
    await prisma.quote.update({
      where: { id: testQuoteId2 },
      data: { status: "PUBLISHED" },
    })

    await recalculateCollectionQuoteCounts(prisma, [testCollectionId])

    collection = await prisma.collection.findUnique({
      where: { id: testCollectionId },
      select: { quoteCount: true },
    })
    assert.equal(collection?.quoteCount, 1, "Collection quoteCount should be 1 when member quote is PUBLISHED")
  })
})
