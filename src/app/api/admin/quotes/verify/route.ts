import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { isValidUuid } from "@/lib/api/route-helpers"
import {
  verifyQuoteAttribution,
  type QuoteVerificationInput,
} from "@/lib/quotes/verification-engine"

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const { quoteId, content, authorName, categoryName, sourceTitle } = body as {
    quoteId?: unknown
    content?: unknown
    authorName?: unknown
    categoryName?: unknown
    sourceTitle?: unknown
  }

  let verificationInput: QuoteVerificationInput

  if (typeof quoteId === "string" && isValidUuid(quoteId.trim())) {
    const existing = await prisma.quote.findUnique({
      where: { id: quoteId.trim() },
      select: {
        content: true,
        authorName: true,
        author: { select: { name: true } },
        category: { select: { name: true } },
        source: { select: { title: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    verificationInput = {
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
    }
  } else if (typeof content === "string" && content.trim()) {
    verificationInput = {
      content: content.trim(),
      authorName: typeof authorName === "string" ? authorName.trim() : undefined,
      categoryName: typeof categoryName === "string" ? categoryName.trim() : undefined,
      sourceTitle: typeof sourceTitle === "string" ? sourceTitle.trim() : undefined,
    }
  } else {
    return NextResponse.json(
      { error: "Either a valid quoteId or content string is required" },
      { status: 400 }
    )
  }

  const result = await verifyQuoteAttribution(verificationInput)

  return NextResponse.json({
    success: true,
    assessment: result.assessment,
    provider: result.provider,
  })
}

