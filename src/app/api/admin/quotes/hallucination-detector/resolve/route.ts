import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { resolveHallucination, type ResolveHallucinationInput } from "@/lib/quotes/hallucination-detector"
import { revalidatePublicSurfaces } from "@/lib/revalidation"
import { recordAuditLog } from "@/lib/audit"

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const { quoteId, action, actualAuthorName, verificationNote } = body as ResolveHallucinationInput

  if (!quoteId || !action) {
    return NextResponse.json({ error: "quoteId and action are required" }, { status: 400 })
  }

  try {
    const outcome = await resolveHallucination({
      quoteId,
      action,
      actualAuthorName,
      verificationNote,
    })

    revalidatePublicSurfaces()

    await recordAuditLog({
      action: "UPDATE",
      entityType: "QUOTE",
      entityId: quoteId,
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      details: {
        action: "resolveHallucination",
        resolutionAction: action,
        actualAuthorName,
        newAttributionStatus: outcome.quote.attributionStatus,
        newStatus: outcome.quote.status,
      },
      req,
    }).catch(() => null)

    return NextResponse.json(outcome)
  } catch (error: unknown) {
    console.error("Hallucination resolution error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve hallucination" },
      { status: 500 }
    )
  }
}
