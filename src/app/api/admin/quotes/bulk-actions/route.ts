import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import {
  recalculateAuthorQuoteCounts,
  recalculateSourceQuoteCounts,
  recalculateTagQuoteCounts,
} from "@/lib/quoteCountSync"

type BulkActionPayload = {
  quoteIds?: unknown
  action?: unknown
  authorId?: unknown
  sourceId?: unknown
  tagIds?: unknown
}

function uniqueStringList(value: unknown) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((entry): entry is string => typeof entry === "string")))
}

function compactIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)))
}

export async function POST(req: Request) {
  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as BulkActionPayload | null
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const quoteIds = uniqueStringList(body.quoteIds)
  if (quoteIds.length === 0) {
    return NextResponse.json({ error: "quoteIds are required" }, { status: 400 })
  }
  if (quoteIds.length > 500) {
    return NextResponse.json({ error: "You can update up to 500 quotes at once" }, { status: 400 })
  }

  const action = body.action
  if (action !== "setAuthor" && action !== "setSource" && action !== "clearSource" && action !== "addTags" && action !== "removeTags") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  if (action === "setAuthor") {
    const authorId = typeof body.authorId === "string" ? body.authorId : ""
    if (!authorId) {
      return NextResponse.json({ error: "authorId is required for setAuthor" }, { status: 400 })
    }

    const author = await prisma.author.findUnique({
      where: { id: authorId },
      select: { id: true, name: true, slug: true },
    })
    if (!author) {
      return NextResponse.json({ error: "Invalid authorId" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const targetQuotes = await tx.quote.findMany({
        where: { id: { in: quoteIds }, deletedAt: null },
        select: { authorId: true },
      })

      const previousAuthorIds = compactIds(targetQuotes.map((quote) => quote.authorId))

      const updated = await tx.quote.updateMany({
        where: { id: { in: quoteIds }, deletedAt: null },
        data: {
          authorId: author.id,
          authorName: author.name,
          authorSlug: author.slug,
        },
      })

      await recalculateAuthorQuoteCounts(tx, [...previousAuthorIds, author.id])
      return updated
    })

    return NextResponse.json({ success: true, updatedCount: result.count })
  }

  if (action === "setSource") {
    const sourceId = typeof body.sourceId === "string" ? body.sourceId : ""
    if (!sourceId) {
      return NextResponse.json({ error: "sourceId is required for setSource" }, { status: 400 })
    }

    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      select: { id: true },
    })
    if (!source) {
      return NextResponse.json({ error: "Invalid sourceId" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const targetQuotes = await tx.quote.findMany({
        where: { id: { in: quoteIds }, deletedAt: null },
        select: { sourceId: true },
      })

      const previousSourceIds = compactIds(targetQuotes.map((quote) => quote.sourceId))

      const updated = await tx.quote.updateMany({
        where: { id: { in: quoteIds }, deletedAt: null },
        data: { sourceId: source.id },
      })

      await recalculateSourceQuoteCounts(tx, [...previousSourceIds, source.id])
      return updated
    })

    return NextResponse.json({ success: true, updatedCount: result.count })
  }

  if (action === "clearSource") {
    const result = await prisma.$transaction(async (tx) => {
      const targetQuotes = await tx.quote.findMany({
        where: { id: { in: quoteIds }, deletedAt: null },
        select: { sourceId: true },
      })
      const previousSourceIds = compactIds(targetQuotes.map((quote) => quote.sourceId))

      const updated = await tx.quote.updateMany({
        where: { id: { in: quoteIds }, deletedAt: null },
        data: { sourceId: null },
      })

      await recalculateSourceQuoteCounts(tx, previousSourceIds)
      return updated
    })

    return NextResponse.json({ success: true, updatedCount: result.count })
  }

  const tagIds = uniqueStringList(body.tagIds)
  if (tagIds.length === 0) {
    return NextResponse.json({ error: "tagIds are required for tag actions" }, { status: 400 })
  }

  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
    select: { id: true },
  })
  if (tags.length === 0) {
    return NextResponse.json({ error: "No valid tags selected" }, { status: 400 })
  }

  const validTagIds = tags.map((tag) => tag.id)

  const result = await prisma.$transaction(async (tx) => {
    const targetQuotes = await tx.quote.findMany({
      where: { id: { in: quoteIds }, deletedAt: null },
      select: { id: true },
    })
    const targetQuoteIds = targetQuotes.map((quote) => quote.id)
    if (targetQuoteIds.length === 0) {
      return { updatedCount: 0 }
    }

    if (action === "addTags") {
      const rowsToCreate = targetQuoteIds.flatMap((quoteId) => validTagIds.map((tagId) => ({ quoteId, tagId })))
      await tx.quoteTag.createMany({
        data: rowsToCreate,
        skipDuplicates: true,
      })
    } else {
      await tx.quoteTag.deleteMany({
        where: {
          quoteId: { in: targetQuoteIds },
          tagId: { in: validTagIds },
        },
      })
    }

    await tx.$executeRaw`
      UPDATE "Quote" q
      SET "tagSlugs" = tag_data.slugs
      FROM (
        SELECT target.id, COALESCE(array_agg(t.slug ORDER BY t.slug) FILTER (WHERE t.slug IS NOT NULL), ARRAY[]::text[]) AS slugs
        FROM unnest(ARRAY[${Prisma.join(targetQuoteIds)}]::uuid[]) AS target(id)
        LEFT JOIN "QuoteTag" qt ON qt."quoteId" = target.id
        LEFT JOIN "Tag" t ON t.id = qt."tagId"
        GROUP BY target.id
      ) tag_data
      WHERE q.id = tag_data.id
    `

    await recalculateTagQuoteCounts(tx, validTagIds)

    return { updatedCount: targetQuoteIds.length }
  })

  return NextResponse.json({ success: true, updatedCount: result.updatedCount })
}
