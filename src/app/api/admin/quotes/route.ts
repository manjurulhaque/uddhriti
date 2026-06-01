import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import crypto from "crypto"
import slugify from "slugify"
import { requireSuperAdmin } from "@/lib/api/admin-auth"
import { quoteCreateSchema } from "@/lib/validation/quote"
import {
  recalculateAuthorQuoteCounts,
  recalculateCategoryQuoteCounts,
  recalculateSourceQuoteCounts,
  recalculateTagQuoteCounts,
} from "@/lib/quoteCountSync"
import { deriveAdminSortKey, deriveVerificationConfidence } from "@/lib/quoteAutomation"

function normalize(content: string) {
  return content.trim().replace(/\s+/g, " ").toLowerCase()
}

function hash(content: string) {
  return crypto
    .createHash("sha256")
    .update(normalize(content))
    .digest("hex")
}

function countWords(content: string) {
  return content.trim().split(/\s+/).filter(Boolean).length
}

export async function POST(req: Request) {
  const { admin, response } = await requireSuperAdmin()
  if (response) return response

  const body = await req.json().catch(() => null)
  const parsed = quoteCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const {
    content,
    meaning,
    historicalContext,
    modernRelevance,
    authorId,
    categoryId,
    sourceId: inputSourceId,
    sourceTitle,
    sourceType,
    language,
    status,
    tagIds,
  } = parsed.data

  const trimmedContent = content.trim()

  const selectedAuthor = await prisma.author.findUnique({
    where: { id: authorId },
    select: { id: true, name: true, slug: true },
  })
  const selectedCategory = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, slug: true },
  })

  if (!selectedAuthor || !selectedCategory) {
    return NextResponse.json(
      { error: "Invalid authorId or categoryId" },
      { status: 400 }
    )
  }

  const normalizedLanguage =
    language?.trim() ? language.trim().toLowerCase() : "en"
  const contentHash = hash(trimmedContent)
  const baseSlug = slugify(trimmedContent.slice(0, 80), {
    lower: true,
    strict: true,
  }) || "quote"

  const nextStatus = status
  const isPublishing = nextStatus === "PUBLISHED"
  const sourceTypeValue = sourceType || "BOOK"
  const isVerified = false
  const attributionStatus = "UNKNOWN" as const
  const verificationConfidence = deriveVerificationConfidence({
    isVerified,
    attributionStatus,
  })
  const adminSortKey = deriveAdminSortKey({
    status: nextStatus,
    isFeatured: false,
    isVerified,
    attributionStatus,
  })

  try {
    const quote = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.quote.findFirst({
        where: { contentHash, language: normalizedLanguage },
        select: { id: true },
      })
      if (duplicate) throw new Error("Duplicate quote")

      let slug = baseSlug
      let suffix = 2
      while (
        await tx.quote.findFirst({
          where: { slug, language: normalizedLanguage },
          select: { id: true },
        })
      ) {
        slug = `${baseSlug}-${suffix}`
        suffix += 1
      }

      let sourceId: string | undefined
      if (inputSourceId) {
        const existingById = await tx.source.findUnique({
          where: { id: inputSourceId },
          select: { id: true },
        })
        if (!existingById) {
          throw new Error("Invalid sourceId")
        }
        sourceId = existingById.id
      }

      if (!sourceId && sourceTitle?.trim()) {
        const existingSource = await tx.source.findFirst({
          where: { title: sourceTitle, authorId: selectedAuthor.id },
        })

        if (existingSource) {
          sourceId = existingSource.id
        } else {
          const sourceBaseSlug = slugify(sourceTitle, { lower: true, strict: true }) || "source"
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

          const newSource = await tx.source.create({
            data: {
              title: sourceTitle,
              slug: sourceSlug,
              type: sourceTypeValue,
              authorId: selectedAuthor.id,
            },
          })
          sourceId = newSource.id
        }
      }

      const selectedTagIds = tagIds || []
      const tags = selectedTagIds.length
        ? await tx.tag.findMany({
            where: { id: { in: selectedTagIds } },
            select: { id: true, slug: true },
          })
        : []
      if (tags.length !== selectedTagIds.length) {
        throw new Error("One or more tagIds are invalid")
      }

      const createdQuote = await tx.quote.create({
        data: {
          content: trimmedContent,
          meaning: meaning?.trim() || null,
          historicalContext: historicalContext?.trim() || null,
          modernRelevance: modernRelevance?.trim() || null,
          language: normalizedLanguage,
          wordCount: countWords(trimmedContent),
          slug,
          normalizedContent: normalize(trimmedContent),
          contentHash,
          status: nextStatus,
          publishedAt: isPublishing ? new Date() : null,
          authorId: selectedAuthor.id,
          authorName: selectedAuthor.name,
          authorSlug: selectedAuthor.slug,
          sourceId,
          categoryId: selectedCategory.id,
          categorySlug: selectedCategory.slug,
          tagSlugs: tags.map((tag) => tag.slug),
          isFeatured: false,
          isVerified,
          attributionStatus,
          verificationConfidence: verificationConfidence.toFixed(2),
          adminSortKey,
          createdById: admin.id,
          publishedById: isPublishing ? admin.id : null,
          tags: tags.length
            ? {
                create: tags.map((tag) => ({
                  tagId: tag.id,
                })),
              }
            : undefined,
        },
      })

      await recalculateAuthorQuoteCounts(tx, [selectedAuthor.id])
      await recalculateCategoryQuoteCounts(tx, [selectedCategory.id])
      await recalculateSourceQuoteCounts(tx, [sourceId])
      await recalculateTagQuoteCounts(
        tx,
        tags.map((tag) => tag.id)
      )

      return createdQuote
    })

    return NextResponse.json(quote)

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create quote"
    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
