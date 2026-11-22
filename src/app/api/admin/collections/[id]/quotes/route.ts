import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { isValidUuid } from "@/lib/api/route-helpers"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { recordAuditLog } from "@/lib/audit"
import { revalidatePublicSurfaces } from "@/lib/revalidation"
import { recalculateCollectionQuoteCounts } from "@/lib/quoteCountSync"
import {
  collectionQuotesAddSchema,
  collectionQuotesRemoveSchema,
  collectionQuotesReorderSchema,
} from "@/lib/validation/collection"
import { parseSafePageNumber, sanitizeSearchQuery } from "@/lib/security/input"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, context: Context) {
  const { id } = await context.params
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid collection ID" }, { status: 400 })
  }

  const { response } = await requireAdmin()
  if (response) return response

  const collection = await prisma.collection.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      visibility: true,
      quoteCount: true,
    },
  })

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 })
  }

  const url = new URL(req.url)
  const page = parseSafePageNumber(url.searchParams.get("page"), 1000)
  const limitParam = parseInt(url.searchParams.get("limit") || "50", 10)
  const limit = Math.min(100, Math.max(1, isNaN(limitParam) ? 50 : limitParam))
  const search = sanitizeSearchQuery(url.searchParams.get("search"))

  const where: Prisma.QuoteCollectionWhereInput = {
    collectionId: id,
    quote: {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { content: { contains: search, mode: "insensitive" } },
              { authorName: { contains: search, mode: "insensitive" } },
              { categorySlug: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  }

  const [total, items] = await Promise.all([
    prisma.quoteCollection.count({ where }),
    prisma.quoteCollection.findMany({
      where,
      orderBy: [
        { position: "asc" },
        { quote: { createdAt: "desc" } },
      ],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        quote: {
          select: {
            id: true,
            content: true,
            status: true,
            authorId: true,
            authorName: true,
            authorSlug: true,
            categorySlug: true,
            isVerified: true,
            attributionStatus: true,
            createdAt: true,
          },
        },
      },
    }),
  ])

  return NextResponse.json({
    collection,
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  })
}

export async function POST(req: Request, context: Context) {
  const { id } = await context.params
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid collection ID" }, { status: 400 })
  }

  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const rawBody = await req.json().catch(() => null)
  const normalizedBody = rawBody && typeof rawBody === "object"
    ? {
        ...rawBody,
        quoteIds: Array.isArray(rawBody.quoteIds)
          ? rawBody.quoteIds
          : typeof rawBody.quoteId === "string"
            ? [rawBody.quoteId]
            : [],
      }
    : null

  const parsed = collectionQuotesAddSchema.safeParse(normalizedBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const collection = await prisma.collection.findUnique({
    where: { id },
    select: { id: true, title: true },
  })

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 })
  }

  const { quoteIds, position } = parsed.data

  try {
    const { addedCount, alreadyInCollectionCount } = await prisma.$transaction(async (tx) => {
      // Find valid quotes that exist and aren't deleted
      const validQuotes = await tx.quote.findMany({
        where: {
          id: { in: quoteIds },
          deletedAt: null,
        },
        select: { id: true },
      })

      const validQuoteIds = validQuotes.map((q) => q.id)
      if (validQuoteIds.length === 0) {
        throw new Error("No valid quotes found to add")
      }

      // Check which ones are already linked
      const existing = await tx.quoteCollection.findMany({
        where: {
          collectionId: id,
          quoteId: { in: validQuoteIds },
        },
        select: { quoteId: true },
      })

      const existingSet = new Set(existing.map((e) => e.quoteId))
      const toAddIds = validQuoteIds.filter((qid) => !existingSet.has(qid))

      if (toAddIds.length > 0) {
        let currentPos = position
        if (currentPos === undefined) {
          const maxPos = await tx.quoteCollection.aggregate({
            where: { collectionId: id },
            _max: { position: true },
          })
          currentPos = (maxPos._max.position ?? 0) + 1
        }

        await tx.quoteCollection.createMany({
          data: toAddIds.map((quoteId, index) => ({
            collectionId: id,
            quoteId,
            position: currentPos + index,
          })),
          skipDuplicates: true,
        })

        await recalculateCollectionQuoteCounts(tx, [id])
      }

      return {
        addedCount: toAddIds.length,
        alreadyInCollectionCount: existingSet.size,
      }
    })

    if (addedCount > 0) {
      revalidatePublicSurfaces()

      await recordAuditLog({
        action: "UPDATE",
        entityType: "COLLECTION",
        entityId: collection.id,
        entityName: collection.title,
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        details: {
          action: "addQuotes",
          addedCount,
          quoteIds,
        },
        req,
      })
    }

    return NextResponse.json({
      success: true,
      addedCount,
      alreadyInCollectionCount,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add quotes to collection"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(req: Request, context: Context) {
  const { id } = await context.params
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid collection ID" }, { status: 400 })
  }

  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  let quoteIds: string[] = []
  const url = new URL(req.url)
  const queryQuoteId = url.searchParams.get("quoteId")
  if (queryQuoteId) {
    quoteIds = [queryQuoteId]
  } else {
    const rawBody = await req.json().catch(() => null)
    if (rawBody && typeof rawBody === "object") {
      if (Array.isArray(rawBody.quoteIds)) {
        quoteIds = rawBody.quoteIds
      } else if (typeof rawBody.quoteId === "string") {
        quoteIds = [rawBody.quoteId]
      }
    }
  }

  const parsed = collectionQuotesRemoveSchema.safeParse({ quoteIds })
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const collection = await prisma.collection.findUnique({
    where: { id },
    select: { id: true, title: true },
  })

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 })
  }

  try {
    const removedCount = await prisma.$transaction(async (tx) => {
      const res = await tx.quoteCollection.deleteMany({
        where: {
          collectionId: id,
          quoteId: { in: parsed.data.quoteIds },
        },
      })

      if (res.count > 0) {
        await recalculateCollectionQuoteCounts(tx, [id])
      }

      return res.count
    })

    if (removedCount > 0) {
      revalidatePublicSurfaces()

      await recordAuditLog({
        action: "UPDATE",
        entityType: "COLLECTION",
        entityId: collection.id,
        entityName: collection.title,
        adminId: admin.id,
        adminEmail: admin.email,
        adminName: admin.name,
        details: {
          action: "removeQuotes",
          removedCount,
          quoteIds: parsed.data.quoteIds,
        },
        req,
      })
    }

    return NextResponse.json({ success: true, removedCount })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove quotes from collection"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(req: Request, context: Context) {
  const { id } = await context.params
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid collection ID" }, { status: 400 })
  }

  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const rawBody = await req.json().catch(() => null)
  const parsed = collectionQuotesReorderSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const collection = await prisma.collection.findUnique({
    where: { id },
    select: { id: true, title: true },
  })

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of parsed.data.items) {
        await tx.quoteCollection.updateMany({
          where: {
            collectionId: id,
            quoteId: item.quoteId,
          },
          data: {
            position: item.position,
          },
        })
      }
    })

    revalidatePublicSurfaces()

    await recordAuditLog({
      action: "UPDATE",
      entityType: "COLLECTION",
      entityId: collection.id,
      entityName: collection.title,
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      details: {
        action: "reorderQuotes",
        itemsCount: parsed.data.items.length,
      },
      req,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reorder quotes"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
