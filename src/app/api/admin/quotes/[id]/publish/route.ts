import { NextResponse } from "next/server"
import { QuoteStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { isValidUuid } from "@/lib/api/route-helpers"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { recordAuditLog } from "@/lib/audit"
import { revalidatePublicSurfaces, revalidateQuote } from "@/lib/revalidation"
import { parseDateTimeLocalInAppTimeZone } from "@/lib/datetime"
import { deriveAdminSortKey } from "@/lib/quoteAutomation"
import {
  recalculateAuthorQuoteCounts,
  recalculateCategoryQuoteCounts,
  recalculateSourceQuoteCounts,
  recalculateTagQuoteCounts,
} from "@/lib/quoteCountSync"

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, context: Context) {
  const { id } = await context.params
  if (!isValidUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const body = (await req.json().catch(() => ({}))) as {
    status?: unknown
    publishedAt?: unknown
    isFeatured?: unknown
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
      publishedAt: true,
      authorId: true,
      sourceId: true,
      categoryId: true,
      author: { select: { slug: true } },
      category: { select: { slug: true } },
      tags: { select: { tagId: true, tag: { select: { slug: true } } } },
    },
  })

  if (!existing) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 })
  }

  const validStatuses: QuoteStatus[] = ["PUBLISHED", "DRAFT", "REVIEW", "ARCHIVED"]
  const nextStatus: QuoteStatus =
    typeof body.status === "string" && validStatuses.includes(body.status.trim() as QuoteStatus)
      ? (body.status.trim() as QuoteStatus)
      : "PUBLISHED"

  const isPublishing = nextStatus === "PUBLISHED"
  const nextIsFeatured =
    typeof body.isFeatured === "boolean" ? body.isFeatured : existing.isFeatured

  let nextPublishedAt: Date | null = existing.publishedAt

  if (typeof body.publishedAt === "string" && body.publishedAt.trim()) {
    nextPublishedAt = parseDateTimeLocalInAppTimeZone(body.publishedAt.trim())
  } else if (isPublishing && !existing.publishedAt) {
    nextPublishedAt = new Date()
  } else if (!isPublishing && body.publishedAt === null) {
    nextPublishedAt = null
  }

  const nextAdminSortKey = deriveAdminSortKey({
    status: nextStatus,
    isFeatured: nextIsFeatured,
    isVerified: existing.isVerified,
    attributionStatus: existing.attributionStatus,
  })

  const updatedQuote = await prisma.$transaction(async (tx) => {
    const updated = await tx.quote.update({
      where: { id },
      data: {
        status: nextStatus,
        publishedAt: nextPublishedAt,
        publishedById: isPublishing ? admin.id : existing.status === "PUBLISHED" ? null : undefined,
        isFeatured: nextIsFeatured,
        adminSortKey: nextAdminSortKey,
      },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        isFeatured: true,
        adminSortKey: true,
        slug: true,
      },
    })

    const statusChanged = existing.status !== nextStatus
    if (statusChanged && (existing.status === "PUBLISHED" || nextStatus === "PUBLISHED")) {
      if (existing.authorId) await recalculateAuthorQuoteCounts(tx, [existing.authorId])
      if (existing.sourceId) await recalculateSourceQuoteCounts(tx, [existing.sourceId])
      if (existing.categoryId) await recalculateCategoryQuoteCounts(tx, [existing.categoryId])
      if (existing.tags.length > 0) {
        await recalculateTagQuoteCounts(tx, existing.tags.map((t) => t.tagId))
      }
    }

    return updated
  })

  if (existing.status === "PUBLISHED" || nextStatus === "PUBLISHED") {
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
      action: isPublishing ? "publishQuote" : "unpublishQuote",
      previousStatus: existing.status,
      nextStatus,
      isFeatured: updatedQuote.isFeatured,
      publishedAt: updatedQuote.publishedAt?.toISOString() || null,
    },
    req,
  })

  return NextResponse.json({
    success: true,
    quote: updatedQuote,
  })
}

export async function PATCH(req: Request, context: Context) {
  return POST(req, context)
}

