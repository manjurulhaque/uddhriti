import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import {
  detectAuthorFromQuoteContent,
  semanticSearchAuthors,
  matchAuthorsLocal,
  type AuthorRecord,
} from "@/lib/quotes/author-matcher"

// Cache author list in memory for fast AI selection queries (TTL 60 seconds)
let cachedAuthors: { data: AuthorRecord[]; timestamp: number } | null = null
const CACHE_TTL_MS = 60 * 1000

async function getAuthorsForMatching(): Promise<AuthorRecord[]> {
  const now = Date.now()
  if (cachedAuthors && now - cachedAuthors.timestamp < CACHE_TTL_MS) {
    return cachedAuthors.data
  }

  const authors = await prisma.author.findMany({
    orderBy: [{ quoteCount: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      profession: true,
      nationality: true,
      birthYear: true,
      deathYear: true,
      quoteCount: true,
    },
  })

  cachedAuthors = { data: authors, timestamp: now }
  return authors
}

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const { action, content, query, limit, useAI } = body as {
    action?: unknown
    content?: unknown
    query?: unknown
    limit?: unknown
    useAI?: unknown
  }

  const authors = await getAuthorsForMatching()
  const safeLimit = typeof limit === "number" && limit > 0 && limit <= 100 ? limit : 25

  // Action 1: Detect author directly from quotation content
  if (action === "detectFromContent") {
    const rawContent = typeof content === "string" ? content.trim() : ""
    if (!rawContent) {
      return NextResponse.json(
        { error: "Content is required for quote-based author detection" },
        { status: 400 }
      )
    }

    const result = await detectAuthorFromQuoteContent(rawContent, authors)
    return NextResponse.json({
      success: true,
      detectedAuthor: result.detectedAuthor,
      candidates: result.candidates,
      suggestedAuthorName: result.suggestedAuthorName,
      confidence: result.confidence,
      rationale: result.rationale,
      provider: result.provider,
    })
  }

  // Action 2: Semantic or typo-tolerant search
  if (action === "search") {
    const rawQuery = typeof query === "string" ? query.trim() : ""
    const shouldQueryAI = Boolean(useAI)

    const result = await semanticSearchAuthors(rawQuery, authors, safeLimit, shouldQueryAI)
    return NextResponse.json({
      success: true,
      matches: result.matches,
      provider: result.provider,
      rationale: result.rationale,
    })
  }

  // Action 3: Quick local match (instant server-side response)
  const rawQuery = typeof query === "string" ? query.trim() : ""
  const matches = matchAuthorsLocal(rawQuery, authors, safeLimit)
  return NextResponse.json({
    success: true,
    matches,
    provider: "heuristic",
  })
}

