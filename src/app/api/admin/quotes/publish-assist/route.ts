import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { isValidUuid } from "@/lib/api/route-helpers"
import {
  generateQuotePublishAssist,
  type QuotePublishAssistInput,
} from "@/lib/quotes/publishing-engine"

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const {
    quoteId,
    content,
    authorName,
    categoryName,
    sourceTitle,
    tags,
    meaning,
    historicalContext,
    modernRelevance,
    isVerified,
    attributionStatus,
    isFeatured,
  } = body as {
    quoteId?: unknown
    content?: unknown
    authorName?: unknown
    categoryName?: unknown
    sourceTitle?: unknown
    tags?: unknown
    meaning?: unknown
    historicalContext?: unknown
    modernRelevance?: unknown
    isVerified?: unknown
    attributionStatus?: unknown
    isFeatured?: unknown
  }

  let assistInput: QuotePublishAssistInput

  if (typeof quoteId === "string" && isValidUuid(quoteId.trim())) {
    const existing = await prisma.quote.findUnique({
      where: { id: quoteId.trim() },
      select: {
        id: true,
        content: true,
        slug: true,
        authorName: true,
        author: { select: { name: true } },
        category: { select: { name: true } },
        source: { select: { title: true } },
        meaning: true,
        historicalContext: true,
        modernRelevance: true,
        isVerified: true,
        attributionStatus: true,
        isFeatured: true,
        tags: { select: { tag: { select: { name: true } } } },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    assistInput = {
      content: typeof content === "string" && content.trim() ? content.trim() : existing.content,
      authorName:
        typeof authorName === "string" && authorName.trim()
          ? authorName.trim()
          : existing.author?.name || existing.authorName,
      categoryName:
        typeof categoryName === "string" && categoryName.trim()
          ? categoryName.trim()
          : existing.category?.name,
      sourceTitle:
        typeof sourceTitle === "string" && sourceTitle.trim()
          ? sourceTitle.trim()
          : existing.source?.title,
      tags:
        Array.isArray(tags) && tags.every((t) => typeof t === "string")
          ? (tags as string[])
          : existing.tags.map((t) => t.tag.name),
      meaning:
        typeof meaning === "string" ? meaning.trim() : existing.meaning,
      historicalContext:
        typeof historicalContext === "string"
          ? historicalContext.trim()
          : existing.historicalContext,
      modernRelevance:
        typeof modernRelevance === "string"
          ? modernRelevance.trim()
          : existing.modernRelevance,
      isVerified:
        typeof isVerified === "boolean" ? isVerified : existing.isVerified,
      attributionStatus:
        typeof attributionStatus === "string"
          ? attributionStatus
          : existing.attributionStatus,
      isFeatured:
        typeof isFeatured === "boolean" ? isFeatured : existing.isFeatured,
      quoteUrl: `https://www.quotzen.com/quotes/${existing.slug}`,
    }
  } else if (typeof content === "string" && content.trim()) {
    assistInput = {
      content: content.trim(),
      authorName: typeof authorName === "string" ? authorName.trim() : undefined,
      categoryName: typeof categoryName === "string" ? categoryName.trim() : undefined,
      sourceTitle: typeof sourceTitle === "string" ? sourceTitle.trim() : undefined,
      tags: Array.isArray(tags) && tags.every((t) => typeof t === "string") ? (tags as string[]) : undefined,
      meaning: typeof meaning === "string" ? meaning.trim() : undefined,
      historicalContext: typeof historicalContext === "string" ? historicalContext.trim() : undefined,
      modernRelevance: typeof modernRelevance === "string" ? modernRelevance.trim() : undefined,
      isVerified: typeof isVerified === "boolean" ? isVerified : undefined,
      attributionStatus: typeof attributionStatus === "string" ? attributionStatus : undefined,
      isFeatured: typeof isFeatured === "boolean" ? isFeatured : undefined,
      quoteUrl: "https://www.quotzen.com",
    }
  } else {
    return NextResponse.json(
      { error: "Either a valid quoteId or content string is required" },
      { status: 400 }
    )
  }

  const result = await generateQuotePublishAssist(assistInput)

  return NextResponse.json({
    success: true,
    assist: result.assist,
    provider: result.provider,
  })
}

