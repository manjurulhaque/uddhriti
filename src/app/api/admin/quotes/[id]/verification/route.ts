import { NextResponse } from "next/server"
import { AttributionStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { quoteVerificationUpdateSchema } from "@/lib/validation/quote"
import { isValidUuid } from "@/lib/api/route-helpers"
import { recordAuditLog } from "@/lib/audit"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { revalidatePublicSurfaces, revalidateQuote } from "@/lib/revalidation"
import { deriveAdminSortKey, deriveVerificationConfidence } from "@/lib/quoteAutomation"

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
      isVerified: true,
      attributionStatus: true,
      verificationConfidence: true,
      verificationNote: true,
      authorName: true,
      author: { select: { name: true } },
      source: { select: { title: true } },
      category: { select: { name: true } },
    },
  })

  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    id: quote.id,
    content: quote.content,
    isVerified: quote.isVerified,
    attributionStatus: quote.attributionStatus,
    verificationConfidence: Number(quote.verificationConfidence),
    verificationNote: quote.verificationNote,
    authorName: quote.author?.name || quote.authorName,
    sourceTitle: quote.source?.title || null,
    categoryName: quote.category?.name || null,
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
  const parsed = quoteVerificationUpdateSchema.safeParse(body)
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
      isFeatured: true,
      isVerified: true,
      attributionStatus: true,
      author: { select: { slug: true } },
      category: { select: { slug: true } },
      tags: { select: { tag: { select: { slug: true } } } },
    },
  })

  if (!existing) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 })
  }

  const nextIsVerified = parsed.data.isVerified !== undefined ? parsed.data.isVerified : existing.isVerified
  const nextAttribution = (parsed.data.attributionStatus !== undefined
    ? parsed.data.attributionStatus
    : existing.attributionStatus) as AttributionStatus

  const nextConfidence =
    parsed.data.verificationConfidence !== undefined
      ? parsed.data.verificationConfidence
      : deriveVerificationConfidence({
          isVerified: nextIsVerified,
          attributionStatus: nextAttribution,
        })

  const nextAdminSortKey = deriveAdminSortKey({
    status: existing.status,
    isFeatured: existing.isFeatured,
    isVerified: nextIsVerified,
    attributionStatus: nextAttribution,
  })

  const verificationNote =
    parsed.data.verificationNote !== undefined
      ? parsed.data.verificationNote?.trim() || null
      : undefined

  const updatedQuote = await prisma.quote.update({
    where: { id },
    data: {
      isVerified: nextIsVerified,
      attributionStatus: nextAttribution,
      verificationConfidence: nextConfidence.toFixed(2),
      adminSortKey: nextAdminSortKey,
      ...(verificationNote !== undefined && { verificationNote }),
    },
    select: {
      id: true,
      isVerified: true,
      attributionStatus: true,
      verificationConfidence: true,
      verificationNote: true,
      adminSortKey: true,
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
      action: "updateVerification",
      isVerified: updatedQuote.isVerified,
      attributionStatus: updatedQuote.attributionStatus,
      verificationConfidence: Number(updatedQuote.verificationConfidence),
      verificationNote: updatedQuote.verificationNote,
    },
    req,
  })

  return NextResponse.json({
    success: true,
    quote: {
      ...updatedQuote,
      verificationConfidence: Number(updatedQuote.verificationConfidence),
    },
  })
}

