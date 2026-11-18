import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { isValidUuid } from "@/lib/api/route-helpers"
import { enrichQuotesBatch, type BatchEnrichOptions } from "@/lib/quotes/batch-enricher"

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "bulk")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const { quoteIds, filter, limit, options } = body as {
    quoteIds?: unknown
    filter?: unknown
    limit?: unknown
    options?: unknown
  }

  let targetIds: string[] = []

  if (Array.isArray(quoteIds) && quoteIds.length > 0) {
    targetIds = Array.from(new Set(quoteIds.filter((id): id is string => typeof id === "string" && isValidUuid(id))))
  } else if (typeof filter === "string" && filter.trim()) {
    const rawLimit = typeof limit === "number" ? Math.min(Math.max(limit, 1), 50) : 15
    const cleanFilter = filter.trim()

    let whereClause: Record<string, unknown> = { deletedAt: null }

    if (cleanFilter === "no-context") {
      whereClause = { deletedAt: null, meaning: null }
    } else if (cleanFilter === "no-tags") {
      whereClause = { deletedAt: null, tags: { none: {} } }
    } else if (cleanFilter === "missing-source") {
      whereClause = { deletedAt: null, sourceId: null }
    } else if (cleanFilter === "unverified") {
      whereClause = { deletedAt: null, isVerified: false }
    } else if (cleanFilter === "draft") {
      whereClause = { deletedAt: null, status: "DRAFT" }
    }

    const matchingQuotes = await prisma.quote.findMany({
      where: whereClause,
      take: rawLimit,
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })

    targetIds = matchingQuotes.map((q) => q.id)
  }

  if (targetIds.length === 0) {
    return NextResponse.json(
      { error: "No matching quotes found to enrich. Please select quotes or specify a filter." },
      { status: 400 }
    )
  }

  try {
    const result = await enrichQuotesBatch({
      quoteIds: targetIds,
      options: typeof options === "object" && options !== null ? (options as BatchEnrichOptions) : undefined,
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      req,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("Batch enrichment API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute batch AI enrichment" },
      { status: 500 }
    )
  }
}
