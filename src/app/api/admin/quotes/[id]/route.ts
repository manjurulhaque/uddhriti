import crypto from "crypto"
import slugify from "slugify"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { quoteUpdateSchema } from "@/lib/validation/quote"
import { parseDateTimeLocalInAppTimeZone } from "@/lib/datetime"
import {
  recalculateAuthorQuoteCounts,
  recalculateCategoryQuoteCounts,
  recalculateSourceQuoteCounts,
  recalculateTagQuoteCounts,
} from "@/lib/quoteCountSync"
import { deriveAdminSortKey, deriveVerificationConfidence } from "@/lib/quoteAutomation"

type Context = {
  params: Promise<{ id: string }>
}

function normalizeContent(content: string) {
  return content.trim().replace(/\s+/g, " ").toLowerCase()
}

function hashContent(content: string) {
  return crypto.createHash("sha256").update(normalizeContent(content)).digest("hex")
}

function countWords(content: string) {
  return content.trim().split(/\s+/).filter(Boolean).length
}

export async function GET(
  _req: Request,
  context: Context
) {
  const { id } = await context.params

  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      tags: {
        include: {
          tag: {
            select: { id: true, name: true, slug: true, type: true },
          },
        },
      },
    },
  })

  if (!quote || quote.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    ...quote,
    tagIds: quote.tags.map((t) => t.tagId),
  })
}

