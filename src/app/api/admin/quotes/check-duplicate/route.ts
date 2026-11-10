import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { prisma } from "@/lib/prisma"
import { isValidUuid } from "@/lib/api/route-helpers"
import {
  hashQuoteContent,
  findSignificantKeywords,
  calculateQuoteSimilarity,
} from "@/lib/quotes/duplicateDetection"

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "quoteView")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const content = typeof body.content === "string" ? body.content.trim() : ""
  const excludeId = typeof body.excludeId === "string" ? body.excludeId : undefined
  const authorId = typeof body.authorId === "string" ? body.authorId : undefined

  // Too short to reliably test duplicates
  if (content.length < 10) {
    return NextResponse.json({
      isDuplicate: false,
      matchType: "none",
      similarity: 0,
    })
  }

  const safeExcludeId = isValidUuid(excludeId) ? excludeId : undefined
  const safeAuthorId = isValidUuid(authorId) ? authorId : undefined

  // Step 1: Check for exact content hash match
  const contentHash = hashQuoteContent(content)

  const exactMatch = await prisma.quote.findFirst({
    where: {
      contentHash,
      deletedAt: null,
      ...(safeExcludeId ? { NOT: { id: safeExcludeId } } : {}),
    },
    select: {
      id: true,
      content: true,
      status: true,
      slug: true,
      author: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
  })

  if (exactMatch) {
    return NextResponse.json({
      isDuplicate: true,
      matchType: "exact",
      similarity: 100,
      quote: {
        id: exactMatch.id,
        content: exactMatch.content,
        status: exactMatch.status,
        slug: exactMatch.slug,
        authorName: exactMatch.author?.name || null,
        categoryName: exactMatch.category?.name || null,
      },
    })
  }

  // Step 2: Retrieve candidate quotes for fuzzy similarity check
  const keywords = findSignificantKeywords(content, 4)

  if (keywords.length === 0 && !safeAuthorId) {
    return NextResponse.json({
      isDuplicate: false,
      matchType: "none",
      similarity: 0,
    })
  }

  type Candidate = {
    id: string
    content: string
    status: string
    slug: string
    authorName: string | null
    categoryName: string | null
  }

  const candidatesMap = new Map<string, Candidate>()

  // A) Candidate search by author (if specified)
  if (safeAuthorId) {
    const authorQuotes = await prisma.quote.findMany({
      where: {
        authorId: safeAuthorId,
        deletedAt: null,
        ...(safeExcludeId ? { NOT: { id: safeExcludeId } } : {}),
      },
      select: {
        id: true,
        content: true,
        status: true,
        slug: true,
        author: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      take: 40,
    })

    for (const q of authorQuotes) {
      candidatesMap.set(q.id, {
        id: q.id,
        content: q.content,
        status: q.status,
        slug: q.slug,
        authorName: q.author?.name || null,
        categoryName: q.category?.name || null,
      })
    }
  }

  // B) Candidate search by distinctive keywords
  if (keywords.length > 0) {
    const keywordQuotes = await prisma.quote.findMany({
      where: {
        OR: keywords.map((word) => ({
          content: { contains: word, mode: "insensitive" },
        })),
        deletedAt: null,
        ...(safeExcludeId ? { NOT: { id: safeExcludeId } } : {}),
      },
      select: {
        id: true,
        content: true,
        status: true,
        slug: true,
        author: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      take: 30,
    })

    for (const q of keywordQuotes) {
      candidatesMap.set(q.id, {
        id: q.id,
        content: q.content,
        status: q.status,
        slug: q.slug,
        authorName: q.author?.name || null,
        categoryName: q.category?.name || null,
      })
    }
  }

  // Step 3: Compute similarity across all gathered candidates
  let bestCandidate: Candidate | null = null
  let maxSimilarity = 0

  for (const candidate of candidatesMap.values()) {
    const score = calculateQuoteSimilarity(content, candidate.content)
    if (score > maxSimilarity) {
      maxSimilarity = score
      bestCandidate = candidate
    }
  }

  const similarityPercent = Math.round(maxSimilarity * 100)

  // Near match threshold: 75% or higher
  if (bestCandidate && similarityPercent >= 75) {
    return NextResponse.json({
      isDuplicate: true,
      matchType: similarityPercent >= 98 ? "exact" : "near",
      similarity: similarityPercent,
      quote: bestCandidate,
    })
  }

  return NextResponse.json({
    isDuplicate: false,
    matchType: "none",
    similarity: similarityPercent,
  })
}

