import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { isValidUuid } from "@/lib/api/route-helpers"
import {
  generateQuoteContextDraft,
  streamQuoteContextDraft,
  type QuoteContextDraftInput,
  type ContextDimensionField,
} from "@/lib/quotes/context-generator"

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const { quoteId, content, authorName, categoryName, sourceTitle, stream, targetField } = body as {
    quoteId?: unknown
    content?: unknown
    authorName?: unknown
    categoryName?: unknown
    sourceTitle?: unknown
    stream?: unknown
    targetField?: unknown
  }

  let draftInput: QuoteContextDraftInput

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

    draftInput = {
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
    draftInput = {
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

  const wantsStream =
    stream === true ||
    req.headers.get("accept")?.includes("text/event-stream") ||
    new URL(req.url).searchParams.get("stream") === "true"

  const validTargetField: ContextDimensionField | undefined =
    targetField === "meaning" || targetField === "historicalContext" || targetField === "modernRelevance"
      ? targetField
      : undefined

  if (wantsStream) {
    const sseStream = streamQuoteContextDraft(draftInput, {
      targetField: validTargetField,
      signal: req.signal,
    })

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  }

  const result = await generateQuoteContextDraft(draftInput)

  return NextResponse.json({
    success: true,
    draft: result.draft,
    provider: result.provider,
  })
}
