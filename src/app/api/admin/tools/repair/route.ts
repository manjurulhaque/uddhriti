import { NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { revalidatePublicSurfaces } from "@/lib/revalidation"

export async function POST() {
  const admin = await getAdmin()
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimited = enforceAdminRateLimit(admin.id, "recalculate")
  if (rateLimited) return rateLimited

  try {
    // 1. Clean up dangling/orphaned relations in a transaction
    await prisma.$transaction([
      prisma.$executeRaw`
        DELETE FROM "QuoteTag"
        WHERE "quoteId" NOT IN (SELECT id FROM "Quote")
      `,
      prisma.$executeRaw`
        DELETE FROM "QuoteCollection"
        WHERE "quoteId" NOT IN (SELECT id FROM "Quote")
      `,
      prisma.$executeRaw`
        DELETE FROM "QuoteSlugHistory"
        WHERE "quoteId" NOT IN (SELECT id FROM "Quote")
      `,
    ])

    // 2. Recalculate all quote counts atomically
    await prisma.$transaction([
      prisma.$executeRaw`
        UPDATE "Author" a
        SET "quoteCount" = c.cnt
        FROM (
          SELECT q."authorId" AS id, COUNT(*)::int AS cnt
          FROM "Quote" q
          WHERE q."deletedAt" IS NULL
            AND q.status = 'PUBLISHED'
            AND q."authorId" IS NOT NULL
          GROUP BY q."authorId"
        ) c
        WHERE a.id = c.id
      `,
      prisma.$executeRaw`
        UPDATE "Author"
        SET "quoteCount" = 0
        WHERE id NOT IN (
          SELECT DISTINCT q."authorId"
          FROM "Quote" q
          WHERE q."deletedAt" IS NULL
            AND q.status = 'PUBLISHED'
            AND q."authorId" IS NOT NULL
        )
      `,
      prisma.$executeRaw`
        UPDATE "Source" s
        SET "quoteCount" = c.cnt
        FROM (
          SELECT q."sourceId" AS id, COUNT(*)::int AS cnt
          FROM "Quote" q
          WHERE q."deletedAt" IS NULL
            AND q.status = 'PUBLISHED'
            AND q."sourceId" IS NOT NULL
          GROUP BY q."sourceId"
        ) c
        WHERE s.id = c.id
      `,
      prisma.$executeRaw`
        UPDATE "Source"
        SET "quoteCount" = 0
        WHERE id NOT IN (
          SELECT DISTINCT q."sourceId"
          FROM "Quote" q
          WHERE q."deletedAt" IS NULL
            AND q.status = 'PUBLISHED'
            AND q."sourceId" IS NOT NULL
        )
      `,
      prisma.$executeRaw`
        UPDATE "Category" c
        SET "quoteCount" = s.cnt
        FROM (
          SELECT q."categoryId" AS id, COUNT(*)::int AS cnt
          FROM "Quote" q
          WHERE q."deletedAt" IS NULL
            AND q.status = 'PUBLISHED'
          GROUP BY q."categoryId"
        ) s
        WHERE c.id = s.id
      `,
      prisma.$executeRaw`
        UPDATE "Category"
        SET "quoteCount" = 0
        WHERE id NOT IN (
          SELECT DISTINCT q."categoryId"
          FROM "Quote" q
          WHERE q."deletedAt" IS NULL
            AND q.status = 'PUBLISHED'
        )
      `,
      prisma.$executeRaw`
        UPDATE "Collection" c
        SET "quoteCount" = s.cnt
        FROM (
          SELECT qc."collectionId" AS id, COUNT(*)::int AS cnt
          FROM "QuoteCollection" qc
          INNER JOIN "Quote" q ON q.id = qc."quoteId"
          WHERE q."deletedAt" IS NULL
            AND q.status = 'PUBLISHED'
          GROUP BY qc."collectionId"
        ) s
        WHERE c.id = s.id
      `,
      prisma.$executeRaw`
        UPDATE "Collection"
        SET "quoteCount" = 0
        WHERE id NOT IN (
          SELECT DISTINCT qc."collectionId"
          FROM "QuoteCollection" qc
          INNER JOIN "Quote" q ON q.id = qc."quoteId"
          WHERE q."deletedAt" IS NULL
            AND q.status = 'PUBLISHED'
        )
      `,
      prisma.$executeRaw`
        UPDATE "Tag" t
        SET "quoteCount" = c.cnt
        FROM (
          SELECT qt."tagId" AS id, COUNT(*)::int AS cnt
          FROM "QuoteTag" qt
          INNER JOIN "Quote" q ON q.id = qt."quoteId"
          WHERE q."deletedAt" IS NULL
            AND q.status = 'PUBLISHED'
          GROUP BY qt."tagId"
        ) c
        WHERE t.id = c.id
      `,
      prisma.$executeRaw`
        UPDATE "Tag"
        SET "quoteCount" = 0
        WHERE id NOT IN (
          SELECT DISTINCT qt."tagId"
          FROM "QuoteTag" qt
          INNER JOIN "Quote" q ON q.id = qt."quoteId"
          WHERE q."deletedAt" IS NULL
            AND q.status = 'PUBLISHED'
        )
      `,
    ])

    // 3. Backfill any missing contentHash or normalizedContent
    const quotesMissingHashes = await prisma.quote.findMany({
      where: {
        OR: [
          { contentHash: "" },
          { normalizedContent: null },
          { normalizedContent: "" },
        ],
      },
      select: { id: true, content: true },
      take: 200,
    })

    let backfilledCount = 0
    for (const q of quotesMissingHashes) {
      const normalized = q.content.trim().replace(/\s+/g, " ").toLowerCase()
      const contentHash = crypto.createHash("sha256").update(normalized).digest("hex")

      await prisma.quote.update({
        where: { id: q.id },
        data: {
          normalizedContent: normalized,
          contentHash,
        },
      })
      backfilledCount++
    }

    // 4. Trigger public cache tag revalidations
    revalidatePublicSurfaces()

    return NextResponse.json({
      success: true,
      message: "Automated integrity repair executed successfully.",
      details: {
        countersSynchronized: true,
        orphanedRecordsPurged: true,
        backfilledHashes: backfilledCount,
      },
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "System repair failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
