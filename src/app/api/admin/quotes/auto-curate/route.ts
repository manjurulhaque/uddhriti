import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { autoCurateQuote } from "@/lib/quotes/auto-curator"

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const { content, currentAuthorId, currentCategoryId } = body as {
    content?: unknown
    currentAuthorId?: unknown
    currentCategoryId?: unknown
  }

  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "Quotation content is required to run auto-curate" },
      { status: 400 }
    )
  }

  try {
    const result = await autoCurateQuote({
      content: content.trim(),
      currentAuthorId: typeof currentAuthorId === "string" ? currentAuthorId.trim() : undefined,
      currentCategoryId: typeof currentCategoryId === "string" ? currentCategoryId.trim() : undefined,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("Auto-curate API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to auto-curate quotation" },
      { status: 500 }
    )
  }
}
