import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { isValidUuid } from "@/lib/api/route-helpers"
import { searchQuoteIds } from "@/lib/quotes/search"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, context: Context) {
  const { id } = await context.params
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid collection ID" }, { status: 400 })
  }

  const { response } = await requireAdmin()
  if (response) return response

  const collection = await prisma.collection.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 })
  }

  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim() || ""
  const limitParam = parseInt(url.searchParams.get("limit") || "25", 10)
  const limit = Math.min(50, Math.max(1, isNaN(limitParam) ? 25 : limitParam))

  // Find all quotes currently in this collection so we can exclude them
  const currentMembers = await prisma.quoteCollection.findMany({
    where: { collectionId: id },
    select: { quoteId: true },
  })
  const excludedIds = currentMembers.map((m) => m.quoteId)

  let quotes: Array<{
    id: string
    content: string
    authorName: string | null
    categorySlug: string
    status: string
    isVerified: boolean
    attributionStatus: string
  }> = []

  if (q.length > 0) {
    // Attempt full-text search first
    const matchedIds = await searchQuoteIds(q, { limit: 100 })
    const candidateIds = matchedIds
      ? matchedIds.filter((matchedId) => !excludedIds.includes(matchedId))
      : []

    if (candidateIds.length > 0) {
      quotes = await prisma.quote.findMany({
        where: {
          id: { in: candidateIds.slice(0, limit) },
          deletedAt: null,
        },
        select: {
          id: true,
          content: true,
          authorName: true,
          categorySlug: true,
          status: true,
          isVerified: true,
          attributionStatus: true,
        },
      })
    } else {
      // Fallback to ILIKE if full-text index didn't yield results (e.g. partial words, stop words)
      quotes = await prisma.quote.findMany({
        where: {
          deletedAt: null,
          ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {}),
          OR: [
            { content: { contains: q, mode: "insensitive" } },
            { authorName: { contains: q, mode: "insensitive" } },
            { categorySlug: { contains: q, mode: "insensitive" } },
          ],
        },
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          authorName: true,
          categorySlug: true,
          status: true,
          isVerified: true,
          attributionStatus: true,
        },
      })
    }
  } else {
    // If no search query, return recent non-deleted quotes
    quotes = await prisma.quote.findMany({
      where: {
        deletedAt: null,
        ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {}),
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        authorName: true,
        categorySlug: true,
        status: true,
        isVerified: true,
        attributionStatus: true,
      },
    })
  }

  return NextResponse.json({ items: quotes })
}
