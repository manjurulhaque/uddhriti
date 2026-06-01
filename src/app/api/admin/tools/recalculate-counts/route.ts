import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api/admin-auth"

export async function POST() {
  const { response } = await requireSuperAdmin()
  if (response) return response

  const [authorsSet, authorsReset, sourcesSet, sourcesReset, categoriesSet, categoriesReset, collectionsSet, collectionsReset, tagsSet, tagsReset] = await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "Author" a
      SET "quoteCount" = c.cnt
      FROM (
        SELECT q."authorId" AS id, COUNT(*)::int AS cnt
        FROM "Quote" q
        WHERE q."deletedAt" IS NULL
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
      )
    `,
  ])

  return NextResponse.json({
    success: true,
    updatedRows: {
      authorsSet,
      authorsReset,
      sourcesSet,
      sourcesReset,
      categoriesSet,
      categoriesReset,
      collectionsSet,
      collectionsReset,
      tagsSet,
      tagsReset,
    },
  })
}
