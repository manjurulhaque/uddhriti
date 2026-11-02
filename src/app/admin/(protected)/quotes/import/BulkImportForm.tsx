"use client"

import { useMemo, useState } from "react"
import { getRowValue, readItemsFromJsonOrCsv, readItemsFromJsonOrCsvText } from "@/lib/import/clientFile"
import { BulkFileUploadInput, BulkImportResultCard } from "@/components/admin/bulk-import"
import { Badge } from "@/components/ui/badge"

type Author = {
  id: string
  name: string
}

type Category = {
  id: string
  name: string
}

type Tag = {
  id: string
  name: string
  slug: string
}

type ImportResult = {
  totalReceived: number
  acceptedRows: number
  created: number
  skipped: number
  failed: number
  errors: string[]
}

type PreviewResult = {
  totalSources: number
  totalCandidates: number
  verifiedOnly: boolean
  items: Array<{
    sourceType: "WIKIQUOTE" | "GUTENBERG" | "WIKISOURCE"
    sourceUrl: string
    sourceTitle: string
    authorName: string | null
    language: string
    candidates: Array<{
      content: string
      verified: boolean
      citation?: string
    }>
  }>
  errors: string[]
}

type SelectedPreviewCandidate = {
  content: string
  authorName: string | null
  sourceType: "WIKIQUOTE" | "GUTENBERG" | "WIKISOURCE"
  sourceTitle: string
  sourceUrl: string
  language: string
  verified: boolean
  citation?: string
}

