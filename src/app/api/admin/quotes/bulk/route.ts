import crypto from "crypto"
import slugify from "slugify"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { importQuotesFromWikiquoteUrl } from "@/lib/wikimedia/wikiquoteImport"
import { importQuotesFromGutenbergUrl } from "@/lib/import/gutenbergImport"
import { importQuotesFromWikisourceUrl } from "@/lib/wikimedia/wikisourceImport"
import {
  recalculateAuthorQuoteCounts,
  recalculateCategoryQuoteCounts,
  recalculateSourceQuoteCounts,
  recalculateTagQuoteCounts,
} from "@/lib/quoteCountSync"
import { deriveAdminSortKey, deriveVerificationConfidence } from "@/lib/quoteAutomation"

type ImportItem = {
  content?: string
  meaning?: string
  historicalContext?: string
  modernRelevance?: string
  authorId?: string
  authorName?: string
  categoryId?: string
  categoryName?: string
  sourceTitle?: string
  sourceType?: string
  publish?: boolean
  language?: string
  tagIds?: string[]
  tagSlugs?: string[]
  tagNames?: string[]
  tags?: string[]
  wikiquoteUrl?: string
  gutenbergUrl?: string
  wikisourceUrl?: string
}

type SelectedSourceCandidate = {
  content?: string
  authorName?: string | null
  sourceType?: "WIKIQUOTE" | "GUTENBERG" | "WIKISOURCE"
  sourceTitle?: string
  sourceUrl?: string
  language?: string
  verified?: boolean
  citation?: string
}

type WikiquoteSeed = {
  wikiquoteUrl: string
  categoryId: string
  language: string
  publish: boolean
}

type GutenbergSeed = {
  gutenbergUrl: string
  categoryId: string
  language: string
  publish: boolean
}

type WikisourceSeed = {
  wikisourceUrl: string
  categoryId: string
  language: string
  publish: boolean
  authorId?: string
}

type Candidate = {
  content: string
  meaning: string | null
  historicalContext: string | null
  modernRelevance: string | null
  authorId?: string
  authorName?: string
  categoryId: string
  sourceTitle: string | null
  sourceType: string
  sourceExternalUrl: string | null
  publish: boolean
  language: string
  normalizedContent: string
  contentHash: string
  tagIds: string[]
  isVerified: boolean
  verificationNote?: string | null
}

type AuthorRecord = {
  id: string
  name: string
  slug: string
  nameNormalized: string
}

type CategoryRecord = {
  id: string
  slug: string
  nameNormalized: string
}

const SOURCE_TYPES = new Set([
  "BOOK",
  "SPEECH",
  "ARTICLE",
  "INTERVIEW",
  "SCRIPTURE",
  "LETTER",
  "OTHER",
])

function normalizeContent(content: string) {
  return content.trim().replace(/\s+/g, " ").toLowerCase()
}

function hashContent(content: string) {
  return crypto.createHash("sha256").update(normalizeContent(content)).digest("hex")
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : value.slice(0, maxLength)
}

function normalizeAuthorName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function normalizeCategoryName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function normalizeTagName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function parseStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim())
          .filter(Boolean)
      )
    )
  }

  return []
}

function uniqueNormalizedAuthorName(base: string, used: Set<string>) {
  let value = base
  let suffix = 2

  while (used.has(value)) {
    value = `${base} ${suffix}`
    suffix += 1
  }

  used.add(value)
  return value
}

function uniqueValueInSet(base: string, used: Set<string>, fallback: string) {
  const safeBase = base || fallback
  let value = safeBase
  let suffix = 2

  while (used.has(value)) {
    value = `${safeBase}-${suffix}`
    suffix += 1
  }

  used.add(value)
  return value
}

function sourceCacheKey(authorId: string, title: string) {
  return `${authorId}::${title.trim().toLowerCase()}`
}

