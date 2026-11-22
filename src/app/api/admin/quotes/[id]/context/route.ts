import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { quoteContextUpdateSchema } from "@/lib/validation/quote"
import { isValidUuid } from "@/lib/api/route-helpers"
import { recordAuditLog } from "@/lib/audit"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { revalidatePublicSurfaces, revalidateQuote } from "@/lib/revalidation"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(
  _req: Request,
  context: Context
) {
  const { id } = await context.params
  if (!isValidUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { response } = await requireAdmin()
  if (response) return response

  const quote = await prisma.quote.findUnique({
    where: { id },
    select: {
      id: true,
      content: true,
      meaning: true,
      historicalContext: true,
      modernRelevance: true,
      authorName: true,
      author: { select: { name: true } },
      category: { select: { name: true } },
    },
  })

  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    id: quote.id,
    content: quote.content,
    meaning: quote.meaning,
    historicalContext: quote.historicalContext,
    modernRelevance: quote.modernRelevance,
    authorName: quote.author?.name || quote.authorName,
    categoryName: quote.category?.name,
  })
}

export async function PATCH(
  req: Request,
  context: Context
) {
  const { id } = await context.params
  if (!isValidUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  const parsed = quoteContextUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.quote.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      status: true,
      content: true,
      author: { select: { slug: true } },
      category: { select: { slug: true } },
      tags: { select: { tag: { select: { slug: true } } } },
    },
  })

  if (!existing) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 })
  }

  const meaning = parsed.data.meaning !== undefined ? (parsed.data.meaning?.trim() || null) : undefined
  const historicalContext = parsed.data.historicalContext !== undefined ? (parsed.data.historicalContext?.trim() || null) : undefined
  const modernRelevance = parsed.data.modernRelevance !== undefined ? (parsed.data.modernRelevance?.trim() || null) : undefined

  const updatedQuote = await prisma.quote.update({
    where: { id },
    data: {
      ...(meaning !== undefined && { meaning }),
      ...(historicalContext !== undefined && { historicalContext }),
      ...(modernRelevance !== undefined && { modernRelevance }),
    },
    select: {
      id: true,
      meaning: true,
      historicalContext: true,
      modernRelevance: true,
      status: true,
      slug: true,
    },
  })

  if (existing.status === "PUBLISHED") {
    revalidatePublicSurfaces()
    revalidateQuote(existing.slug, {
      authorSlug: existing.author?.slug,
      categorySlug: existing.category?.slug,
      tagSlugs: existing.tags.map((t) => t.tag.slug),
    })
  }

  await recordAuditLog({
    action: "UPDATE",
    entityType: "QUOTE",
    entityId: id,
    entityName: existing.content?.slice(0, 100),
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.name,
    details: {
      action: "updateContext",
      hasMeaning: Boolean(updatedQuote.meaning),
      hasHistoricalContext: Boolean(updatedQuote.historicalContext),
      hasModernRelevance: Boolean(updatedQuote.modernRelevance),
    },
    req,
  })

  return NextResponse.json({
    success: true,
    quote: updatedQuote,
  })
}

