"use client"

import { useMemo, useState } from "react"
import { getRowValue, readItemsFromJsonOrCsv, readItemsFromJsonOrCsvText } from "@/lib/import/clientFile"

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
      const items = mapRowsToImportItems(rows)

      setUploadedItems(items)
      setPayload(JSON.stringify(items, null, 2))
      setError(null)
    } catch {
      setUploadedItems(null)
      setError("Could not parse file. Upload valid JSON or CSV.")
    }
  }

  function onParsePastedInput() {
    try {
      const rows = readItemsFromJsonOrCsvText(pastedInput)
      const items = mapRowsToImportItems(rows)
      if (items.length === 0) {
        setUploadedItems(null)
        setError("No rows found in pasted content.")
        return
      }
      setUploadedItems(items)
      setPayload(JSON.stringify(items, null, 2))
      setError(null)
    } catch (err) {
      setUploadedItems(null)
      setError(err instanceof Error ? err.message : "Could not parse pasted JSON or CSV.")
    }
  }

  function setPastedTemplate(format: "json" | "csv") {
    if (format === "json") {
      setPastedInput(JSON.stringify(EXAMPLE, null, 2))
      setPastedFormatHint("json")
      return
    }

    setPastedInput(
      [
        "content,meaning,historicalContext,modernRelevance,authorName,categoryName,sourceTitle,sourceType,tagSlugs,publish",
        '"The unexamined life is not worth living.","A life without reflection lacks true value.","Often associated with Socrates defense speech at his trial in Athens.","Useful for framing self-reflection today.",Socrates,Philosophy,Apology,BOOK,"philosophy|self-knowledge",true',
        '"Knowledge is power.",,,,Francis Bacon,Knowledge,,,"knowledge",false',
      ].join("\n")
    )
    setPastedFormatHint("csv")
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

    let items: unknown[] | null = uploadedItems
    if (!items) {
      try {
        const parsed = JSON.parse(payload)
        items = Array.isArray(parsed)
          ? parsed
          : typeof parsed === "object" &&
              parsed !== null &&
              Array.isArray((parsed as { items?: unknown[] }).items)
            ? (parsed as { items: unknown[] }).items
            : []
      } catch {
        setPreviewLoading(false)
        setPreviewError("Invalid JSON in editor.")
        return
      }
    }

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
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border bg-white p-4 text-sm text-gray-700">
          <div className="font-semibold">{authorCount}</div>
          <div>Available authors</div>
        </div>
        <div className="rounded border bg-white p-4 text-sm text-gray-700">
          <div className="font-semibold">{categoryCount}</div>
          <div>Available categories</div>
        </div>
        <div className="rounded border bg-white p-4 text-sm text-gray-700">
          <div className="font-semibold">{tagCount}</div>
          <div>Available tags</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Default category (optional)</label>
              <select
                className="w-full border rounded p-2"
                value={defaultCategoryId}
                onChange={(e) => setDefaultCategoryId(e.target.value)}
              >
                <option value="">No default</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Default author (optional)</label>
              <select
                className="w-full border rounded p-2"
                value={defaultAuthorId}
                onChange={(e) => setDefaultAuthorId(e.target.value)}
              >
                <option value="">No default</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Default tags (optional)</label>
              <select
                multiple
                className="w-full border rounded p-2 min-h-[140px]"
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
              <p className="text-xs text-gray-500 mt-1">
                Applied to every imported quote, including source-based imports.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-end">
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={publishByDefault}
                onChange={(e) => setPublishByDefault(e.target.checked)}
              />
              Publish imported quotes by default
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoCreateAuthors}
                onChange={(e) => setAutoCreateAuthors(e.target.checked)}
              />
              Auto-create authors for Wikiquote pages
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
              />
              Import only verified source quotes
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-2">Wikiquote URLs (optional)</label>
          <textarea
            className="w-full border rounded p-2 min-h-[120px] font-mono text-xs"
            value={wikiquoteUrlsInput}
            onChange={(e) => setWikiquoteUrlsInput(e.target.value)}
            placeholder={"https://en.wikiquote.org/wiki/Rumi\nhttps://en.wikiquote.org/wiki/Rabindranath_Tagore"}
          />
          <p className="text-xs text-gray-500 mt-1">One page URL per line.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Gutenberg URLs (optional)</label>
          <textarea
            className="w-full border rounded p-2 min-h-[120px] font-mono text-xs"
            value={gutenbergUrlsInput}
            onChange={(e) => setGutenbergUrlsInput(e.target.value)}
            placeholder={"https://www.gutenberg.org/ebooks/1342\nhttps://www.gutenberg.org/ebooks/2701"}
          />
          <p className="text-xs text-gray-500 mt-1">One ebook URL per line.</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Wikisource URLs (optional)</label>
        <textarea
          className="w-full border rounded p-2 min-h-[120px] font-mono text-xs"
          value={wikisourceUrlsInput}
          onChange={(e) => setWikisourceUrlsInput(e.target.value)}
          placeholder={"https://en.wikisource.org/wiki/The_Raven\nhttps://en.wikisource.org/wiki/If%E2%80%94"}
        />
        <p className="text-xs text-gray-500 mt-1">
          One page URL per line. Set default author if the page has no detectable author.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-2">Wikiquote max quotes per page</label>
          <input
            type="number"
            min={1}
            max={200}
            className="w-full max-w-xs border rounded p-2"
            value={maxQuotesPerPage}
            onChange={(e) => setMaxQuotesPerPage(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Upload JSON/CSV file (optional)</label>
        <input type="file" accept=".json,.csv,application/json,text/csv" onChange={onFileChange} />
        {uploadedItems && (
          <p className="text-xs text-gray-500">
            Loaded {uploadedItems.length} row(s) from file.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Paste JSON/CSV rows (optional)</label>
        <textarea
          className="w-full border rounded p-3 min-h-[180px] font-mono text-sm"
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
          placeholder={`content,meaning,historicalContext,modernRelevance,authorName,categoryName,sourceTitle,sourceType,tagSlugs,publish
"The unexamined life is not worth living.","A life without reflection lacks true value.","Often associated with Socrates' defense speech at his trial in Athens.","Useful for framing self-reflection today.",Socrates,Philosophy,Apology,BOOK,"philosophy|self-knowledge",true`}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="border rounded px-4 py-2 text-sm"
            onClick={onParsePastedInput}
          >
            Parse Pasted JSON/CSV
          </button>
          <button
            type="button"
            className="border rounded px-4 py-2 text-sm"
            onClick={() => setPastedTemplate("csv")}
          >
            Paste CSV Example
          </button>
          <button
            type="button"
            className="border rounded px-4 py-2 text-sm"
            onClick={() => setPastedTemplate("json")}
          >
            Paste JSON Example
          </button>
          <button
            type="button"
            className="text-sm text-gray-600 underline"
            onClick={() => {
              setPastedInput("")
              setPastedFormatHint("empty")
            }}
          >
            Clear pasted input
          </button>
          <p className="text-xs text-gray-500">
            Accepts a JSON array, <code>{`{ "items": [...] }`}</code>, CSV with headers, or spreadsheet rows pasted as tab-separated data.
          </p>
        </div>
        <p className="text-xs text-gray-500">
          Detected format:{" "}
          <span className="font-medium uppercase">
            {pastedFormatHint === "empty" ? "none" : pastedFormatHint}
          </span>{" "}
          {pastedLineCount > 0 ? `• ${pastedLineCount} non-empty line(s)` : ""}
          {uploadedItems ? ` • ${uploadedItems.length} parsed row(s) ready` : ""}
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Import payload</label>
        <textarea
          className="w-full border rounded p-3 min-h-[320px] font-mono text-sm"
          value={payload}
          placeholder={JSON.stringify(EXAMPLE, null, 2)}
          onChange={(e) => {
            setPayload(e.target.value)
            setUploadedItems(null)
          }}
        />
        <p className="text-xs text-gray-500">
          Manual rows can use <code>authorId</code> or <code>authorName</code>, and{" "}
          <code>categoryId</code> or <code>categoryName</code>. Tags can use <code>tagIds</code>,{" "}
          <code>tagSlugs</code>, <code>tagNames</code>, or <code>tags</code>. Source rows can use{" "}
          <code>wikiquoteUrl</code>, <code>gutenbergUrl</code>, or <code>wikisourceUrl</code> with an optional row
          category, or rely on the default category above.
        </p>
        <button
          type="button"
          className="text-xs underline text-gray-600"
          onClick={() => {
            setPayload(JSON.stringify(EXAMPLE, null, 2))
            setUploadedItems(null)
          }}
        >
          Load example payload
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {previewError && <p className="text-sm text-red-600">{previewError}</p>}

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={useSelectedPreviewOnly}
          onChange={(e) => setUseSelectedPreviewOnly(e.target.checked)}
        />
        Import only selected preview candidates
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={previewLoading}
          onClick={onPreview}
          className="border border-black px-5 py-2 rounded disabled:opacity-60"
        >
          {previewLoading ? "Previewing..." : "Preview Source Imports"}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-5 py-2 rounded disabled:opacity-60"
        >
          {loading ? "Importing..." : "Run Bulk Import"}
        </button>
      </div>

      {preview && (
        <div className="rounded border bg-white p-4 space-y-3">
          <h2 className="font-semibold">Preview Result</h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="border rounded px-3 py-1 text-xs"
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
              Select all
            </button>
            <button
              type="button"
              className="border rounded px-3 py-1 text-xs"
              onClick={() => setSelectedPreviewKeys({})}
            >
              Clear all
            </button>
          </div>
          <p className="text-sm text-gray-700">
            Sources: <span className="font-medium">{preview.totalSources}</span> • Candidates:{" "}
            <span className="font-medium">{preview.totalCandidates}</span> • Selected:{" "}
            <span className="font-medium">{collectSelectedPreviewCandidates().length}</span>
          </p>
          {preview.errors.length > 0 && (
            <div className="max-h-32 overflow-auto rounded border p-2 text-xs text-red-700 bg-red-50">
              {preview.errors.map((entry) => (
                <div key={entry}>{entry}</div>
              ))}
            </div>
          )}
          <div className="space-y-3">
            {preview.items.map((item) => (
              <div key={`${item.sourceType}:${item.sourceUrl}`} className="rounded border p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">{item.sourceType}</p>
                <p className="text-sm font-medium">{item.sourceTitle}</p>
                <p className="text-xs text-gray-600">
                  {item.authorName || "Unknown author"} • {item.language} • {item.candidates.length} candidate(s)
                </p>
                <div className="mt-2 max-h-40 overflow-auto space-y-2">
                  {item.candidates.slice(0, 10).map((quote) => (
                    <div key={`${item.sourceUrl}:${quote.content}`} className="text-xs text-gray-800">
                      <label className="inline-flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedPreviewKeys[candidateKey(item.sourceUrl, quote.content)])}
                          onChange={(e) =>
                            setSelectedPreviewKeys((prev) => ({
                              ...prev,
                              [candidateKey(item.sourceUrl, quote.content)]: e.target.checked,
                            }))
                          }
                        />
                        <span>&quot;{quote.content}&quot;</span>
                      </label>
                      {quote.citation && <div className="text-gray-500">{quote.citation}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="rounded border bg-white p-4 space-y-3">
          <h2 className="font-semibold">Import Result</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <ResultStat label="Received" value={result.totalReceived} />
            <ResultStat label="Accepted" value={result.acceptedRows} />
            <ResultStat label="Created" value={result.created} />
            <ResultStat label="Skipped" value={result.skipped} />
            <ResultStat label="Failed" value={result.failed} />
          </div>

          {result.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Errors</p>
              <div className="max-h-48 overflow-auto rounded border p-2 text-xs text-red-700 bg-red-50">
                {result.errors.map((entry) => (
                  <div key={entry}>{entry}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  )
}

function ResultStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-gray-50 p-3 border">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
    </div>
  )
}