type ImportItemPayload = {
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

const EXAMPLE = [
  {
    content: "The unexamined life is not worth living.",
    meaning: "A life without reflection, moral questioning, or self-awareness lacks true value.",
    historicalContext: "Often associated with Socrates' defense speech at his trial in Athens.",
    modernRelevance: "Useful for framing self-reflection, ethics, and intentional living today.",
    authorName: "Socrates",
    categoryName: "Philosophy",
    sourceTitle: "Apology",
    sourceType: "BOOK",
    tagSlugs: ["philosophy", "self-knowledge"],
    publish: true,
  },
  {
    content: "Knowledge is power.",
    authorName: "Francis Bacon",
    categoryName: "Knowledge",
    tagSlugs: ["knowledge"],
  },
  {
    wikiquoteUrl: "https://en.wikiquote.org/wiki/Albert_Einstein",
    categoryName: "Science",
    publish: false,
  },
  {
    gutenbergUrl: "https://www.gutenberg.org/ebooks/1342",
    categoryName: "Love",
    publish: false,
  },
  {
    wikisourceUrl: "https://en.wikisource.org/wiki/The_Raven",
    categoryName: "Poetry",
    publish: false,
  },
]

export default function BulkImportForm({
  authors,
  categories,
  tags,
}: {
  authors: Author[]
  categories: Category[]
  tags: Tag[]
}) {
  const [payload, setPayload] = useState("[]")
  const [defaultCategoryId, setDefaultCategoryId] = useState("")
  const [defaultAuthorId, setDefaultAuthorId] = useState("")
  const [defaultTagIds, setDefaultTagIds] = useState<string[]>([])
  const [publishByDefault, setPublishByDefault] = useState(false)
  const [autoCreateAuthors, setAutoCreateAuthors] = useState(true)
  const [verifiedOnly, setVerifiedOnly] = useState(true)
  const [maxQuotesPerPage, setMaxQuotesPerPage] = useState("80")
  const [wikiquoteUrlsInput, setWikiquoteUrlsInput] = useState("")
  const [gutenbergUrlsInput, setGutenbergUrlsInput] = useState("")
  const [wikisourceUrlsInput, setWikisourceUrlsInput] = useState("")
  const [pastedInput, setPastedInput] = useState("")
  const [pastedFormatHint, setPastedFormatHint] = useState<"json" | "csv" | "tsv" | "empty">("empty")
  const [uploadedItems, setUploadedItems] = useState<ImportItemPayload[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [selectedPreviewKeys, setSelectedPreviewKeys] = useState<Record<string, boolean>>({})
  const [useSelectedPreviewOnly, setUseSelectedPreviewOnly] = useState(false)

  const authorCount = useMemo(() => authors.length, [authors])
  const categoryCount = useMemo(() => categories.length, [categories])
  const tagCount = useMemo(() => tags.length, [tags])
  const pastedLineCount = useMemo(
    () => pastedInput.split(/\r?\n/).filter((line) => line.trim()).length,
    [pastedInput]
  )

  const preflightReport = useMemo(() => {
    let itemsToInspect: unknown[] | null = uploadedItems

    if (!itemsToInspect && payload.trim() && payload !== "[]") {
      try {
        const parsed = JSON.parse(payload)
        itemsToInspect = Array.isArray(parsed)
          ? parsed
          : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { items?: unknown[] }).items)
          ? (parsed as { items: unknown[] }).items
          : null
      } catch {
        return null
      }
    }

    if (!itemsToInspect || itemsToInspect.length === 0) return null

    let validCount = 0
    let missingContentCount = 0
    let urlHarvesterCount = 0
    const warnings: string[] = []
    const seenContent = new Set<string>()
    let duplicateInBatchCount = 0

    itemsToInspect.forEach((item, index) => {
      const rowNum = index + 1
      if (typeof item !== "object" || item === null) {
        if (warnings.length < 5) warnings.push(`Row ${rowNum}: Not a valid quote object.`)
        return
      }

      const row = item as Record<string, unknown>
      const content = typeof row.content === "string" ? row.content.trim() : ""
      const hasUrl = Boolean(row.wikiquoteUrl || row.gutenbergUrl || row.wikisourceUrl)

      if (hasUrl) {
        urlHarvesterCount++
        validCount++
        return
      }

      if (!content) {
        missingContentCount++
        if (warnings.length < 5) {
          warnings.push(`Row ${rowNum}: Missing quote text/content.`)
        }
        return
      }

      const normalized = content.toLowerCase()
      if (seenContent.has(normalized)) {
        duplicateInBatchCount++
        if (warnings.length < 5) {
          warnings.push(`Row ${rowNum}: Duplicate quote content in this upload.`)
        }
      } else {
        seenContent.add(normalized)
      }

      validCount++
    })

    return {
      total: itemsToInspect.length,
      validCount,
      missingContentCount,
      urlHarvesterCount,
      duplicateInBatchCount,
      warnings,
    }
  }, [uploadedItems, payload])

  function parseBool(value: string) {
    const normalized = value.trim().toLowerCase()
    return normalized === "1" || normalized === "true" || normalized === "yes"
  }

  function parseTagList(value: unknown): string[] {
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

    if (typeof value !== "string") {
      return []
    }

    return Array.from(
      new Set(
        value
          .split(/[|,;]/)
          .map((entry) => entry.trim())
          .filter(Boolean)
      )
    )
  }

  function getRawRowValue(row: unknown, key: string): unknown {
    if (!row || typeof row !== "object") return undefined
    const obj = row as Record<string, unknown>
    if (key in obj) return obj[key]

    const lowerKey = key.toLowerCase()
    for (const [entryKey, entryValue] of Object.entries(obj)) {
      if (entryKey.toLowerCase() === lowerKey) {
        return entryValue
      }
    }

    return undefined
  }

  function mapRowsToImportItems(rows: unknown[]) {
    return rows.map((row) => {
      const content = getRowValue(row, "content").trim()
      const meaning = getRowValue(row, "meaning").trim()
      const historicalContext = getRowValue(row, "historicalContext").trim()
      const modernRelevance = getRowValue(row, "modernRelevance").trim()
      const authorId = getRowValue(row, "authorId").trim()
      const authorName = getRowValue(row, "authorName").trim()
      const categoryId = getRowValue(row, "categoryId").trim()
      const categoryName = getRowValue(row, "categoryName").trim()
      const sourceTitle = getRowValue(row, "sourceTitle").trim()
      const sourceType = getRowValue(row, "sourceType").trim().toUpperCase()
      const language = getRowValue(row, "language").trim().toLowerCase()
      const tagIds = parseTagList(getRawRowValue(row, "tagIds"))
      const tagSlugs = parseTagList(getRawRowValue(row, "tagSlugs") ?? getRawRowValue(row, "tags"))
      const tagNames = parseTagList(getRawRowValue(row, "tagNames"))
      const wikiquoteUrl = getRowValue(row, "wikiquoteUrl").trim()
      const gutenbergUrl = getRowValue(row, "gutenbergUrl").trim()
      const wikisourceUrl = getRowValue(row, "wikisourceUrl").trim()
      const publish = parseBool(getRowValue(row, "publish"))

      return {
        content,
        meaning: meaning || undefined,
        historicalContext: historicalContext || undefined,
        modernRelevance: modernRelevance || undefined,
        authorId: authorId || undefined,
        authorName: authorName || undefined,
        categoryId: categoryId || undefined,
        categoryName: categoryName || undefined,
        sourceTitle: sourceTitle || undefined,
        sourceType: sourceType || undefined,
        publish,
        language: language || undefined,
        tagIds: tagIds.length ? tagIds : undefined,
        tagSlugs: tagSlugs.length ? tagSlugs : undefined,
        tagNames: tagNames.length ? tagNames : undefined,
        tags: tagSlugs.length ? tagSlugs : undefined,
        wikiquoteUrl: wikiquoteUrl || undefined,
        gutenbergUrl: gutenbergUrl || undefined,
        wikisourceUrl: wikisourceUrl || undefined,
      }
    })
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const rows = await readItemsFromJsonOrCsv(file)
      const mapped = mapRowsToImportItems(rows)
      setUploadedItems(mapped)
      setPayload(JSON.stringify(mapped, null, 2))
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse file")
    }
  }

  function onParsePastedInput() {
    const trimmed = pastedInput.trim()
    if (!trimmed) {
      setError("Please paste CSV or JSON content first.")
      return
    }

    try {
      const rows = readItemsFromJsonOrCsvText(trimmed)
      const mapped = mapRowsToImportItems(rows)
      setUploadedItems(mapped)
      setPayload(JSON.stringify(mapped, null, 2))
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse pasted text")
    }
  }

  function setPastedTemplate(kind: "csv" | "json") {
    if (kind === "csv") {
      setPastedInput(
        `content,meaning,historicalContext,modernRelevance,authorName,categoryName,sourceTitle,sourceType,tagSlugs,publish\n` +
          `"The unexamined life is not worth living.","A life without reflection lacks true value.","Often associated with Socrates' defense speech at his trial in Athens.","Useful for framing self-reflection today.",Socrates,Philosophy,Apology,BOOK,"philosophy|self-knowledge",true`
      )
      setPastedFormatHint("csv")
      return
    }

    setPastedInput(JSON.stringify(EXAMPLE, null, 2))
    setPastedFormatHint("json")
  }

  function collectSourceUrls() {
    const inlineWikiquoteUrls = wikiquoteUrlsInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const wikiquoteUrls = Array.from(new Set(inlineWikiquoteUrls))

    const inlineGutenbergUrls = gutenbergUrlsInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const gutenbergUrls = Array.from(new Set(inlineGutenbergUrls))

    const inlineWikisourceUrls = wikisourceUrlsInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const wikisourceUrls = Array.from(new Set(inlineWikisourceUrls))

    return { wikiquoteUrls, gutenbergUrls, wikisourceUrls }
  }

  function candidateKey(sourceUrl: string, content: string) {
    return `${sourceUrl}::${content}`
  }

  function collectSelectedPreviewCandidates(): SelectedPreviewCandidate[] {
    if (!preview) return []
    const selected: SelectedPreviewCandidate[] = []
    for (const item of preview.items) {
      for (const quote of item.candidates) {
        const key = candidateKey(item.sourceUrl, quote.content)
        if (!selectedPreviewKeys[key]) continue
        selected.push({
          content: quote.content,
          authorName: item.authorName,
          sourceType: item.sourceType,
          sourceTitle: item.sourceTitle,
          sourceUrl: item.sourceUrl,
          language: item.language,
          verified: quote.verified,
          citation: quote.citation,
        })
      }
    }
    return selected
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    let items: unknown[] | null = uploadedItems

    if (!items) {
      let parsed: unknown
      try {
        parsed = JSON.parse(payload)
      } catch {
        setLoading(false)
        setError("Invalid JSON in editor.")
        return
      }

      items = Array.isArray(parsed)
        ? parsed
        : typeof parsed === "object" &&
            parsed !== null &&
            Array.isArray((parsed as { items?: unknown[] }).items)
          ? (parsed as { items: unknown[] }).items
          : null
    }

    if (!items) {
      setLoading(false)
      setError('Expected an array or an object shaped like { "items": [...] }.')
      return
    }

    const { wikiquoteUrls, gutenbergUrls, wikisourceUrls } = collectSourceUrls()
    if ((wikiquoteUrls.length > 0 || gutenbergUrls.length > 0 || wikisourceUrls.length > 0) && !defaultCategoryId) {
      setLoading(false)
      setError("Select a default category before importing source URLs from Wikiquote, Gutenberg, or Wikisource.")
      return
    }

    const hasManualRows = (items as ImportItemPayload[]).some(
      (entry) =>
        !entry.wikiquoteUrl &&
        !entry.gutenbergUrl &&
        !entry.wikisourceUrl &&
        (entry.content || entry.authorId || entry.authorName || entry.categoryId || entry.categoryName)
    )
    if (!hasManualRows && wikiquoteUrls.length === 0 && gutenbergUrls.length === 0 && wikisourceUrls.length === 0) {
      setLoading(false)
      setError("Provide manual rows or at least one source URL.")
      return
    }

    const selectedPreviewCandidates = useSelectedPreviewOnly ? collectSelectedPreviewCandidates() : []
    if (useSelectedPreviewOnly) {
      if (!preview) {
        setLoading(false)
        setError("Run preview first before importing selected candidates.")
        return
      }
      if (selectedPreviewCandidates.length === 0) {
        setLoading(false)
        setError("Select at least one preview candidate.")
        return
      }
      if (!defaultCategoryId) {
        setLoading(false)
        setError("Default category is required when importing selected preview candidates.")
        return
      }
    }

    const res = await fetch("/api/admin/quotes/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        wikiquoteUrls: useSelectedPreviewOnly ? [] : wikiquoteUrls,
        gutenbergUrls: useSelectedPreviewOnly ? [] : gutenbergUrls,
        wikisourceUrls: useSelectedPreviewOnly ? [] : wikisourceUrls,
        selectedSourceCandidates: selectedPreviewCandidates,
        useSelectedPreviewCandidates: useSelectedPreviewOnly,
        defaultCategoryId: defaultCategoryId || null,
        defaultAuthorId: defaultAuthorId || null,
        defaultTagIds,
        publish: publishByDefault,
        autoCreateAuthors,
        verifiedOnly,
        maxQuotesPerPage: Number(maxQuotesPerPage || 80),
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setLoading(false)
      setError(data?.error || "Import failed.")
      return
    }

    if (!data) {
      setLoading(false)
      setError("Import failed: server returned an empty response.")
      return
    }

    setResult(data as ImportResult)
    setLoading(false)
  }

  async function onPreview() {
    setPreviewLoading(true)
    setPreviewError(null)
    setPreview(null)

    const { wikiquoteUrls, gutenbergUrls, wikisourceUrls } = collectSourceUrls()
    if (wikiquoteUrls.length === 0 && gutenbergUrls.length === 0 && wikisourceUrls.length === 0) {
      setPreviewLoading(false)
      setPreviewError("Add at least one source URL to preview.")
      return
    }

    const res = await fetch("/api/admin/quotes/preview-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wikiquoteUrls,
        gutenbergUrls,
        wikisourceUrls,
        maxQuotesPerPage: Number(maxQuotesPerPage || 20),
        verifiedOnly,
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setPreviewLoading(false)
      setPreviewError(data?.error || "Preview failed.")
      return
    }

    setPreview(data as PreviewResult)
    const defaults: Record<string, boolean> = {}
    for (const item of (data as PreviewResult).items) {
      for (const quote of item.candidates) {
        defaults[candidateKey(item.sourceUrl, quote.content)] = true
      }
    }
    setSelectedPreviewKeys(defaults)
    setPreviewLoading(false)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 font-sans">
      {/* Overview Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Authors Catalog
            </span>
            <div className="text-xl font-bold text-stone-900 mt-0.5">{authorCount}</div>
          </div>
          <span className="rounded-xl bg-stone-100 p-2 text-stone-600">✍️</span>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Taxonomy Categories
            </span>
            <div className="text-xl font-bold text-stone-900 mt-0.5">{categoryCount}</div>
          </div>
          <span className="rounded-xl bg-stone-100 p-2 text-stone-600">📚</span>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Thematic Tags
            </span>
            <div className="text-xl font-bold text-stone-900 mt-0.5">{tagCount}</div>
          </div>
          <span className="rounded-xl bg-stone-100 p-2 text-stone-600">🏷️</span>
        </div>
      </div>

      {/* Card 1: Default Ingestion Settings */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="border-b border-stone-100 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
            Ingestion Defaults &amp; Policy
          </h2>
          <p className="text-xs text-stone-500">
            Fallback metadata applied to rows or web source quotes lacking explicit attributes.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
              Default Category
            </label>
            <select
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
              value={defaultCategoryId}
              onChange={(e) => setDefaultCategoryId(e.target.value)}
            >
              <option value="">No fallback category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
              Default Author
            </label>
            <select
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
              value={defaultAuthorId}
              onChange={(e) => setDefaultAuthorId(e.target.value)}
            >
              <option value="">No fallback author</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
              Wikiquote Max Quotes Per Page
            </label>
            <input
              type="number"
              min={1}
              max={200}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all font-mono"
              value={maxQuotesPerPage}
              onChange={(e) => setMaxQuotesPerPage(e.target.value)}
            />
          </div>
        </div>

        {/* Default Tags Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
            Default Tags ({defaultTagIds.length} selected)
          </label>
          <select
            multiple
            className="w-full rounded-xl border border-stone-300 bg-white p-3 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all min-h-[100px]"
            value={defaultTagIds}
            onChange={(e) =>
              setDefaultTagIds(Array.from(e.target.selectedOptions, (option) => option.value))
            }
          >
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name} ({tag.slug})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-stone-400">
            Hold Ctrl (or Cmd on Mac) to select multiple default tags applied across all imported records.
          </p>
        </div>

        {/* Ingestion Switches */}
        <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t border-stone-100">
          <label className="flex items-center gap-2.5 rounded-xl border border-stone-200/90 p-3 bg-stone-50/40 text-xs font-medium text-stone-800 cursor-pointer hover:bg-stone-50">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
              checked={publishByDefault}
              onChange={(e) => setPublishByDefault(e.target.checked)}
            />
            <span>Publish quotes immediately</span>
          </label>

          <label className="flex items-center gap-2.5 rounded-xl border border-stone-200/90 p-3 bg-stone-50/40 text-xs font-medium text-stone-800 cursor-pointer hover:bg-stone-50">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
              checked={autoCreateAuthors}
              onChange={(e) => setAutoCreateAuthors(e.target.checked)}
            />
            <span>Auto-create missing authors</span>
          </label>

          <label className="flex items-center gap-2.5 rounded-xl border border-stone-200/90 p-3 bg-stone-50/40 text-xs font-medium text-stone-800 cursor-pointer hover:bg-stone-50">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            <span>Import verified quotes only</span>
          </label>
        </div>
      </section>

      {/* Card 2: Web Harvesters */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
              Web Source Harvesters
            </h2>
            <p className="text-xs text-stone-500">
              Scrape validated literary quotes from Wikimedia Wikiquote, Project Gutenberg, and Wikisource.
            </p>
          </div>
          <Badge variant="neutral" size="xs">
            Web Scraper
          </Badge>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                Wikiquote URLs
              </label>
              <span className="text-[10px] font-mono text-stone-400">1 per line</span>
            </div>
            <textarea
              className="w-full min-h-[110px] rounded-xl border border-stone-300 bg-white p-3 font-mono text-xs text-stone-800 placeholder:text-stone-300 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all leading-relaxed"
              value={wikiquoteUrlsInput}
              onChange={(e) => setWikiquoteUrlsInput(e.target.value)}
              placeholder={"https://en.wikiquote.org/wiki/Rumi\nhttps://en.wikiquote.org/wiki/Rabindranath_Tagore"}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                Project Gutenberg Ebooks
              </label>
              <span className="text-[10px] font-mono text-stone-400">1 per line</span>
            </div>
            <textarea
              className="w-full min-h-[110px] rounded-xl border border-stone-300 bg-white p-3 font-mono text-xs text-stone-800 placeholder:text-stone-300 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all leading-relaxed"
              value={gutenbergUrlsInput}
              onChange={(e) => setGutenbergUrlsInput(e.target.value)}
              placeholder={"https://www.gutenberg.org/ebooks/1342\nhttps://www.gutenberg.org/ebooks/2701"}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                Wikisource Texts
              </label>
              <span className="text-[10px] font-mono text-stone-400">1 per line</span>
            </div>
            <textarea
              className="w-full min-h-[110px] rounded-xl border border-stone-300 bg-white p-3 font-mono text-xs text-stone-800 placeholder:text-stone-300 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all leading-relaxed"
              value={wikisourceUrlsInput}
              onChange={(e) => setWikisourceUrlsInput(e.target.value)}
              placeholder={"https://en.wikisource.org/wiki/The_Raven\nhttps://en.wikisource.org/wiki/If%E2%80%94"}
            />
          </div>
        </div>
      </section>

      {/* Card 3: File Upload & Pasted Data */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="border-b border-stone-100 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
            Batch File &amp; Paste Ingestion
          </h2>
          <p className="text-xs text-stone-500">
            Upload CSV or JSON files or paste tabular data directly from spreadsheets.
          </p>
        </div>

        {/* File Upload Component */}
        <BulkFileUploadInput
          onFileChange={onFileChange}
          loadedCount={uploadedItems?.length}
          label="Choose JSON or CSV Dataset"
        />

        {/* Pasted Input Area */}
        <div className="space-y-2 pt-2 border-t border-stone-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
              Or Paste Delimited Rows / JSON
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-stone-400">
                Format:{" "}
                <span className="font-mono font-bold uppercase text-stone-700">
                  {pastedFormatHint === "empty" ? "none" : pastedFormatHint}
                </span>
              </span>
              {pastedLineCount > 0 && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-mono text-stone-600">
                  {pastedLineCount} lines
                </span>
              )}
            </div>
          </div>

          <textarea
            className="w-full min-h-[140px] rounded-xl border border-stone-300 bg-white p-3 font-mono text-xs text-stone-800 placeholder:text-stone-300 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all leading-relaxed"
            value={pastedInput}
            onChange={(e) => {
              const next = e.target.value
              setPastedInput(next)
              const trimmed = next.trim()
              if (!trimmed) {
                setPastedFormatHint("empty")
              } else if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
                setPastedFormatHint("json")
              } else if (trimmed.includes("\t")) {
                setPastedFormatHint("tsv")
              } else {
                setPastedFormatHint("csv")
              }
            }}
            placeholder={`content,meaning,authorName,categoryName,sourceTitle,sourceType,tagSlugs,publish\n"The unexamined life is not worth living.","A life without reflection lacks true value.",Socrates,Philosophy,Apology,BOOK,"philosophy|self-knowledge",true`}
          />

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              className="rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-black transition-all cursor-pointer"
              onClick={onParsePastedInput}
            >
              Parse Pasted Text
            </button>
            <button
              type="button"
              className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-all cursor-pointer"
              onClick={() => setPastedTemplate("csv")}
            >
              CSV Example
            </button>
            <button
              type="button"
              className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-all cursor-pointer"
              onClick={() => setPastedTemplate("json")}
            >
              JSON Example
            </button>
            <button
              type="button"
              className="text-xs text-stone-500 hover:text-stone-800 underline underline-offset-2 ml-auto cursor-pointer"
              onClick={() => {
                setPastedInput("")
                setPastedFormatHint("empty")
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      {/* Card 4: JSON Payload Inspector */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
              Active Import Payload
            </h2>
            <p className="text-xs text-stone-500">
              Structured JSON submitted to the ingestion engine.
            </p>
          </div>
          <button
            type="button"
            className="text-xs text-[var(--accent-rust)] hover:underline font-medium"
            onClick={() => {
              setPayload(JSON.stringify(EXAMPLE, null, 2))
              setUploadedItems(null)
            }}
          >
            Load Sample Payload
          </button>
        </div>

        <textarea
          className="w-full min-h-[160px] rounded-xl border border-stone-300 bg-stone-50/50 p-3 font-mono text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all leading-relaxed"
          value={payload}
          onChange={(e) => {
            setPayload(e.target.value)
            setUploadedItems(null)
          }}
        />
      </section>

      {/* Pre-Flight Validation Summary */}
      {preflightReport && (
        <div
          className={`rounded-2xl border p-4 sm:p-5 space-y-3 transition-all ${
            preflightReport.missingContentCount > 0
              ? "border-amber-300 bg-amber-50/40"
              : "border-stone-200/90 bg-white shadow-2xs"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-200/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-900">
                Pre-Flight Ingest Check
              </span>
              <Badge
                variant={preflightReport.missingContentCount > 0 ? "warning" : "success"}
                size="xs"
              >
                {preflightReport.validCount} of {preflightReport.total} records valid
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-600">
              {preflightReport.urlHarvesterCount > 0 && (
                <span>{preflightReport.urlHarvesterCount} web sources</span>
              )}
              {preflightReport.duplicateInBatchCount > 0 && (
                <span className="text-amber-700 font-medium">
                  {preflightReport.duplicateInBatchCount} duplicates in batch
                </span>
              )}
              {preflightReport.missingContentCount > 0 && (
                <span className="text-red-600 font-medium">
                  {preflightReport.missingContentCount} missing quote text
                </span>
              )}
            </div>
          </div>

          {preflightReport.warnings.length > 0 ? (
            <div className="space-y-1 text-xs text-amber-800">
              <div className="font-semibold text-amber-900">Ingest notes:</div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-700">
                {preflightReport.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-xs text-emerald-700 flex items-center gap-1.5 font-medium">
              <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>All records passed structural checks and are ready for import.</span>
            </div>
          )}
        </div>
      )}

      {/* Error Banners */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}
      {previewError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {previewError}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-stone-200/90 bg-stone-50/80 p-4 sm:p-5">
        <label className="flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
            checked={useSelectedPreviewOnly}
            onChange={(e) => setUseSelectedPreviewOnly(e.target.checked)}
          />
          <span>Import only selected preview candidates</span>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={previewLoading}
            onClick={onPreview}
            className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-stone-800 shadow-2xs hover:bg-stone-50 disabled:opacity-50 transition-all cursor-pointer"
          >
            {previewLoading ? "Scraping..." : "Preview Source Imports"}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-stone-900 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-xs hover:bg-black disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? "Importing Quotes..." : "Run Bulk Import"}
          </button>
        </div>
      </div>

      {/* Preview Result Display */}
      {preview && (
        <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
                Source Preview Results
              </h3>
              <p className="text-xs text-stone-500">
                Sources: <span className="font-semibold text-stone-800">{preview.totalSources}</span> • Candidates:{" "}
                <span className="font-semibold text-stone-800">{preview.totalCandidates}</span> • Selected:{" "}
                <span className="font-semibold text-stone-800">{collectSelectedPreviewCandidates().length}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                onClick={() => {
                  const next: Record<string, boolean> = {}
                  for (const item of preview.items) {
                    for (const quote of item.candidates) {
                      next[candidateKey(item.sourceUrl, quote.content)] = true
                    }
                  }
                  setSelectedPreviewKeys(next)
                }}
              >
                Select All
              </button>
              <button
                type="button"
                className="rounded-lg border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                onClick={() => setSelectedPreviewKeys({})}
              >
                Clear Selection
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {preview.items.map((item) => (
              <div key={`${item.sourceType}:${item.sourceUrl}`} className="rounded-xl border border-stone-200/80 p-4 space-y-3 bg-stone-50/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="dark" size="xs">
                      {item.sourceType}
                    </Badge>
                    <span className="text-xs font-bold text-stone-800 truncate max-w-sm">
                      {item.sourceTitle}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-400">
                    {item.candidates.length} candidates
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {item.candidates.slice(0, 15).map((quote) => {
                    const key = candidateKey(item.sourceUrl, quote.content)
                    const isSelected = Boolean(selectedPreviewKeys[key])
                    return (
                      <label
                        key={key}
                        className={`flex items-start gap-3 rounded-lg border p-2.5 text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "border-stone-900 bg-white shadow-2xs"
                            : "border-stone-200/70 bg-white/70 hover:bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                          checked={isSelected}
                          onChange={(e) =>
                            setSelectedPreviewKeys((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                        />
                        <div className="space-y-0.5">
                          <p className="font-serif italic text-stone-900 leading-snug">
                            &ldquo;{quote.content}&rdquo;
                          </p>
                          {quote.citation && (
                            <span className="text-[10px] text-stone-400 block font-sans">
                              {quote.citation}
                            </span>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bulk Import Result Card using Design System Primitive */}
      {result && (
        <BulkImportResultCard
          result={result}
          onDismiss={() => setResult(null)}
        />
      )}
    </form>
  )
}