export async function PATCH(
  req: Request,
  context: Context
) {
  const { id } = await context.params

  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = quoteUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const payload = parsed.data

  const author = await prisma.author.findUnique({
    where: { id: payload.authorId },
    select: { id: true, name: true, slug: true },
  })
  const category = await prisma.category.findUnique({
    where: { id: payload.categoryId },
    select: { id: true, slug: true },
  })

  if (!author || !category) {
    return NextResponse.json(
      { error: "Invalid authorId or categoryId" },
      { status: 400 }
    )
  }

  const content = payload.content.trim()

  const language = (payload.language || "en").trim().toLowerCase()
  const contentHash = hashContent(content)
  const normalizedContent = normalizeContent(content)
  const baseSlug = slugify(content.slice(0, 80), { lower: true, strict: true }) || "quote"

  const nextStatus = payload.status
  const isPublishing = nextStatus === "PUBLISHED"
  const tagIds = payload.tagIds || []
  const publishedAt = payload.publishedAt
    ? parseDateTimeLocalInAppTimeZone(payload.publishedAt)
    : isPublishing
    ? new Date()
    : null
  const sourceTypeValue = payload.sourceType || "BOOK"
  const verificationConfidence = deriveVerificationConfidence({
    isVerified: payload.isVerified,
    attributionStatus: payload.attributionStatus,
  })
  const adminSortKey = deriveAdminSortKey({
    status: nextStatus,
    isFeatured: payload.isFeatured,
    isVerified: payload.isVerified,
    attributionStatus: payload.attributionStatus,
  })

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const previousQuote = await tx.quote.findUnique({
        where: { id },
        select: {
          authorId: true,
          sourceId: true,
          categoryId: true,
          tags: { select: { tagId: true } },
          publishedAt: true,
        },
      })

      if (!previousQuote) {
        throw new Error("Quote not found")
      }

      let slug = baseSlug
      let suffix = 2

      while (
        await tx.quote.findFirst({
          where: {
            slug,
            language,
            NOT: { id },
          },
          select: { id: true },
        })
      ) {
        slug = `${baseSlug}-${suffix}`
        suffix += 1
      }

      let sourceId = payload.sourceId || null
      if (sourceId) {
        const source = await tx.source.findUnique({
          where: { id: sourceId },
          select: { id: true },
        })
        if (!source) {
          throw new Error("Invalid sourceId")
        }
      }

      if (!sourceId && payload.sourceTitle?.trim()) {
        const existingSource = await tx.source.findFirst({
          where: { title: payload.sourceTitle, authorId: author.id },
          select: { id: true },
        })

        if (existingSource) {
          sourceId = existingSource.id
        } else {
          const sourceBaseSlug = slugify(payload.sourceTitle, { lower: true, strict: true }) || "source"
          let sourceSlug = sourceBaseSlug
          let sourceSuffix = 2

          while (
            await tx.source.findFirst({
              where: { slug: sourceSlug },
              select: { id: true },
            })
          ) {
            sourceSlug = `${sourceBaseSlug}-${sourceSuffix}`
            sourceSuffix += 1
          }

          const createdSource = await tx.source.create({
            data: {
              title: payload.sourceTitle,
              slug: sourceSlug,
              type: sourceTypeValue,
              authorId: author.id,
            },
            select: { id: true },
          })

          sourceId = createdSource.id
        }
      }

      const tags = tagIds.length
        ? await tx.tag.findMany({
            where: { id: { in: tagIds } },
            select: { id: true, slug: true },
          })
        : []
      if (tags.length !== tagIds.length) {
        throw new Error("One or more tagIds are invalid")
      }

      const quote = await tx.quote.update({
        where: { id },
        data: {
          content,
          meaning: payload.meaning?.trim() || null,
          historicalContext: payload.historicalContext?.trim() || null,
          modernRelevance: payload.modernRelevance?.trim() || null,
          language,
          wordCount: countWords(content),
          slug,
          normalizedContent,
          contentHash,
          authorId: author.id,
          authorName: author.name,
          authorSlug: author.slug,
          sourceId,
          categoryId: category.id,
          categorySlug: category.slug,
          status: nextStatus,
          publishedAt,
          publishedById: isPublishing ? admin.id : null,
          tagSlugs: tags.map((t) => t.slug),
          isFeatured: payload.isFeatured,
          isVerified: payload.isVerified,
          attributionStatus: payload.attributionStatus,
          verificationConfidence: verificationConfidence.toFixed(2),
          verificationNote: payload.verificationNote || null,
          adminSortKey,
        },
      })

      await tx.quoteTag.deleteMany({
        where: { quoteId: id },
      })

      if (tags.length) {
        await tx.quoteTag.createMany({
          data: tags.map((t) => ({
            quoteId: id,
            tagId: t.id,
          })),
        })
      }

      await recalculateAuthorQuoteCounts(tx, [previousQuote.authorId, author.id])
      await recalculateSourceQuoteCounts(tx, [previousQuote.sourceId, sourceId])
      await recalculateCategoryQuoteCounts(tx, [previousQuote.categoryId, category.id])
      await recalculateTagQuoteCounts(tx, [...previousQuote.tags.map((entry) => entry.tagId), ...tags.map((tag) => tag.id)])

      return quote
    })

    return NextResponse.json(updated)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update quote"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  req: Request,
  context: Context
) {
  const { id } = await context.params

  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.quote.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        sourceId: true,
        categoryId: true,
        tags: { select: { tagId: true } },
        deletedAt: true,
      },
    })

    if (!existing) {
      throw new Error("Quote not found")
    }

    const isPermanentDelete = new URL(req.url).searchParams.get("permanent") === "true"

    if (isPermanentDelete) {
      await tx.quoteReport.deleteMany({
        where: { quoteId: existing.id },
      })

      await tx.quoteDailyStat.deleteMany({
        where: { quoteId: existing.id },
      })

      await tx.quote.delete({
        where: { id: existing.id },
      })
    } else if (!existing.deletedAt) {
      await tx.quote.update({
        where: { id },
        data: { deletedAt: new Date() },
      })
    }

    await recalculateAuthorQuoteCounts(tx, [existing.authorId])
    await recalculateSourceQuoteCounts(tx, [existing.sourceId])
    await recalculateCategoryQuoteCounts(tx, [existing.categoryId])
    await recalculateTagQuoteCounts(tx, existing.tags.map((entry) => entry.tagId))
  })

  return NextResponse.json({ success: true })
}

export async function POST(
  req: Request,
  context: Context
) {
  const { id } = await context.params

  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (body?.action !== "restore") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.quote.findUnique({
      where: { id },
      select: {
        authorId: true,
        sourceId: true,
        categoryId: true,
        tags: { select: { tagId: true } },
        deletedAt: true,
      },
    })

    if (!existing) {
      throw new Error("Quote not found")
    }

    if (existing.deletedAt) {
      await tx.quote.update({
        where: { id },
        data: { deletedAt: null },
      })

      await recalculateAuthorQuoteCounts(tx, [existing.authorId])
      await recalculateSourceQuoteCounts(tx, [existing.sourceId])
      await recalculateCategoryQuoteCounts(tx, [existing.categoryId])
      await recalculateTagQuoteCounts(tx, existing.tags.map((entry) => entry.tagId))
    }
  })

  return NextResponse.json({ success: true })
}