export async function POST(req: Request) {
  const admin = await getAdmin()
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    items?: ImportItem[]
    wikiquoteUrls?: string[]
    gutenbergUrls?: string[]
    wikisourceUrls?: string[]
    selectedSourceCandidates?: SelectedSourceCandidate[]
    useSelectedPreviewCandidates?: boolean
    defaultCategoryId?: string | null
    defaultAuthorId?: string | null
    defaultTagIds?: string[] | null
    publish?: boolean
    autoCreateAuthors?: boolean
    maxQuotesPerPage?: number
    verifiedOnly?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const items = Array.isArray(body.items) ? body.items : []
  const wikiquoteUrls = Array.isArray(body.wikiquoteUrls)
    ? body.wikiquoteUrls.filter((entry): entry is string => typeof entry === "string")
    : []
  const gutenbergUrls = Array.isArray(body.gutenbergUrls)
    ? body.gutenbergUrls.filter((entry): entry is string => typeof entry === "string")
    : []
  const wikisourceUrls = Array.isArray(body.wikisourceUrls)
    ? body.wikisourceUrls.filter((entry): entry is string => typeof entry === "string")
    : []
  const selectedSourceCandidates = Array.isArray(body.selectedSourceCandidates)
    ? body.selectedSourceCandidates
    : []
  const useSelectedPreviewCandidates = body.useSelectedPreviewCandidates === true

  if (
    items.length === 0 &&
    wikiquoteUrls.length === 0 &&
    gutenbergUrls.length === 0 &&
    wikisourceUrls.length === 0 &&
    selectedSourceCandidates.length === 0
  ) {
    return NextResponse.json(
      { error: "No items provided. Send { items: [...] } or source URL arrays." },
      { status: 400 }
    )
  }

  if (items.length > 500) {
    return NextResponse.json(
      { error: "Manual bulk import supports up to 500 rows per request." },
      { status: 400 }
    )
  }

  if (wikiquoteUrls.length > 50) {
    return NextResponse.json(
      { error: "Wikiquote bulk import supports up to 50 page URLs per request." },
      { status: 400 }
    )
  }
  if (gutenbergUrls.length > 50) {
    return NextResponse.json(
      { error: "Gutenberg bulk import supports up to 50 page URLs per request." },
      { status: 400 }
    )
  }
  if (wikisourceUrls.length > 50) {
    return NextResponse.json(
      { error: "Wikisource bulk import supports up to 50 page URLs per request." },
      { status: 400 }
    )
  }
  if (selectedSourceCandidates.length > 5000) {
    return NextResponse.json(
      { error: "selectedSourceCandidates supports up to 5000 rows per request." },
      { status: 400 }
    )
  }

  const [authors, categories, tags] = await Promise.all([
    prisma.author.findMany({
      select: { id: true, name: true, slug: true, nameNormalized: true },
    }),
    prisma.category.findMany({
      select: { id: true, slug: true, name: true },
    }),
    prisma.tag.findMany({
      select: { id: true, slug: true, name: true },
    }),
  ])

  const authorsById = new Map(authors.map((a) => [a.id, a]))
  const authorsByName = new Map(authors.map((a) => [a.nameNormalized, a]))
  const usedAuthorSlugs = new Set(authors.map((a) => a.slug))
  const usedAuthorNames = new Set(authors.map((a) => a.nameNormalized))
  const categoryMap = new Map(
    categories.map((c) => [
      c.id,
      { id: c.id, slug: c.slug, nameNormalized: normalizeCategoryName(c.name) } satisfies CategoryRecord,
    ])
  )
  const categoriesByName = new Map(
    Array.from(categoryMap.values()).map((category) => [category.nameNormalized, category])
  )
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]))
  const tagsBySlug = new Map(tags.map((tag) => [tag.slug, tag]))
  const tagsByName = new Map(tags.map((tag) => [normalizeTagName(tag.name), tag]))

  const defaultCategoryId = body.defaultCategoryId ?? null
  if (defaultCategoryId && !categoryMap.has(defaultCategoryId)) {
    return NextResponse.json(
      { error: "defaultCategoryId is not a valid category id." },
      { status: 400 }
    )
  }
  const defaultAuthorId = body.defaultAuthorId ?? null
  if (defaultAuthorId && !authorsById.has(defaultAuthorId)) {
    return NextResponse.json(
      { error: "defaultAuthorId is not a valid author id." },
      { status: 400 }
    )
  }
  const defaultTagIds = parseStringArray(body.defaultTagIds).filter((tagId) => tagsById.has(tagId))
  if (parseStringArray(body.defaultTagIds).length !== defaultTagIds.length) {
    return NextResponse.json(
      { error: "defaultTagIds contains an invalid tag id." },
      { status: 400 }
    )
  }

  const autoCreateAuthors = body.autoCreateAuthors !== false
  const maxQuotesPerPage = Math.min(Math.max(body.maxQuotesPerPage ?? 80, 1), 200)
  const verifiedOnly = body.verifiedOnly !== false

  const candidates: Candidate[] = []
  const wikiquoteSeeds: WikiquoteSeed[] = []
  const gutenbergSeeds: GutenbergSeed[] = []
  const wikisourceSeeds: WikisourceSeed[] = []
  const seenInPayload = new Set<string>()
  const seenWikiquoteUrls = new Set<string>()
  const seenGutenbergUrls = new Set<string>()
  const seenWikisourceUrls = new Set<string>()
  const errors: string[] = []
  let skipped = 0

  for (let i = 0; i < items.length; i += 1) {
    const row = items[i]
    const rowNo = i + 1

    const rowTagIds = parseStringArray(row.tagIds)
    const rowTagSlugs = parseStringArray(row.tagSlugs ?? row.tags)
    const rowTagNames = parseStringArray(row.tagNames)
    const resolvedTagIds = new Set(defaultTagIds)
    for (const tagId of rowTagIds) {
      if (!tagsById.has(tagId)) {
        errors.push(`Row ${rowNo}: invalid tagId "${tagId}".`)
        continue
      }
      resolvedTagIds.add(tagId)
    }
    for (const tagSlug of rowTagSlugs) {
      const tag = tagsBySlug.get(tagSlug)
      if (!tag) {
        errors.push(`Row ${rowNo}: invalid tagSlug "${tagSlug}".`)
        continue
      }
      resolvedTagIds.add(tag.id)
    }
    for (const tagName of rowTagNames) {
      const tag = tagsByName.get(normalizeTagName(tagName))
      if (!tag) {
        errors.push(`Row ${rowNo}: invalid tagName "${tagName}".`)
        continue
      }
      resolvedTagIds.add(tag.id)
    }

    if (typeof row.wikiquoteUrl === "string" && row.wikiquoteUrl.trim()) {
      const rowCategoryId =
        typeof row.categoryId === "string" && row.categoryId.trim()
          ? row.categoryId.trim()
          : ""
      const rowCategoryName =
        typeof row.categoryName === "string" && row.categoryName.trim()
          ? normalizeCategoryName(row.categoryName)
          : ""
      const resolvedCategoryId =
        rowCategoryId ||
        categoriesByName.get(rowCategoryName)?.id ||
        defaultCategoryId ||
        ""
      const categoryId = resolvedCategoryId
      if (!categoryId || !categoryMap.has(categoryId)) {
        errors.push(`Row ${rowNo}: valid categoryId/categoryName is required for wikiquoteUrl rows.`)
        continue
      }

      const wikiquoteUrl = row.wikiquoteUrl.trim()
      if (seenWikiquoteUrls.has(wikiquoteUrl)) {
        skipped += 1
        continue
      }
      seenWikiquoteUrls.add(wikiquoteUrl)

      wikiquoteSeeds.push({
        wikiquoteUrl,
        categoryId,
        publish: typeof row.publish === "boolean" ? row.publish : Boolean(body.publish),
        language:
          typeof row.language === "string" && row.language.trim()
            ? row.language.trim().toLowerCase()
            : "en",
      })
      continue
    }
    if (typeof row.gutenbergUrl === "string" && row.gutenbergUrl.trim()) {
      const rowCategoryId =
        typeof row.categoryId === "string" && row.categoryId.trim()
          ? row.categoryId.trim()
          : ""
      const rowCategoryName =
        typeof row.categoryName === "string" && row.categoryName.trim()
          ? normalizeCategoryName(row.categoryName)
          : ""
      const resolvedCategoryId =
        rowCategoryId ||
        categoriesByName.get(rowCategoryName)?.id ||
        defaultCategoryId ||
        ""
      const categoryId = resolvedCategoryId
      if (!categoryId || !categoryMap.has(categoryId)) {
        errors.push(`Row ${rowNo}: valid categoryId/categoryName is required for gutenbergUrl rows.`)
        continue
      }

      const gutenbergUrl = row.gutenbergUrl.trim()
      if (seenGutenbergUrls.has(gutenbergUrl)) {
        skipped += 1
        continue
      }
      seenGutenbergUrls.add(gutenbergUrl)

      gutenbergSeeds.push({
        gutenbergUrl,
        categoryId,
        publish: typeof row.publish === "boolean" ? row.publish : Boolean(body.publish),
        language:
          typeof row.language === "string" && row.language.trim()
            ? row.language.trim().toLowerCase()
            : "en",
      })
      continue
    }
    if (typeof row.wikisourceUrl === "string" && row.wikisourceUrl.trim()) {
      const rowCategoryId =
        typeof row.categoryId === "string" && row.categoryId.trim()
          ? row.categoryId.trim()
          : ""
      const rowCategoryName =
        typeof row.categoryName === "string" && row.categoryName.trim()
          ? normalizeCategoryName(row.categoryName)
          : ""
      const resolvedCategoryId =
        rowCategoryId ||
        categoriesByName.get(rowCategoryName)?.id ||
        defaultCategoryId ||
        ""
      const categoryId = resolvedCategoryId
      if (!categoryId || !categoryMap.has(categoryId)) {
        errors.push(`Row ${rowNo}: valid categoryId/categoryName is required for wikisourceUrl rows.`)
        continue
      }

      const rowAuthorId =
        typeof row.authorId === "string" && row.authorId.trim()
          ? row.authorId.trim()
          : ""
      const rowAuthorName =
        typeof row.authorName === "string" && row.authorName.trim()
          ? normalizeAuthorName(row.authorName)
          : ""
      const authorId =
        rowAuthorId ||
        authorsByName.get(rowAuthorName)?.id ||
        defaultAuthorId ||
        undefined
      if (authorId && !authorsById.has(authorId)) {
        errors.push(`Row ${rowNo}: authorId/authorName is invalid.`)
        continue
      }

      const wikisourceUrl = row.wikisourceUrl.trim()
      if (seenWikisourceUrls.has(wikisourceUrl)) {
        skipped += 1
        continue
      }
      seenWikisourceUrls.add(wikisourceUrl)

      wikisourceSeeds.push({
        wikisourceUrl,
        categoryId,
        authorId,
        publish: typeof row.publish === "boolean" ? row.publish : Boolean(body.publish),
        language:
          typeof row.language === "string" && row.language.trim()
            ? row.language.trim().toLowerCase()
            : "en",
      })
      continue
    }

    const content = typeof row.content === "string" ? row.content.trim() : ""
    const rowAuthorId = typeof row.authorId === "string" ? row.authorId.trim() : ""
    const rowAuthorName =
      typeof row.authorName === "string" && row.authorName.trim()
        ? normalizeAuthorName(row.authorName)
        : ""
    const authorId =
      rowAuthorId ||
      authorsByName.get(rowAuthorName)?.id ||
      defaultAuthorId ||
      ""
    const rowCategoryId =
      typeof row.categoryId === "string" && row.categoryId.trim()
        ? row.categoryId.trim()
        : ""
    const rowCategoryName =
      typeof row.categoryName === "string" && row.categoryName.trim()
        ? normalizeCategoryName(row.categoryName)
        : ""
    const categoryId =
      rowCategoryId ||
      categoriesByName.get(rowCategoryName)?.id ||
      defaultCategoryId ||
      ""

    if (!content) {
      errors.push(`Row ${rowNo}: content is required.`)
      continue
    }
    if (!authorId || !authorsById.has(authorId)) {
      errors.push(`Row ${rowNo}: valid authorId/authorName is required.`)
      continue
    }
    if (!categoryId || !categoryMap.has(categoryId)) {
      errors.push(`Row ${rowNo}: valid categoryId/categoryName is required.`)
      continue
    }

    const language =
      typeof row.language === "string" && row.language.trim()
        ? row.language.trim().toLowerCase()
        : "en"
    const contentHash = hashContent(content)
    const dedupeKey = `${contentHash}:${language}`

    if (seenInPayload.has(dedupeKey)) {
      skipped += 1
      continue
    }
    seenInPayload.add(dedupeKey)

    const sourceTypeRaw = typeof row.sourceType === "string" ? row.sourceType.toUpperCase() : ""
    const sourceType = SOURCE_TYPES.has(sourceTypeRaw) ? sourceTypeRaw : "BOOK"

    candidates.push({
      content,
      meaning:
        typeof row.meaning === "string" && row.meaning.trim()
          ? row.meaning.trim()
          : null,
      historicalContext:
        typeof row.historicalContext === "string" && row.historicalContext.trim()
          ? row.historicalContext.trim()
          : null,
      modernRelevance:
        typeof row.modernRelevance === "string" && row.modernRelevance.trim()
          ? row.modernRelevance.trim()
          : null,
      authorId,
      categoryId,
      sourceTitle: typeof row.sourceTitle === "string" && row.sourceTitle.trim() ? row.sourceTitle.trim() : null,
      sourceType,
      sourceExternalUrl: null,
      publish: typeof row.publish === "boolean" ? row.publish : Boolean(body.publish),
      language,
      normalizedContent: normalizeContent(content),
      contentHash,
      tagIds: Array.from(resolvedTagIds),
      isVerified: false,
      verificationNote: null,
    })
  }

  for (let i = 0; i < selectedSourceCandidates.length; i += 1) {
    const row = selectedSourceCandidates[i]
    const rowNo = i + 1
    const content = typeof row.content === "string" ? row.content.trim() : ""
    if (!content) {
      errors.push(`Selected candidate ${rowNo}: content is required.`)
      continue
    }

    const categoryId = defaultCategoryId || ""
    if (!categoryId || !categoryMap.has(categoryId)) {
      errors.push("selectedSourceCandidates require a valid defaultCategoryId.")
      break
    }

    const sourceType =
      row.sourceType === "GUTENBERG" || row.sourceType === "WIKISOURCE" ? "BOOK" : "OTHER"
    const language =
      typeof row.language === "string" && row.language.trim() ? row.language.trim().toLowerCase() : "en"
    const contentHash = hashContent(content)
    const dedupeKey = `${contentHash}:${language}`
    if (seenInPayload.has(dedupeKey)) {
      skipped += 1
      continue
    }
    seenInPayload.add(dedupeKey)

    candidates.push({
      content,
      meaning: null,
      historicalContext: null,
      modernRelevance: null,
      authorId: defaultAuthorId || undefined,
      authorName: typeof row.authorName === "string" ? row.authorName.trim() : undefined,
      categoryId,
      sourceTitle: typeof row.sourceTitle === "string" && row.sourceTitle.trim() ? row.sourceTitle.trim() : null,
      sourceType,
      sourceExternalUrl: typeof row.sourceUrl === "string" && row.sourceUrl.trim() ? row.sourceUrl.trim() : null,
      publish: Boolean(body.publish),
      language,
      normalizedContent: normalizeContent(content),
      contentHash,
      tagIds: defaultTagIds,
      isVerified: row.verified !== false,
      verificationNote:
        typeof row.citation === "string" && row.citation.trim() ? `Source citation: ${row.citation.trim()}` : null,
    })
  }

  if (!useSelectedPreviewCandidates) {
    for (const entry of wikiquoteUrls) {
      const wikiquoteUrl = entry.trim()
      if (!wikiquoteUrl) continue
      if (!defaultCategoryId) {
        errors.push("wikiquoteUrls require defaultCategoryId, or provide rows with wikiquoteUrl + categoryId.")
        break
      }

      if (seenWikiquoteUrls.has(wikiquoteUrl)) {
        skipped += 1
        continue
      }
      seenWikiquoteUrls.add(wikiquoteUrl)

      wikiquoteSeeds.push({
        wikiquoteUrl,
        categoryId: defaultCategoryId,
        language: "en",
        publish: Boolean(body.publish),
      })
    }
    for (const entry of gutenbergUrls) {
      const gutenbergUrl = entry.trim()
      if (!gutenbergUrl) continue
      if (!defaultCategoryId) {
        errors.push("gutenbergUrls require defaultCategoryId, or provide rows with gutenbergUrl + categoryId.")
        break
      }

      if (seenGutenbergUrls.has(gutenbergUrl)) {
        skipped += 1
        continue
      }
      seenGutenbergUrls.add(gutenbergUrl)

      gutenbergSeeds.push({
        gutenbergUrl,
        categoryId: defaultCategoryId,
        language: "en",
        publish: Boolean(body.publish),
      })
    }
    for (const entry of wikisourceUrls) {
      const wikisourceUrl = entry.trim()
      if (!wikisourceUrl) continue
      if (!defaultCategoryId) {
        errors.push("wikisourceUrls require defaultCategoryId, or provide rows with wikisourceUrl + categoryId.")
        break
      }

      if (seenWikisourceUrls.has(wikisourceUrl)) {
        skipped += 1
        continue
      }
      seenWikisourceUrls.add(wikisourceUrl)

      wikisourceSeeds.push({
        wikisourceUrl,
        categoryId: defaultCategoryId,
        language: "en",
        publish: Boolean(body.publish),
        authorId: defaultAuthorId || undefined,
      })
    }
  }

  for (let i = 0; i < wikiquoteSeeds.length; i += 1) {
    const seed = wikiquoteSeeds[i]
    try {
      const imported = await importQuotesFromWikiquoteUrl({
        wikiquoteUrl: seed.wikiquoteUrl,
        maxQuotesPerPage,
        verifiedOnly,
      })

      if (!imported.authorName) {
        errors.push(`Wikiquote ${i + 1}: could not resolve author name.`)
        continue
      }

      let addedForSeed = 0
      for (const importedQuote of imported.quotes) {
        const content = importedQuote.content
        const contentHash = hashContent(content)
        const dedupeKey = `${contentHash}:${seed.language}`
        if (seenInPayload.has(dedupeKey)) {
          skipped += 1
          continue
        }

        seenInPayload.add(dedupeKey)
        candidates.push({
          content,
          meaning: null,
          historicalContext: null,
          modernRelevance: null,
          authorName: imported.authorName,
          categoryId: seed.categoryId,
          sourceTitle: imported.pageTitle,
          sourceType: "OTHER",
          sourceExternalUrl: imported.wikiquoteUrl,
          publish: seed.publish,
          language: seed.language,
          normalizedContent: normalizeContent(content),
          contentHash,
          tagIds: defaultTagIds,
          isVerified: importedQuote.verified,
          verificationNote: null,
        })
        addedForSeed += 1
      }

      if (addedForSeed === 0) {
        errors.push(`Wikiquote ${i + 1}: no importable quote lines found.`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wikiquote import failed"
      errors.push(`Wikiquote ${i + 1}: ${message}`)
    }
  }

  for (let i = 0; i < gutenbergSeeds.length; i += 1) {
    const seed = gutenbergSeeds[i]
    try {
      const imported = await importQuotesFromGutenbergUrl({
        gutenbergUrl: seed.gutenbergUrl,
        maxQuotesPerPage,
      })

      if (!imported.authorName) {
        errors.push(`Gutenberg ${i + 1}: could not resolve author name.`)
        continue
      }

      let addedForSeed = 0
      for (const importedQuote of imported.quotes) {
        const content = importedQuote.content
        const language = imported.language || seed.language
        const contentHash = hashContent(content)
        const dedupeKey = `${contentHash}:${language}`
        if (seenInPayload.has(dedupeKey)) {
          skipped += 1
          continue
        }

        seenInPayload.add(dedupeKey)
        candidates.push({
          content,
          meaning: null,
          historicalContext: null,
          modernRelevance: null,
          authorName: imported.authorName,
          categoryId: seed.categoryId,
          sourceTitle: imported.pageTitle,
          sourceType: "BOOK",
          sourceExternalUrl: imported.gutenbergUrl,
          publish: seed.publish,
          language,
          normalizedContent: normalizeContent(content),
          contentHash,
          tagIds: defaultTagIds,
          isVerified: importedQuote.verified,
          verificationNote: typeof importedQuote.citation === "string" ? `Source citation: ${importedQuote.citation}` : null,
        })
        addedForSeed += 1
      }

      if (addedForSeed === 0) {
        errors.push(`Gutenberg ${i + 1}: no importable quote lines found.`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gutenberg import failed"
      errors.push(`Gutenberg ${i + 1}: ${message}`)
    }
  }

  for (let i = 0; i < wikisourceSeeds.length; i += 1) {
    const seed = wikisourceSeeds[i]
    try {
      const imported = await importQuotesFromWikisourceUrl({
        wikisourceUrl: seed.wikisourceUrl,
        maxQuotesPerPage,
        verifiedOnly,
      })

      if (!imported.authorName && !seed.authorId) {
        errors.push(`Wikisource ${i + 1}: could not resolve author name; provide authorId/defaultAuthorId.`)
        continue
      }

      let addedForSeed = 0
      for (const importedQuote of imported.quotes) {
        const content = importedQuote.content
        const language = imported.language || seed.language
        const contentHash = hashContent(content)
        const dedupeKey = `${contentHash}:${language}`
        if (seenInPayload.has(dedupeKey)) {
          skipped += 1
          continue
        }

        seenInPayload.add(dedupeKey)
        candidates.push({
          content,
          meaning: null,
          historicalContext: null,
          modernRelevance: null,
          authorId: seed.authorId,
          authorName: imported.authorName || undefined,
          categoryId: seed.categoryId,
          sourceTitle: imported.pageTitle,
          sourceType: "BOOK",
          sourceExternalUrl: imported.wikisourceUrl,
          publish: seed.publish,
          language,
          normalizedContent: normalizeContent(content),
          contentHash,
          tagIds: defaultTagIds,
          isVerified: importedQuote.verified,
          verificationNote: typeof importedQuote.citation === "string" ? `Source citation: ${importedQuote.citation}` : null,
        })
        addedForSeed += 1
      }

      if (addedForSeed === 0) {
        errors.push(`Wikisource ${i + 1}: no importable quote lines found.`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wikisource import failed"
      errors.push(`Wikisource ${i + 1}: ${message}`)
    }
  }

  const existing =
    candidates.length === 0
      ? []
      : await prisma.quote.findMany({
          where: {
            OR: candidates.map((c) => ({
              contentHash: c.contentHash,
              language: c.language,
            })),
          },
          select: { contentHash: true, language: true },
        })
  const existingSet = new Set(existing.map((q) => `${q.contentHash}:${q.language}`))
  const candidateLanguages = Array.from(new Set(candidates.map((candidate) => candidate.language)))
  const existingQuoteSlugs = await prisma.quote.findMany({
    where: candidateLanguages.length > 0 ? { language: { in: candidateLanguages } } : undefined,
    select: { slug: true, language: true },
  })
  const usedQuoteSlugsByLanguage = new Map<string, Set<string>>()
  for (const { slug, language } of existingQuoteSlugs) {
    const used = usedQuoteSlugsByLanguage.get(language) ?? new Set<string>()
    used.add(slug)
    usedQuoteSlugsByLanguage.set(language, used)
  }

  const existingSourceSlugs = new Set(
    (
      await prisma.source.findMany({
        select: { slug: true },
      })
    ).map((source) => source.slug)
  )

  const existingAuthorIdsForSources = Array.from(
    new Set(
      candidates
        .map((candidate) => candidate.authorId)
        .filter((authorId): authorId is string => typeof authorId === "string" && authorId.length > 0)
    )
  )
  const requestedSourceTitles = Array.from(
    new Set(
      candidates
        .map((candidate) => candidate.sourceTitle)
        .filter((title): title is string => typeof title === "string" && title.length > 0)
    )
  )
  const existingSourceCache = new Map<string, { id: string }>()
  if (existingAuthorIdsForSources.length > 0 && requestedSourceTitles.length > 0) {
    const matchingSources = await prisma.source.findMany({
      where: {
        authorId: { in: existingAuthorIdsForSources },
        title: { in: requestedSourceTitles },
      },
      select: { id: true, authorId: true, title: true },
    })
    for (const source of matchingSources) {
      if (!source.authorId) continue
      existingSourceCache.set(sourceCacheKey(source.authorId, source.title), { id: source.id })
    }
  }

  let created = 0

  try {
    await prisma.$transaction(async (tx) => {
      const affectedAuthorIds = new Set<string>()
      const affectedSourceIds = new Set<string>()
      const affectedCategoryIds = new Set<string>()
      const affectedTagIds = new Set<string>()
      const sourceCache = new Map(existingSourceCache)

      for (const item of candidates) {
        const dedupeKey = `${item.contentHash}:${item.language}`
        if (existingSet.has(dedupeKey)) {
          skipped += 1
          continue
        }

        const category = categoryMap.get(item.categoryId)
        if (!category) {
          errors.push("Row skipped: category lookup failed.")
          continue
        }

        let author: AuthorRecord | undefined
        if (item.authorId) {
          const matched = authorsById.get(item.authorId)
          if (matched) {
            author = {
              id: matched.id,
              name: matched.name,
              slug: matched.slug,
              nameNormalized: matched.nameNormalized,
            }
          }
        } else if (item.authorName) {
          const authorName = item.authorName.trim()
          const normalized = normalizeAuthorName(authorName)
          const existingAuthor = authorsByName.get(normalized)
          if (existingAuthor) {
            author = {
              id: existingAuthor.id,
              name: existingAuthor.name,
              slug: existingAuthor.slug,
              nameNormalized: existingAuthor.nameNormalized,
            }
          } else if (autoCreateAuthors && normalized) {
            const baseSlug = slugify(authorName, { lower: true, strict: true })
            const slug = uniqueValueInSet(baseSlug, usedAuthorSlugs, "author")
            const uniqueNormalized = uniqueNormalizedAuthorName(normalized, usedAuthorNames)
            const createdAuthor = await tx.author.create({
              data: {
                name: authorName,
                slug,
                nameNormalized: uniqueNormalized,
              },
              select: { id: true, name: true, slug: true, nameNormalized: true },
            })

            authorsById.set(createdAuthor.id, createdAuthor)
            authorsByName.set(createdAuthor.nameNormalized, createdAuthor)
            author = {
              id: createdAuthor.id,
              name: createdAuthor.name,
              slug: createdAuthor.slug,
              nameNormalized: createdAuthor.nameNormalized,
            }
          }
        }

        if (!author) {
          errors.push(`Row skipped: could not resolve author for "${truncate(item.content, 64)}".`)
          continue
        }

        const baseQuoteSlug = slugify(truncate(item.content, 80), {
          lower: true,
          strict: true,
        })
        const usedQuoteSlugs = usedQuoteSlugsByLanguage.get(item.language) ?? new Set<string>()
        const slug = uniqueValueInSet(baseQuoteSlug, usedQuoteSlugs, "quote")
        usedQuoteSlugsByLanguage.set(item.language, usedQuoteSlugs)

        let sourceId: string | undefined
        if (item.sourceTitle) {
          const cachedSource = sourceCache.get(sourceCacheKey(author.id, item.sourceTitle))

          if (cachedSource) {
            sourceId = cachedSource.id
          } else {
            const sourceBaseSlug = slugify(item.sourceTitle, { lower: true, strict: true })
            const sourceSlug = uniqueValueInSet(sourceBaseSlug, existingSourceSlugs, "source")
            const source = await tx.source.create({
              data: {
                title: item.sourceTitle,
                slug: sourceSlug,
                type: item.sourceType as never,
                authorId: author.id,
                externalUrl: item.sourceExternalUrl,
              },
              select: { id: true },
            })
            sourceId = source.id
            sourceCache.set(sourceCacheKey(author.id, item.sourceTitle), { id: source.id })
          }
        }

        const words = item.content.trim().split(/\s+/).filter(Boolean).length
        const status = item.publish ? "PUBLISHED" : "DRAFT"
        const attributionStatus = item.isVerified ? "CONFIRMED" : "UNKNOWN"
        const verificationConfidence = deriveVerificationConfidence({
          isVerified: item.isVerified,
          attributionStatus,
        })
        const adminSortKey = deriveAdminSortKey({
          status,
          isFeatured: false,
          isVerified: item.isVerified,
          attributionStatus,
        })
        const quoteTags = item.tagIds
          .map((tagId) => tagsById.get(tagId))
          .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
        await tx.quote.create({
          data: {
            content: item.content,
            meaning: item.meaning,
            historicalContext: item.historicalContext,
            modernRelevance: item.modernRelevance,
            language: item.language,
            wordCount: words,
            slug,
            normalizedContent: item.normalizedContent,
            contentHash: item.contentHash,
            authorId: author.id,
            authorName: author.name,
            authorSlug: author.slug,
            sourceId,
            categoryId: item.categoryId,
            categorySlug: category.slug,
            tagSlugs: quoteTags.map((tag) => tag.slug),
            status,
            publishedAt: item.publish ? new Date() : null,
            isVerified: item.isVerified,
            attributionStatus,
            verificationConfidence: verificationConfidence.toFixed(2),
            verificationNote: item.verificationNote || null,
            adminSortKey,
            createdById: admin.id,
            publishedById: item.publish ? admin.id : null,
            tags: quoteTags.length
              ? {
                  create: quoteTags.map((tag) => ({
                    tagId: tag.id,
                  })),
                }
              : undefined,
          },
        })

        affectedAuthorIds.add(author.id)
        affectedCategoryIds.add(item.categoryId)
        if (sourceId) {
          affectedSourceIds.add(sourceId)
        }
        for (const tag of quoteTags) {
          affectedTagIds.add(tag.id)
        }

        created += 1
        existingSet.add(dedupeKey)
      }

      await recalculateAuthorQuoteCounts(tx, Array.from(affectedAuthorIds))
      await recalculateCategoryQuoteCounts(tx, Array.from(affectedCategoryIds))
      await recalculateSourceQuoteCounts(tx, Array.from(affectedSourceIds))
      await recalculateTagQuoteCounts(tx, Array.from(affectedTagIds))
    }, {
      maxWait: 10000,
      timeout: 60000,
    })

    return NextResponse.json({
      totalReceived:
        items.length +
        wikiquoteUrls.length +
        gutenbergUrls.length +
        wikisourceUrls.length +
        selectedSourceCandidates.length,
      acceptedRows: candidates.length,
      created,
      skipped,
      failed: errors.length,
      errors: errors.slice(0, 100),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk import failed"
    return NextResponse.json(
      {
        error: message,
        totalReceived:
          items.length +
          wikiquoteUrls.length +
          gutenbergUrls.length +
          wikisourceUrls.length +
          selectedSourceCandidates.length,
        acceptedRows: candidates.length,
        created,
        skipped,
        failed: errors.length + 1,
        errors: [...errors.slice(0, 99), message],
      },
      { status: 500 }
    )
  }
}
