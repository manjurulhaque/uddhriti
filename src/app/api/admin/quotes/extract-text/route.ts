import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { extractQuotesFromUnstructuredText } from "@/lib/quotes/unstructured-extractor"

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const { text, hintAuthorName, hintSourceTitle, hintCategoryName, maxQuotes } = body as {
    text?: unknown
    hintAuthorName?: unknown
    hintSourceTitle?: unknown
    hintCategoryName?: unknown
    maxQuotes?: unknown
  }

  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json(
      { error: "Please provide source text to extract quotations from." },
      { status: 400 }
    )
  }

  try {
    const result = await extractQuotesFromUnstructuredText({
      text: text.trim(),
      hintAuthorName: typeof hintAuthorName === "string" ? hintAuthorName.trim() : undefined,
      hintSourceTitle: typeof hintSourceTitle === "string" ? hintSourceTitle.trim() : undefined,
      hintCategoryName: typeof hintCategoryName === "string" ? hintCategoryName.trim() : undefined,
      maxQuotes: typeof maxQuotes === "number" ? maxQuotes : undefined,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("Text extraction API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract quotations from text" },
      { status: 500 }
    )
  }
}
