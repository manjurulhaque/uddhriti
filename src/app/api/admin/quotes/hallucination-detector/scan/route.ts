import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { scanQuotesForHallucinations, type HallucinationScanInput } from "@/lib/quotes/hallucination-detector"

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "bulk")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  const input = (typeof body === "object" && body !== null ? body : {}) as HallucinationScanInput

  try {
    const result = await scanQuotesForHallucinations({
      quoteIds: Array.isArray(input.quoteIds) ? input.quoteIds : undefined,
      authorId: typeof input.authorId === "string" ? input.authorId : undefined,
      filter: input.filter,
      limit: typeof input.limit === "number" ? input.limit : 20,
      onlyHighRisk: Boolean(input.onlyHighRisk),
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("Hallucination detector scan error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run hallucination scan" },
      { status: 500 }
    )
  }
}
