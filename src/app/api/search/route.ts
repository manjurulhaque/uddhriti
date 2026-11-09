import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sanitizeSearchQuery } from "@/lib/security/input"
import { enforceIpRateLimit } from "@/lib/api/rate-limit"
import { searchPublicQuoteIds } from "@/lib/quotes/search"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // IP-level rate limiting to prevent automated scraping and database resource exhaustion
  const rateLimited = enforceIpRateLimit(req, "publicApi")
  if (rateLimited) return rateLimited

  const { searchParams } = new URL(req.url)
  const rawQ = searchParams.get("q")
  const query = sanitizeSearchQuery(rawQ, 80)

  if (!query || query.length < 2) {
    return NextResponse.json({
      quotes: [],
      authors: [],
      categories: [],
      tags: [],
    })
  }

  try {
    const [matchingQuoteIds, authors, categories, tags] = await Promise.all([
      // 1. Full-text search quote matches leveraging searchVector GIN index
      searchPublicQuoteIds(query, { limit: 10 }),

      // 2. Thinkers & Authors matching name or profession
      prisma.author.findMany({
        where: {
          quoteCount: { gt: 0 },
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { profession: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          profession: true,
          quoteCount: true,
          birthYear: true,
          deathYear: true,
        },
        orderBy: { quoteCount: "desc" },
        take: 4,
      }),

      // 3. Thematic Categories matching name or description
      prisma.category.findMany({
        where: {
          quoteCount: { gt: 0 },
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          quoteCount: true,
        },
        orderBy: { quoteCount: "desc" },
        take: 3,
      }),

      // 4. Thematic Tags matching name
      prisma.tag.findMany({
        where: {
          quoteCount: { gt: 0 },
          name: { contains: query, mode: "insensitive" },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          quoteCount: true,
        },
        orderBy: { quoteCount: "desc" },
        take: 3,
      }),
    ])

    let quotes: Array<{
      id: string
      slug: string
      content: string
      authorName: string | null
      author: { name: string; slug: string; imageUrl: string | null } | null
      category: { name: string; slug: string }
      isVerified: boolean
    }> = []

    if (matchingQuoteIds !== null) {
      if (matchingQuoteIds.length > 0) {
        const foundQuotes = await prisma.quote.findMany({
          where: {
            id: { in: matchingQuoteIds },
            status: "PUBLISHED",
            deletedAt: null,
          },
          select: {
            id: true,
            slug: true,
            content: true,
            authorName: true,
            author: {
              select: {
                name: true,
                slug: true,
                imageUrl: true,
              },
            },
            category: {
              select: {
                name: true,
                slug: true,
              },
            },
            isVerified: true,
          },
        })
        const quoteMap = new Map(foundQuotes.map((q) => [q.id, q]))
        quotes = matchingQuoteIds
          .map((id) => quoteMap.get(id))
          .filter((q): q is NonNullable<typeof q> => Boolean(q))
          .slice(0, 5)
      }
    } else {
      // Fallback query if FTS expression encountered a syntax/parser error
      quotes = await prisma.quote.findMany({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          OR: [
            { content: { contains: query, mode: "insensitive" } },
            { authorName: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          slug: true,
          content: true,
          authorName: true,
          author: {
            select: {
              name: true,
              slug: true,
              imageUrl: true,
            },
          },
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
          isVerified: true,
        },
        orderBy: [
          { popularityScore: "desc" },
          { views: "desc" },
        ],
        take: 5,
      })
    }

    return NextResponse.json(
      {
        quotes,
        authors,
        categories,
        tags,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    )
  } catch (error) {
    console.error("Search API Error:", error)
    return NextResponse.json(
      { error: "Search query failed" },
      { status: 500 }
    )
  }
}

