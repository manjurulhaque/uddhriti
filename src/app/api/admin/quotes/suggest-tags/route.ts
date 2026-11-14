import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { isValidUuid } from "@/lib/api/route-helpers"
import {
  selectAiAssistedTags,
  type BaseTag,
} from "@/lib/quotes/tag-selector"

// Cached tags in memory with 60s TTL
let cachedTags: { data: BaseTag[]; timestamp: number } | null = null
const CACHE_TTL_MS = 60 * 1000

async function getAvailableTags(): Promise<BaseTag[]> {
  const now = Date.now()
  if (cachedTags && now - cachedTags.timestamp < CACHE_TTL_MS) {
    return cachedTags.data
  }

  const tags = await prisma.tag.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
    },
  })

  cachedTags = { data: tags, timestamp: now }
  return tags
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

  const { quoteId, content, meaning, authorName, categoryName } = body as {
    quoteId?: unknown
    content?: unknown
    meaning?: unknown
    authorName?: unknown
    categoryName?: unknown
  }

  let targetContent = typeof content === "string" ? content.trim() : ""
  let targetMeaning = typeof meaning === "string" ? meaning.trim() : ""
  let targetAuthorName = typeof authorName === "string" ? authorName.trim() : ""
  let targetCategoryName = typeof categoryName === "string" ? categoryName.trim() : ""

  if (!targetContent && typeof quoteId === "string" && isValidUuid(quoteId.trim())) {
    const existing = await prisma.quote.findUnique({
      where: { id: quoteId.trim() },
      select: {
        content: true,
        meaning: true,
        authorName: true,
        author: { select: { name: true } },
        category: { select: { name: true } },
      },
    })
    if (existing) {
      targetContent = existing.content
      targetMeaning = targetMeaning || existing.meaning || ""
      targetAuthorName = targetAuthorName || existing.author?.name || existing.authorName || ""
      targetCategoryName = targetCategoryName || existing.category?.name || ""
    }
  }

  if (!targetContent) {
    return NextResponse.json(
      { error: "Quotation content is required for AI tag selection" },
      { status: 400 }
    )
  }

  const tags = await getAvailableTags()
  const result = await selectAiAssistedTags({
    content: targetContent,
    meaning: targetMeaning || undefined,
    authorName: targetAuthorName || undefined,
    categoryName: targetCategoryName || undefined,
    availableTags: tags,
  })

  return NextResponse.json({
    success: true,
    tags: result.selectedTags,
    distribution: result.distribution,
    overview: result.overview,
    provider: result.provider,
  })
}
