/**
 * Batch AI Enrichment Engine for Existing Quotes
 *
 * Scans existing quotes in bulk and enriches them with:
 * 1. Curatorial Context: meaning, historical context, modern relevance
 * 2. Smart Thematic Tagging: maps and balances 3-5 tags from taxonomy
 * 3. Primary Source Discovery: matches or creates and links work/source
 * 4. Fact-Checking & Attribution: confidence score, notes, and verification status
 * 5. Optional Auto-Publish: transitions high-confidence drafts to PUBLISHED
 */

import slugify from "slugify"
import type { Prisma, WorkType, AttributionStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { autoCurateQuote } from "./auto-curator"
import {
  recalculateAuthorQuoteCounts,
  recalculateCategoryQuoteCounts,
  recalculateSourceQuoteCounts,
  recalculateTagQuoteCounts,
} from "@/lib/quoteCountSync"
import { revalidatePublicSurfaces } from "@/lib/revalidation"
import { recordAuditLog } from "@/lib/audit"
import { isValidUuid } from "@/lib/api/route-helpers"

export interface BatchEnrichOptions {
  enrichContext?: boolean
  enrichTags?: boolean
  enrichSource?: boolean
  enrichVerification?: boolean
  autoPublish?: boolean
  overwriteExisting?: boolean
}

export interface BatchEnrichInput {
  quoteIds: string[]
  options?: BatchEnrichOptions
  adminId?: string
  adminEmail?: string | null
  adminName?: string | null
  req?: Request
}

export interface QuoteEnrichmentItemResult {
  id: string
  content: string
  authorName: string | null
  status: "success" | "skipped" | "error"
  changes: {
    meaningAdded?: boolean
    historicalContextAdded?: boolean
    modernRelevanceAdded?: boolean
    tagsAddedCount?: number
    tagNames?: string[]
    sourceLinkedTitle?: string | null
    attributionUpdated?: boolean
    attributionStatus?: string
    confidence?: number
    published?: boolean
  }
  error?: string
}

export interface BatchEnrichResult {
  success: boolean
  totalRequested: number
  totalProcessed: number
  successCount: number
  skippedCount: number
  errorCount: number
  items: QuoteEnrichmentItemResult[]
}

function normalizeWorkType(raw?: string | null): WorkType {
  const upper = (raw || "OTHER").toUpperCase().trim()
  if (
    upper === "BOOK" ||
    upper === "SPEECH" ||
    upper === "ARTICLE" ||
    upper === "INTERVIEW" ||
    upper === "SCRIPTURE" ||
    upper === "LETTER"
  ) {
    return upper as WorkType
  }
  return "OTHER"
}

export async function enrichQuotesBatch(input: BatchEnrichInput): Promise<BatchEnrichResult> {
  const rawIds = Array.isArray(input.quoteIds) ? input.quoteIds : []
  const uniqueIds = Array.from(new Set(rawIds.filter(isValidUuid)))

  const defaultOptions: Required<BatchEnrichOptions> = {
    enrichContext: true,
    enrichTags: true,
    enrichSource: true,
    enrichVerification: true,
    autoPublish: false,
    overwriteExisting: false,
  }

  const opts: Required<BatchEnrichOptions> = {
    ...defaultOptions,
    ...(input.options || {}),
  }

  if (uniqueIds.length === 0) {
    return {
      success: true,
      totalRequested: 0,
      totalProcessed: 0,
      successCount: 0,
      skippedCount: 0,
      errorCount: 0,
      items: [],
    }
  }

  // Safety cap at 50 quotes per batch
  const boundedIds = uniqueIds.slice(0, 50)

  // 1. Fetch target quotes with relations
  const quotes = await prisma.quote.findMany({
    where: {
      id: { in: boundedIds },
      deletedAt: null,
    },
    include: {
      author: { select: { id: true, name: true, slug: true } },
      category: { select: { id: true, name: true, slug: true } },
      source: { select: { id: true, title: true, slug: true } },
      tags: { select: { tagId: true, tag: { select: { id: true, name: true, slug: true } } } },
    },
  })

  const affectedAuthorIds = new Set<string>()
  const affectedCategoryIds = new Set<string>()
  const affectedSourceIds = new Set<string>()
  const affectedTagIds = new Set<string>()

  const items: QuoteEnrichmentItemResult[] = []

  // 2. Process quotes in concurrent chunks of 3
  const CONCURRENCY = 3
  for (let i = 0; i < quotes.length; i += CONCURRENCY) {
    const chunk = quotes.slice(i, i + CONCURRENCY)

    await Promise.all(
      chunk.map(async (quote) => {
        const authorName = quote.author?.name || quote.authorName || null

        // Determine which fields need enrichment based on options & existing values
        const needsMeaning = opts.enrichContext && (opts.overwriteExisting || !quote.meaning)
        const needsHistory = opts.enrichContext && (opts.overwriteExisting || !quote.historicalContext)
        const needsRelevance = opts.enrichContext && (opts.overwriteExisting || !quote.modernRelevance)
        const needsContext = needsMeaning || needsHistory || needsRelevance

        const needsTags = opts.enrichTags && (opts.overwriteExisting || quote.tags.length === 0)
        const needsSource = opts.enrichSource && (opts.overwriteExisting || !quote.sourceId)
        const needsVerification =
          opts.enrichVerification &&
          (opts.overwriteExisting || !quote.isVerified || quote.attributionStatus === "UNKNOWN")
        const needsPublish = opts.autoPublish && quote.status === "DRAFT"

        // If no enrichment is requested or all fields are already populated, skip
        if (!needsContext && !needsTags && !needsSource && !needsVerification && !needsPublish) {
          items.push({
            id: quote.id,
            content: quote.content,
            authorName,
            status: "skipped",
            changes: {},
          })
          return
        }

        try {
          // Run AI Curation for this quote
          const curated = await autoCurateQuote({
            content: quote.content,
            currentAuthorId: quote.authorId,
            authorName,
            currentCategoryId: quote.categoryId,
            categoryName: quote.category?.name,
            sourceTitle: quote.source?.title,
          })

          const dataToUpdate: Prisma.QuoteUpdateInput = {}
          const changes: QuoteEnrichmentItemResult["changes"] = {}

          // Apply Context
          if (needsMeaning && curated.meaning) {
            dataToUpdate.meaning = curated.meaning
            changes.meaningAdded = true
          }
          if (needsHistory && curated.historicalContext) {
            dataToUpdate.historicalContext = curated.historicalContext
            changes.historicalContextAdded = true
          }
          if (needsRelevance && curated.modernRelevance) {
            dataToUpdate.modernRelevance = curated.modernRelevance
            changes.modernRelevanceAdded = true
          }

          // Apply Source Discovery
          if (needsSource) {
            let resolvedSourceId = curated.sourceId
            if (!resolvedSourceId && curated.sourceTitle && quote.authorId) {
              const baseSlug = slugify(curated.sourceTitle, { lower: true, strict: true })
              const existingSource = await prisma.source.findFirst({
                where: {
                  OR: [
                    { slug: baseSlug },
                    { title: { equals: curated.sourceTitle, mode: "insensitive" } },
                  ],
                },
                select: { id: true, title: true },
              })

              if (existingSource) {
                resolvedSourceId = existingSource.id
                changes.sourceLinkedTitle = existingSource.title
              } else {
                try {
                  const uniqueSlug = `${baseSlug || "work"}-${Math.random().toString(36).substring(2, 7)}`
                  const created = await prisma.source.create({
                    data: {
                      title: curated.sourceTitle,
                      slug: uniqueSlug,
                      type: normalizeWorkType(curated.sourceType),
                      year: curated.sourceYear,
                      authorId: quote.authorId,
                    },
                    select: { id: true, title: true },
                  })
                  resolvedSourceId = created.id
                  changes.sourceLinkedTitle = created.title
                } catch {
                  // Fallback: continue without source creation
                }
              }
            }

            if (resolvedSourceId && resolvedSourceId !== quote.sourceId) {
              dataToUpdate.source = { connect: { id: resolvedSourceId } }
              changes.sourceLinkedTitle = changes.sourceLinkedTitle || curated.sourceTitle
              affectedSourceIds.add(resolvedSourceId)
              if (quote.sourceId) affectedSourceIds.add(quote.sourceId)
            }
          }

          // Apply Verification & Attribution
          if (needsVerification) {
            dataToUpdate.isVerified = curated.isVerified
            dataToUpdate.attributionStatus = curated.attributionStatus as AttributionStatus
            dataToUpdate.verificationConfidence = curated.verificationConfidence
            dataToUpdate.verificationNote = curated.verificationNote
            changes.attributionUpdated = true
            changes.attributionStatus = curated.attributionStatus
            changes.confidence = curated.verificationConfidence
          }

          // Apply Auto-Publish
          const finalConfidence =
            (dataToUpdate.verificationConfidence as number) ??
            Number(quote.verificationConfidence) ??
            0
          const finalMeaning = (dataToUpdate.meaning as string) || quote.meaning
          if (needsPublish && finalConfidence >= 0.8 && finalMeaning) {
            dataToUpdate.status = "PUBLISHED"
            dataToUpdate.publishedAt = quote.publishedAt || new Date()
            changes.published = true
            if (quote.authorId) affectedAuthorIds.add(quote.authorId)
            if (quote.categoryId) affectedCategoryIds.add(quote.categoryId)
          }

          // Execute quote update and tag links in transaction
          await prisma.$transaction(async (tx) => {
            if (Object.keys(dataToUpdate).length > 0) {
              await tx.quote.update({
                where: { id: quote.id },
                data: dataToUpdate,
              })
            }

            // Apply Tags
            if (needsTags && curated.tagIds.length > 0) {
              const existingTagIds = new Set(quote.tags.map((t) => t.tagId))
              const newTagIds = opts.overwriteExisting
                ? curated.tagIds
                : curated.tagIds.filter((id) => !existingTagIds.has(id))

              if (opts.overwriteExisting) {
                await tx.quoteTag.deleteMany({ where: { quoteId: quote.id } })
              }

              if (newTagIds.length > 0) {
                await tx.quoteTag.createMany({
                  data: newTagIds.map((tagId) => ({ quoteId: quote.id, tagId })),
                  skipDuplicates: true,
                })
                for (const tid of newTagIds) affectedTagIds.add(tid)
                changes.tagsAddedCount = newTagIds.length
                changes.tagNames = curated.tagNames.slice(0, newTagIds.length)
              }

              // Update quote tagSlugs
              const allTags = await tx.quoteTag.findMany({
                where: { quoteId: quote.id },
                include: { tag: { select: { slug: true } } },
              })
              await tx.quote.update({
                where: { id: quote.id },
                data: { tagSlugs: allTags.map((t) => t.tag.slug) },
              })
            }
          })

          items.push({
            id: quote.id,
            content: quote.content,
            authorName,
            status: "success",
            changes,
          })
        } catch (quoteErr) {
          console.error(`Error enriching quote ${quote.id}:`, quoteErr)
          items.push({
            id: quote.id,
            content: quote.content,
            authorName,
            status: "error",
            changes: {},
            error: quoteErr instanceof Error ? quoteErr.message : "Enrichment failed",
          })
        }
      })
    )
  }

  // 3. Recalculate quote counts for affected taxonomy
  try {
    await prisma.$transaction(async (tx) => {
      if (affectedTagIds.size > 0) {
        await recalculateTagQuoteCounts(tx, Array.from(affectedTagIds))
      }
      if (affectedSourceIds.size > 0) {
        await recalculateSourceQuoteCounts(tx, Array.from(affectedSourceIds))
      }
      if (affectedCategoryIds.size > 0) {
        await recalculateCategoryQuoteCounts(tx, Array.from(affectedCategoryIds))
      }
      if (affectedAuthorIds.size > 0) {
        await recalculateAuthorQuoteCounts(tx, Array.from(affectedAuthorIds))
      }
    })
  } catch (syncErr) {
    console.error("Post-enrichment count synchronization error:", syncErr)
  }

  // 4. Revalidate public surfaces and public cache
  try {
    revalidatePublicSurfaces()
  } catch {
    // Non-fatal if outside active request
  }

  // 5. Record Audit Log
  const successCount = items.filter((i) => i.status === "success").length
  const skippedCount = items.filter((i) => i.status === "skipped").length
  const errorCount = items.filter((i) => i.status === "error").length

  if (input.adminId) {
    await recordAuditLog({
      action: "BULK_UPDATE",
      entityType: "QUOTE",
      adminId: input.adminId,
      adminEmail: input.adminEmail,
      adminName: input.adminName,
      details: {
        action: "batchAIEnrich",
        totalRequested: boundedIds.length,
        totalProcessed: items.length,
        successCount,
        skippedCount,
        errorCount,
        options: opts,
      },
      req: input.req,
    }).catch(() => null)
  }

  return {
    success: true,
    totalRequested: boundedIds.length,
    totalProcessed: items.length,
    successCount,
    skippedCount,
    errorCount,
    items,
  }
}
