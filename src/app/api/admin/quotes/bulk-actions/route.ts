import { NextResponse } from "next/server"
import { QuoteStatus, AttributionStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { isValidUuid, mapPrismaRouteError } from "@/lib/api/route-helpers"
import {
  recalculateAuthorQuoteCounts,
  recalculateCategoryQuoteCounts,
  recalculateSourceQuoteCounts,
  recalculateTagQuoteCounts,
} from "@/lib/quoteCountSync"
import { revalidatePublicSurfaces } from "@/lib/revalidation"
import { recordAuditLog } from "@/lib/audit"

type BulkActionPayload = {
  quoteIds?: unknown
  action?: unknown
  authorId?: unknown
  sourceId?: unknown
  categoryId?: unknown
  tagIds?: unknown
  status?: unknown
  isVerified?: unknown
  attributionStatus?: unknown
}

function uniqueStringList(value: unknown) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((entry): entry is string => typeof entry === "string")))
}

function compactIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)))
}

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "bulk")
  if (rateLimited) return rateLimited

  const body = (await req.json().catch(() => null)) as BulkActionPayload | null
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const quoteIds = uniqueStringList(body.quoteIds)
  if (quoteIds.length === 0) {
    return NextResponse.json({ error: "quoteIds are required" }, { status: 400 })
  }
  if (quoteIds.length > 500) {
    return NextResponse.json({ error: "You can update up to 500 quotes at once" }, { status: 400 })
  }
  if (!quoteIds.every(isValidUuid)) {
    return NextResponse.json({ error: "All quoteIds must be valid UUIDs" }, { status: 400 })
  }

  const action = body.action
  if (
    action !== "setAuthor" &&
    action !== "setSource" &&
    action !== "clearSource" &&
    action !== "setCategory" &&
    action !== "addTags" &&
    action !== "removeTags" &&
    action !== "setStatus" &&
    action !== "setVerification" &&
    action !== "setAttribution"
  ) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  try {
    if (action === "setStatus") {
      const status = typeof body.status === "string" ? body.status.trim() : ""
      if (status !== "PUBLISHED" && status !== "DRAFT" && status !== "ARCHIVED" && status !== "REVIEW") {
        return NextResponse.json({ error: "Valid status value (PUBLISHED, DRAFT, REVIEW, ARCHIVED) is required" }, { status: 400 })
      }

      const result = await prisma.$transaction(async (tx) => {
        const targetQuotes = await tx.quote.findMany({
          where: { id: { in: quoteIds }, deletedAt: null },
          select: {
            id: true,
            status: true,
            authorId: true,
            sourceId: true,
            categoryId: true,
            publishedAt: true,
            tags: { select: { tagId: true } },
          },
        })

        if (targetQuotes.length === 0) {
          return { updatedCount: 0, hadPublished: false }
        }

        const hadPublished = targetQuotes.some((q) => q.status === "PUBLISHED")
        const isPublishing = status === "PUBLISHED"
        const now = new Date()

        await tx.quote.updateMany({
          where: { id: { in: targetQuotes.map((q) => q.id) }, deletedAt: null },
          data: {
            status: status as QuoteStatus,
            publishedAt: isPublishing ? now : undefined,
            publishedById: isPublishing ? admin.id : null,
          },
        })

        const authorIds = compactIds(targetQuotes.map((q) => q.authorId))
        const sourceIds = compactIds(targetQuotes.map((q) => q.sourceId))
        const categoryIds = compactIds(targetQuotes.map((q) => q.categoryId))
        const tagIds = compactIds(targetQuotes.flatMap((q) => q.tags.map((t) => t.tagId)))

        await recalculateAuthorQuoteCounts(tx, authorIds)
        await recalculateSourceQuoteCounts(tx, sourceIds)
        await recalculateCategoryQuoteCounts(tx, categoryIds)
        await recalculateTagQuoteCounts(tx, tagIds)

        return { updatedCount: targetQuotes.length, hadPublished: hadPublished || isPublishing }
      })

      if (result.hadPublished) {
        revalidatePublicSurfaces()
      }

      await recordAuditLog({
        action: "BULK_UPDATE",
        entityType: "QUOTE",
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        details: { action, status, quoteIdsCount: quoteIds.length, updatedCount: result.updatedCount },
        req,
      })

      return NextResponse.json({ success: true, updatedCount: result.updatedCount })
    }

    if (action === "setVerification") {
      const isVerified = Boolean(body.isVerified)

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.quote.updateMany({
          where: { id: { in: quoteIds }, deletedAt: null },
          data: {
            isVerified,
          },
        })

        return updated
      })

      revalidatePublicSurfaces()

      await recordAuditLog({
        action: "BULK_UPDATE",
        entityType: "QUOTE",
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        details: { action, isVerified, quoteIdsCount: quoteIds.length, updatedCount: result.count },
        req,
      })

      return NextResponse.json({ success: true, updatedCount: result.count })
    }

    if (action === "setAttribution") {
      const attributionStatus = typeof body.attributionStatus === "string" ? body.attributionStatus.trim() : ""
      if (
        attributionStatus !== "CONFIRMED" &&
        attributionStatus !== "DISPUTED" &&
        attributionStatus !== "MISATTRIBUTED" &&
        attributionStatus !== "UNKNOWN"
      ) {
        return NextResponse.json(
          { error: "Valid attributionStatus value (CONFIRMED, DISPUTED, MISATTRIBUTED, UNKNOWN) is required" },
          { status: 400 }
        )
      }

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.quote.updateMany({
          where: { id: { in: quoteIds }, deletedAt: null },
          data: {
            attributionStatus: attributionStatus as AttributionStatus,
          },
        })

        return updated
      })

      revalidatePublicSurfaces()

      await recordAuditLog({
        action: "BULK_UPDATE",
        entityType: "QUOTE",
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        details: { action, attributionStatus, quoteIdsCount: quoteIds.length, updatedCount: result.count },
        req,
      })

      return NextResponse.json({ success: true, updatedCount: result.count })
    }

    if (action === "setAuthor") {
      const authorId = typeof body.authorId === "string" ? body.authorId.trim() : ""
      if (!authorId || !isValidUuid(authorId)) {
        return NextResponse.json({ error: "Valid authorId UUID is required for setAuthor" }, { status: 400 })
      }

      const author = await prisma.author.findUnique({
        where: { id: authorId },
        select: { id: true, name: true, slug: true },
      })
      if (!author) {
        return NextResponse.json({ error: "Invalid authorId" }, { status: 400 })
      }

      const result = await prisma.$transaction(async (tx) => {
        const targetQuotes = await tx.quote.findMany({
          where: { id: { in: quoteIds }, deletedAt: null },
          select: { authorId: true },
        })

        const previousAuthorIds = compactIds(targetQuotes.map((quote) => quote.authorId))

        const updated = await tx.quote.updateMany({
          where: { id: { in: quoteIds }, deletedAt: null },
          data: {
            authorId: author.id,
            authorName: author.name,
            authorSlug: author.slug,
          },
        })

        await recalculateAuthorQuoteCounts(tx, [...previousAuthorIds, author.id])
        return updated
      })

      await recordAuditLog({
        action: "BULK_UPDATE",
        entityType: "QUOTE",
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        details: { action, authorId: author.id, authorName: author.name, quoteIdsCount: quoteIds.length, updatedCount: result.count },
        req,
      })

      return NextResponse.json({ success: true, updatedCount: result.count })
    }

    if (action === "setSource") {
      const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : ""
      if (!sourceId || !isValidUuid(sourceId)) {
        return NextResponse.json({ error: "Valid sourceId UUID is required for setSource" }, { status: 400 })
      }

      const source = await prisma.source.findUnique({
        where: { id: sourceId },
        select: { id: true },
      })
      if (!source) {
        return NextResponse.json({ error: "Invalid sourceId" }, { status: 400 })
      }

      const result = await prisma.$transaction(async (tx) => {
        const targetQuotes = await tx.quote.findMany({
          where: { id: { in: quoteIds }, deletedAt: null },
          select: { sourceId: true },
        })

        const previousSourceIds = compactIds(targetQuotes.map((quote) => quote.sourceId))

        const updated = await tx.quote.updateMany({
          where: { id: { in: quoteIds }, deletedAt: null },
          data: { sourceId: source.id },
        })

        await recalculateSourceQuoteCounts(tx, [...previousSourceIds, source.id])
        return updated
      })

      await recordAuditLog({
        action: "BULK_UPDATE",
        entityType: "QUOTE",
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        details: { action, sourceId: source.id, quoteIdsCount: quoteIds.length, updatedCount: result.count },
        req,
      })

      return NextResponse.json({ success: true, updatedCount: result.count })
    }

    if (action === "clearSource") {
      const result = await prisma.$transaction(async (tx) => {
        const targetQuotes = await tx.quote.findMany({
          where: { id: { in: quoteIds }, deletedAt: null },
          select: { sourceId: true },
        })
        const previousSourceIds = compactIds(targetQuotes.map((quote) => quote.sourceId))

        const updated = await tx.quote.updateMany({
          where: { id: { in: quoteIds }, deletedAt: null },
          data: { sourceId: null },
        })

        await recalculateSourceQuoteCounts(tx, previousSourceIds)
        return updated
      })

      await recordAuditLog({
        action: "BULK_UPDATE",
        entityType: "QUOTE",
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        details: { action, quoteIdsCount: quoteIds.length, updatedCount: result.count },
        req,
      })

      return NextResponse.json({ success: true, updatedCount: result.count })
    }

    if (action === "setCategory") {
      const categoryId = typeof body.categoryId === "string" ? body.categoryId.trim() : ""
      if (!categoryId || !isValidUuid(categoryId)) {
        return NextResponse.json({ error: "Valid categoryId UUID is required for setCategory" }, { status: 400 })
      }

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, name: true, slug: true },
      })
      if (!category) {
        return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 })
      }

      const result = await prisma.$transaction(async (tx) => {
        const targetQuotes = await tx.quote.findMany({
          where: { id: { in: quoteIds }, deletedAt: null },
          select: { categoryId: true },
        })

        const previousCategoryIds = compactIds(targetQuotes.map((quote) => quote.categoryId))

        const updated = await tx.quote.updateMany({
          where: { id: { in: quoteIds }, deletedAt: null },
          data: {
            categoryId: category.id,
            categorySlug: category.slug,
          },
        })

        await recalculateCategoryQuoteCounts(tx, [...previousCategoryIds, category.id])
        return updated
      })

      revalidatePublicSurfaces()

      await recordAuditLog({
        action: "BULK_UPDATE",
        entityType: "QUOTE",
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        details: { action, categoryId: category.id, categorySlug: category.slug, quoteIdsCount: quoteIds.length, updatedCount: result.count },
        req,
      })

      return NextResponse.json({ success: true, updatedCount: result.count })
    }

    const tagIds = uniqueStringList(body.tagIds)
    if (tagIds.length === 0) {
      return NextResponse.json({ error: "tagIds are required for tag actions" }, { status: 400 })
    }
    if (!tagIds.every(isValidUuid)) {
      return NextResponse.json({ error: "All tagIds must be valid UUIDs" }, { status: 400 })
    }

    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true },
    })
    if (tags.length === 0) {
      return NextResponse.json({ error: "No valid tags selected" }, { status: 400 })
    }

    const validTagIds = tags.map((tag) => tag.id)

    const result = await prisma.$transaction(async (tx) => {
      const targetQuotes = await tx.quote.findMany({
        where: { id: { in: quoteIds }, deletedAt: null },
        select: { id: true },
      })
      const targetQuoteIds = targetQuotes.map((quote) => quote.id)
      if (targetQuoteIds.length === 0) {
        return { updatedCount: 0 }
      }

      if (action === "addTags") {
        const rowsToCreate = targetQuoteIds.flatMap((quoteId) => validTagIds.map((tagId) => ({ quoteId, tagId })))
        await tx.quoteTag.createMany({
          data: rowsToCreate,
          skipDuplicates: true,
        })
      } else {
        await tx.quoteTag.deleteMany({
          where: {
            quoteId: { in: targetQuoteIds },
            tagId: { in: validTagIds },
          },
        })
      }

      await tx.$executeRaw`
        UPDATE "Quote" q
        SET "tagSlugs" = tag_data.slugs
        FROM (
          SELECT target.id, COALESCE(array_agg(t.slug ORDER BY t.slug) FILTER (WHERE t.slug IS NOT NULL), ARRAY[]::text[]) AS slugs
          FROM unnest(${targetQuoteIds}::uuid[]) AS target(id)
          LEFT JOIN "QuoteTag" qt ON qt."quoteId" = target.id
          LEFT JOIN "Tag" t ON t.id = qt."tagId"
          GROUP BY target.id
        ) tag_data
        WHERE q.id = tag_data.id
      `

      await recalculateTagQuoteCounts(tx, validTagIds)

      return { updatedCount: targetQuoteIds.length }
    })

    await recordAuditLog({
      action: "BULK_UPDATE",
      entityType: "QUOTE",
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      details: { action, tagIds: validTagIds, quoteIdsCount: quoteIds.length, updatedCount: result.updatedCount },
      req,
    })

    return NextResponse.json({ success: true, updatedCount: result.updatedCount })
  } catch (error) {
    console.error("Bulk quote action failed:", error)
    const prismaResponse = mapPrismaRouteError(error, {
      unique: "Unique constraint violation in bulk operation",
      foreignKey: "Foreign key reference failure in bulk operation",
    })
    if (prismaResponse) return prismaResponse
    return NextResponse.json({ error: "Bulk operation failed" }, { status: 500 })
  }
}
