import { describe, it, after } from "node:test"
import assert from "node:assert/strict"
import { prisma } from "../../src/lib/prisma"
import { isValidUuid } from "../../src/lib/api/route-helpers"

// Mirroring the filter resolver function from src/app/admin/(protected)/quotes/page.tsx
function getQuoteFilter(value: string | string[] | undefined) {
  if (typeof value !== "string") return "all"
  if (value === "draft") return "draft"
  if (value === "archived") return "archived"
  if (value === "featured" || value === "is-featured") return "featured"
  if (value === "unverified") return "unverified"
  if (value === "disputed" || value === "misattributed" || value === "attribution-risk") return "disputed"
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
  if (
    value === "has-context" ||
    value === "curated" ||
    value === "with-context" ||
    value === "has-interpretation" ||
    value === "with-interpretation"
  ) {
    return "has-context"
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

    assert.equal(getQuoteFilter("has-context"), "has-context")
    assert.equal(getQuoteFilter("curated"), "has-context")
    assert.equal(getQuoteFilter("with-context"), "has-context")
    assert.equal(getQuoteFilter("has-interpretation"), "has-context")
    assert.equal(getQuoteFilter("with-interpretation"), "has-context")

    // Retains standard filters
    assert.equal(getQuoteFilter("all"), "all")
    assert.equal(getQuoteFilter("draft"), "draft")
    assert.equal(getQuoteFilter("archived"), "archived")
    assert.equal(getQuoteFilter("featured"), "featured")
    assert.equal(getQuoteFilter("is-featured"), "featured")
    assert.equal(getQuoteFilter("disputed"), "disputed")
    assert.equal(getQuoteFilter("misattributed"), "disputed")
    assert.equal(getQuoteFilter("attribution-risk"), "disputed")
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

  it("queries disputed and misattributed quotes correctly", async () => {
    const disputedQuotes = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        attributionStatus: { in: ["DISPUTED", "MISATTRIBUTED"] },
      },
      select: {
        id: true,
        attributionStatus: true,
      },
    })

    assert.ok(disputedQuotes.length > 0, "Should find disputed/misattributed quotes in DB")
    for (const q of disputedQuotes) {
      assert.ok(
        q.attributionStatus === "DISPUTED" || q.attributionStatus === "MISATTRIBUTED",
        `Quote ${q.id} must be DISPUTED or MISATTRIBUTED`
      )
    }

    // Verify raw SQL count matches Prisma where count
    const rows = await prisma.$queryRaw<Array<{ disputed: number }>>`
      SELECT
        COUNT(*) FILTER (
          WHERE "attributionStatus" IN ('DISPUTED', 'MISATTRIBUTED')
        )::int AS "disputed"
      FROM "Quote" q
      WHERE "deletedAt" IS NULL;
    `

    assert.equal(rows[0].disputed, disputedQuotes.length, "Raw SQL disputed count must match Prisma count")
  })

  it("queries quotes WITH Interpretation & Context correctly and verifies partition", async () => {
    const hasContextQuotes = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        OR: [
          { AND: [{ meaning: { not: null } }, { meaning: { not: "" } }] },
          { AND: [{ historicalContext: { not: null } }, { historicalContext: { not: "" } }] },
          { AND: [{ modernRelevance: { not: null } }, { modernRelevance: { not: "" } }] },
        ],
      },
      select: {
        id: true,
        meaning: true,
        historicalContext: true,
        modernRelevance: true,
      },
    })

    assert.ok(hasContextQuotes.length > 0, "Should find curated quotes in DB")
    for (const q of hasContextQuotes) {
      const hasMeaning = Boolean(q.meaning && q.meaning.trim())
      const hasHistorical = Boolean(q.historicalContext && q.historicalContext.trim())
      const hasModern = Boolean(q.modernRelevance && q.modernRelevance.trim())
      assert.ok(hasMeaning || hasHistorical || hasModern, "Must have at least one enriched field")
    }

    const rows = await prisma.$queryRaw<Array<{ hasContext: number; noContext: number; total: number }>>`
      SELECT
        COUNT(*)::int AS "total",
        COUNT(*) FILTER (
          WHERE ("meaning" IS NOT NULL AND TRIM("meaning") <> '')
             OR ("historicalContext" IS NOT NULL AND TRIM("historicalContext") <> '')
             OR ("modernRelevance" IS NOT NULL AND TRIM("modernRelevance") <> '')
        )::int AS "hasContext",
        COUNT(*) FILTER (
          WHERE ("meaning" IS NULL OR TRIM("meaning") = '')
            AND ("historicalContext" IS NULL OR TRIM("historicalContext") = '')
            AND ("modernRelevance" IS NULL OR TRIM("modernRelevance") = '')
        )::int AS "noContext"
      FROM "Quote" q
      WHERE "deletedAt" IS NULL;
    `

    const { total, hasContext, noContext } = rows[0]
    assert.equal(hasContext, hasContextQuotes.length, "Raw SQL hasContext count must match Prisma count")
    assert.equal(hasContext + noContext, total, "noContext and hasContext must partition the entire catalog")
  })

  it("queries featured quotes correctly and matches raw SQL count", async () => {
    const featuredQuotes = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        isFeatured: true,
      },
      select: {
        id: true,
        isFeatured: true,
      },
    })

    for (const q of featuredQuotes) {
      assert.equal(q.isFeatured, true, "Quote must be featured")
    }

    const rows = await prisma.$queryRaw<Array<{ featured: number }>>`
      SELECT
        COUNT(*) FILTER (
          WHERE "isFeatured" = true
        )::int AS "featured"
      FROM "Quote" q
      WHERE "deletedAt" IS NULL;
    `

    assert.equal(rows[0].featured, featuredQuotes.length, "Raw SQL featured count must match Prisma count")
  })

  it("filters quotes by category slug and category UUID", async () => {
    // Find an active category that contains quotes
    const category = await prisma.category.findFirst({
      where: {
        quotes: {
          some: {
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    })

    assert.ok(category, "Should find at least one category with quotes")
    assert.ok(isValidUuid(category.id), "Category id must be a valid UUID")

    // 1. Filter by category slug
    const quotesBySlug = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        categorySlug: category.slug,
      },
      select: {
        id: true,
        categoryId: true,
        categorySlug: true,
      },
    })

    assert.ok(quotesBySlug.length > 0, "Should return quotes for category slug")
    for (const q of quotesBySlug) {
      assert.equal(q.categorySlug, category.slug, "Quote categorySlug must match")
      assert.equal(q.categoryId, category.id, "Quote categoryId must match category id")
    }

    // 2. Filter by category UUID
    const quotesById = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        categoryId: category.id,
      },
      select: {
        id: true,
        categoryId: true,
        categorySlug: true,
      },
    })

    assert.equal(
      quotesById.length,
      quotesBySlug.length,
      "Quotes filtered by category UUID must match count of quotes filtered by category slug"
    )

    // 3. Filter by category combined with a status or attribute (e.g. isFeatured or status)
    const featuredCategoryQuotes = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        AND: [
          { categorySlug: category.slug },
          { isFeatured: true },
        ],
      },
      select: {
        id: true,
        isFeatured: true,
        categorySlug: true,
      },
    })

    for (const q of featuredCategoryQuotes) {
      assert.equal(q.categorySlug, category.slug)
      assert.equal(q.isFeatured, true)
    }
  })

  it("filters quotes by author slug and author UUID", async () => {
    // Find an author that has active quotes
    const author = await prisma.author.findFirst({
      where: {
        quotes: {
          some: {
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    })

    assert.ok(author, "Should find at least one author with active quotes")
    assert.ok(isValidUuid(author.id), "Author id must be a valid UUID")

    // 1. Filter by author slug
    const quotesBySlug = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        OR: [
          { authorSlug: author.slug },
          { author: { slug: author.slug } },
        ],
      },
      select: {
        id: true,
        authorId: true,
        authorSlug: true,
        author: { select: { slug: true } },
      },
    })

    assert.ok(quotesBySlug.length > 0, "Should return quotes for author slug")
    for (const q of quotesBySlug) {
      assert.equal(q.authorId, author.id, "Quote authorId must match author id")
      const matchesSlug = q.authorSlug === author.slug || q.author?.slug === author.slug
      assert.ok(matchesSlug, `Quote ${q.id} must match author slug`)
    }

    // 2. Filter by author UUID
    const quotesById = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        authorId: author.id,
      },
      select: {
        id: true,
        authorId: true,
      },
    })

    assert.equal(
      quotesById.length,
      quotesBySlug.length,
      "Quotes filtered by author UUID must match quotes filtered by author slug"
    )

    // 3. Combined filter: Author + Status or isFeatured
    const authorQuotesPublished = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        AND: [
          { authorId: author.id },
          { status: "PUBLISHED" },
        ],
      },
      select: {
        id: true,
        authorId: true,
        status: true,
      },
    })

    for (const q of authorQuotesPublished) {
      assert.equal(q.authorId, author.id)
      assert.equal(q.status, "PUBLISHED")
    }
  })

  it("queries quotes with status and verification filters composed together", async () => {
    // 1. Status: PUBLISHED, Verified: true
    const publishedVerified = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        AND: [
          { status: "PUBLISHED" },
          { isVerified: true },
        ],
      },
      select: {
        id: true,
        status: true,
        isVerified: true,
      },
      take: 10,
    })

    for (const q of publishedVerified) {
      assert.equal(q.status, "PUBLISHED")
      assert.equal(q.isVerified, true)
    }

    // 2. Status: DRAFT, Verified: false
    const draftUnverified = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        AND: [
          { status: { in: ["DRAFT", "REVIEW"] } },
          { isVerified: false },
        ],
      },
      select: {
        id: true,
        status: true,
        isVerified: true,
      },
      take: 10,
    })

    for (const q of draftUnverified) {
      assert.ok(["DRAFT", "REVIEW"].includes(q.status))
      assert.equal(q.isVerified, false)
    }

    // 3. Multi-dimensional filter composition:
    // Tab (has-context) + Status (PUBLISHED) + Verified (true)
    const multiComposed = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        OR: [
          { AND: [{ meaning: { not: null } }, { meaning: { not: "" } }] },
          { AND: [{ historicalContext: { not: null } }, { historicalContext: { not: "" } }] },
          { AND: [{ modernRelevance: { not: null } }, { modernRelevance: { not: "" } }] },
        ],
        AND: [
          { status: "PUBLISHED" },
          { isVerified: true },
        ],
      },
      select: {
        id: true,
        status: true,
        isVerified: true,
        meaning: true,
        historicalContext: true,
        modernRelevance: true,
      },
      take: 5,
    })

    for (const q of multiComposed) {
      assert.equal(q.status, "PUBLISHED")
      assert.equal(q.isVerified, true)
      const hasAnyContext =
        Boolean(q.meaning && q.meaning.trim()) ||
        Boolean(q.historicalContext && q.historicalContext.trim()) ||
        Boolean(q.modernRelevance && q.modernRelevance.trim())
      assert.ok(hasAnyContext, `Quote ${q.id} should have context`)
    }
  })

  it("queries quotes with attribution status dropdown filter and composed dimensions", async () => {
    // 1. Filter quotes specifically by DISPUTED attribution status
    const disputedQuotes = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        attributionStatus: "DISPUTED",
      },
      select: {
        id: true,
        attributionStatus: true,
      },
      take: 10,
    })

    for (const q of disputedQuotes) {
      assert.equal(q.attributionStatus, "DISPUTED")
    }

    // 2. Filter quotes specifically by CONFIRMED attribution status
    const confirmedQuotes = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        attributionStatus: "CONFIRMED",
      },
      select: {
        id: true,
        attributionStatus: true,
      },
      take: 10,
    })

    for (const q of confirmedQuotes) {
      assert.equal(q.attributionStatus, "CONFIRMED")
    }

    // 3. Multi-dimensional composition: Status (PUBLISHED) + Verified (true) + Attribution (CONFIRMED)
    const composedQuotes = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        AND: [
          { status: "PUBLISHED" },
          { isVerified: true },
          { attributionStatus: "CONFIRMED" },
        ],
      },
      select: {
        id: true,
        status: true,
        isVerified: true,
        attributionStatus: true,
      },
      take: 10,
    })

    for (const q of composedQuotes) {
      assert.equal(q.status, "PUBLISHED")
      assert.equal(q.isVerified, true)
      assert.equal(q.attributionStatus, "CONFIRMED")
    }
  })

  it("filters quotes by tag slug and tag UUID and verifies tag badges structure", async () => {
    // 1. Find a tag that has active quotes
    const tag = await prisma.tag.findFirst({
      where: {
        quotes: {
          some: {
            quote: {
              deletedAt: null,
            },
          },
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    })

    assert.ok(tag, "Should find at least one tag with active quotes")
    assert.ok(isValidUuid(tag.id), "Tag id must be a valid UUID")

    // 2. Query quotes by tag slug
    const quotesBySlug = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        tags: {
          some: {
            tag: { slug: tag.slug },
          },
        },
      },
      select: {
        id: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      take: 10,
    })

    assert.ok(quotesBySlug.length > 0, "Should return quotes for tag slug")
    for (const q of quotesBySlug) {
      const hasMatchingTag = q.tags.some((qt) => qt.tag.slug === tag.slug)
      assert.ok(hasMatchingTag, `Quote ${q.id} must contain tag ${tag.slug}`)
    }

    // 3. Query quotes by tag UUID
    const quotesById = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        tags: {
          some: {
            tagId: tag.id,
          },
        },
      },
      select: {
        id: true,
      },
      take: 10,
    })

    assert.equal(
      quotesById.length,
      quotesBySlug.length,
      "Quotes filtered by tag UUID must match quotes filtered by tag slug"
    )

    // 4. Combined filter: Tag + Status (PUBLISHED)
    const publishedTagQuotes = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        AND: [
          { tags: { some: { tag: { slug: tag.slug } } } },
          { status: "PUBLISHED" },
        ],
      },
      select: {
        id: true,
        status: true,
      },
      take: 5,
    })

    for (const q of publishedTagQuotes) {
      assert.equal(q.status, "PUBLISHED")
    }
  })
})
