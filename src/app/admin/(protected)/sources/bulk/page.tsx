"use client"

import { useEffect, useState } from "react"
import { getRowValue, readItemsFromJsonOrCsv } from "@/lib/import/clientFile"
import {
  PageHeader,
  BulkImportResultCard,
  BulkImportFormatGuide,
  BulkFileUploadInput,
  type BulkImportResultData,
} from "@/components/admin"
import {
  FormSection,
  FormActions,
  FormErrorBanner,
  Input,
  Select,
  Textarea,
  Button,
  Badge,
  TabSwitcher,
  type TabItem,
} from "@/components/ui"

type ImportTab = "manual" | "wikidata" | "crossref" | "googlebooks" | "openlibrary" | "loc"

const tabs: TabItem<ImportTab>[] = [
  { id: "manual", label: "File & Line Import" },
  { id: "wikidata", label: "Wikidata" },
  { id: "crossref", label: "Crossref" },
  { id: "googlebooks", label: "Google Books" },
  { id: "openlibrary", label: "Open Library" },
  { id: "loc", label: "Library of Congress" },
]

type AutoImportResult = {
  preview?: boolean
  resolved: number
  created: number
  skipped: number
  failed: number
  errors: string[]
  items?: Array<{
    title: string
    year: number | null
    publisher: string | null
    externalUrl: string
    duplicate: boolean
  }>
}

type Author = {
  id: string
  name: string
}

function parseYear(value: string) {
  if (!value.trim()) return null
  const num = Number(value.trim())
  return Number.isFinite(num) ? num : null
}

function parseBool(value: string) {
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes"
}

function parseLines(input: string) {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [
        title = "",
        slug = "",
        type = "",
        year = "",
        yearApproximate = "",
        publisher = "",
        location = "",
        description = "",
        externalUrl = "",
        authorId = "",
      ] = line.split("|")

      return {
        title: title.trim(),
        slug: slug.trim() || undefined,
        type: type.trim().toUpperCase() || undefined,
        year: parseYear(year),
        yearApproximate: parseBool(yearApproximate),
        publisher: publisher.trim() || null,
        location: location.trim() || null,
        description: description.trim() || null,
        externalUrl: externalUrl.trim() || null,
        authorId: authorId.trim() || null,
      }
    })
}

export default function BulkImportSourcesPage() {
  const [activeTab, setActiveTab] = useState<ImportTab>("manual")
  const [authors, setAuthors] = useState<Author[]>([])

  // Manual File/Text batch state
  const [input, setInput] = useState("")
  const [uploadedItems, setUploadedItems] = useState<
    {
      title: string
      slug?: string
      type?: string
      year?: number | null
      yearApproximate?: boolean
      publisher?: string | null
      location?: string | null
      description?: string | null
      externalUrl?: string | null
      authorId?: string | null
    }[] | null
  >(null)
  const [submitting, setSubmitting] = useState(false)
  const [manualError, setManualError] = useState("")
  const [manualResult, setManualResult] = useState<BulkImportResultData | null>(null)

  // Wikidata auto-import state
  const [autoAuthorId, setAutoAuthorId] = useState("")
  const [autoWikidataId, setAutoWikidataId] = useState("")
  const [autoWikipediaUrl, setAutoWikipediaUrl] = useState("")
  const [autoLimit, setAutoLimit] = useState("25")
  const [autoLoading, setAutoLoading] = useState(false)
  const [autoError, setAutoError] = useState("")
  const [autoResult, setAutoResult] = useState<BulkImportResultData | null>(null)

  // Crossref state
  const [crossrefAuthorId, setCrossrefAuthorId] = useState("")
  const [crossrefAuthorName, setCrossrefAuthorName] = useState("")
  const [crossrefQuery, setCrossrefQuery] = useState("")
  const [crossrefTitle, setCrossrefTitle] = useState("")
  const [crossrefDoi, setCrossrefDoi] = useState("")
  const [crossrefLimit, setCrossrefLimit] = useState("25")
  const [crossrefLoading, setCrossrefLoading] = useState(false)
  const [crossrefPreviewLoading, setCrossrefPreviewLoading] = useState(false)
  const [crossrefError, setCrossrefError] = useState("")
  const [crossrefResult, setCrossrefResult] = useState<AutoImportResult | null>(null)

  // Google Books state
  const [googleBooksAuthorId, setGoogleBooksAuthorId] = useState("")
  const [googleBooksAuthorName, setGoogleBooksAuthorName] = useState("")
  const [googleBooksQuery, setGoogleBooksQuery] = useState("")
  const [googleBooksTitle, setGoogleBooksTitle] = useState("")
  const [googleBooksIsbn, setGoogleBooksIsbn] = useState("")
  const [googleBooksLimit, setGoogleBooksLimit] = useState("25")
  const [googleBooksLoading, setGoogleBooksLoading] = useState(false)
  const [googleBooksPreviewLoading, setGoogleBooksPreviewLoading] = useState(false)
  const [googleBooksError, setGoogleBooksError] = useState("")
  const [googleBooksResult, setGoogleBooksResult] = useState<AutoImportResult | null>(null)

  // Open Library state
  const [openLibraryAuthorId, setOpenLibraryAuthorId] = useState("")
  const [openLibraryAuthorName, setOpenLibraryAuthorName] = useState("")
  const [openLibraryTitle, setOpenLibraryTitle] = useState("")
  const [openLibraryIsbn, setOpenLibraryIsbn] = useState("")
  const [openLibraryLimit, setOpenLibraryLimit] = useState("25")
  const [openLibraryLoading, setOpenLibraryLoading] = useState(false)
  const [openLibraryPreviewLoading, setOpenLibraryPreviewLoading] = useState(false)
  const [openLibraryError, setOpenLibraryError] = useState("")
  const [openLibraryResult, setOpenLibraryResult] = useState<AutoImportResult | null>(null)

  // Library of Congress state
  const [locAuthorId, setLocAuthorId] = useState("")
  const [locAuthorName, setLocAuthorName] = useState("")
  const [locQuery, setLocQuery] = useState("")
  const [locTitle, setLocTitle] = useState("")
  const [locIsbn, setLocIsbn] = useState("")
  const [locLimit, setLocLimit] = useState("25")
  const [locLoading, setLocLoading] = useState(false)
  const [locPreviewLoading, setLocPreviewLoading] = useState(false)
  const [locError, setLocError] = useState("")
  const [locResult, setLocResult] = useState<AutoImportResult | null>(null)

  useEffect(() => {
    fetch("/api/admin/authors?select=minimal")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAuthors(Array.isArray(data) ? data : []))
      .catch(() => setAuthors([]))
  }, [])

  const authorSelectOptions = [
    { value: "", label: "No linked author" },
    ...authors.map((a) => ({ value: a.id, label: a.name })),
  ]

  // File upload handler for manual batch
  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const rows = await readItemsFromJsonOrCsv(file)
      const items = rows.map((row) => ({
        title: getRowValue(row, "title").trim(),
        slug: getRowValue(row, "slug").trim() || undefined,
        type: getRowValue(row, "type").trim().toUpperCase() || undefined,
        year: parseYear(getRowValue(row, "year")),
        yearApproximate: parseBool(getRowValue(row, "yearApproximate")),
        publisher: getRowValue(row, "publisher").trim() || null,
        location: getRowValue(row, "location").trim() || null,
        description: getRowValue(row, "description").trim() || null,
        externalUrl: getRowValue(row, "externalUrl").trim() || null,
        authorId: getRowValue(row, "authorId").trim() || null,
      }))
      setUploadedItems(items)
      setManualError("")
    } catch {
      setUploadedItems(null)
      setManualError("Could not parse file. Upload valid JSON or CSV.")
    }
  }

  // Manual import submission
  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setManualError("")
    setManualResult(null)

    const items = uploadedItems ?? parseLines(input)
    if (items.length === 0) {
      setManualError("Please enter at least one source row or upload a file.")
      setSubmitting(false)
      return
    }

    const res = await fetch("/api/admin/sources/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setManualError(data?.error || "Bulk import failed")
      setSubmitting(false)
      return
    }

    setManualResult(data)
    setSubmitting(false)
  }

  // Wikidata auto-import submission
  async function handleAutoImport(e: React.FormEvent) {
    e.preventDefault()
    setAutoLoading(true)
    setAutoError("")
    setAutoResult(null)

    const res = await fetch("/api/admin/sources/auto-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorId: autoAuthorId || undefined,
        wikidataId: autoWikidataId || undefined,
        wikipediaUrl: autoWikipediaUrl || undefined,
        limit: Number(autoLimit || 25),
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setAutoError(data?.error || "Auto import failed")
      setAutoLoading(false)
      return
    }

    setAutoResult({
      totalReceived: data.resolved,
      created: data.created,
      skipped: data.skipped,
      failed: data.failed,
      errors: data.errors,
    })
    setAutoLoading(false)
  }

  // Crossref import & preview
  async function handleCrossref(isPreview: boolean) {
    if (isPreview) {
      setCrossrefPreviewLoading(true)
    } else {
      setCrossrefLoading(true)
    }
    setCrossrefError("")
    setCrossrefResult(null)

    const res = await fetch("/api/admin/sources/crossref-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorId: crossrefAuthorId || undefined,
        authorName: crossrefAuthorName || undefined,
        query: crossrefQuery || undefined,
        title: crossrefTitle || undefined,
        doi: crossrefDoi || undefined,
        limit: Number(crossrefLimit || 25),
        preview: isPreview,
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setCrossrefError(data?.error || `Crossref ${isPreview ? "preview" : "import"} failed`)
      setCrossrefPreviewLoading(false)
      setCrossrefLoading(false)
      return
    }

    setCrossrefResult(data)
    setCrossrefPreviewLoading(false)
    setCrossrefLoading(false)
  }

  // Google Books import & preview
  async function handleGoogleBooks(isPreview: boolean) {
    if (isPreview) {
      setGoogleBooksPreviewLoading(true)
    } else {
      setGoogleBooksLoading(true)
    }
    setGoogleBooksError("")
    setGoogleBooksResult(null)

    const res = await fetch("/api/admin/sources/googlebooks-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorId: googleBooksAuthorId || undefined,
        authorName: googleBooksAuthorName || undefined,
        query: googleBooksQuery || undefined,
        title: googleBooksTitle || undefined,
        isbn: googleBooksIsbn || undefined,
        limit: Number(googleBooksLimit || 25),
        preview: isPreview,
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setGoogleBooksError(data?.error || `Google Books ${isPreview ? "preview" : "import"} failed`)
      setGoogleBooksPreviewLoading(false)
      setGoogleBooksLoading(false)
      return
    }

    setGoogleBooksResult(data)
    setGoogleBooksPreviewLoading(false)
    setGoogleBooksLoading(false)
  }

  // Open Library import & preview
  async function handleOpenLibrary(isPreview: boolean) {
    if (isPreview) {
      setOpenLibraryPreviewLoading(true)
    } else {
      setOpenLibraryLoading(true)
    }
    setOpenLibraryError("")
    setOpenLibraryResult(null)

    const res = await fetch("/api/admin/sources/openlibrary-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorId: openLibraryAuthorId || undefined,
        authorName: openLibraryAuthorName || undefined,
        title: openLibraryTitle || undefined,
        isbn: openLibraryIsbn || undefined,
        limit: Number(openLibraryLimit || 25),
        preview: isPreview,
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setOpenLibraryError(data?.error || `Open Library ${isPreview ? "preview" : "import"} failed`)
      setOpenLibraryPreviewLoading(false)
      setOpenLibraryLoading(false)
      return
    }

    setOpenLibraryResult(data)
    setOpenLibraryPreviewLoading(false)
    setOpenLibraryLoading(false)
  }

  // Library of Congress import & preview
  async function handleLoc(isPreview: boolean) {
    if (isPreview) {
      setLocPreviewLoading(true)
    } else {
      setLocLoading(true)
    }
    setLocError("")
    setLocResult(null)

    const res = await fetch("/api/admin/sources/loc-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorId: locAuthorId || undefined,
        authorName: locAuthorName || undefined,
        query: locQuery || undefined,
        title: locTitle || undefined,
        isbn: locIsbn || undefined,
        limit: Number(locLimit || 25),
        preview: isPreview,
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setLocError(data?.error || `Library of Congress ${isPreview ? "preview" : "import"} failed`)
      setLocPreviewLoading(false)
      setLocLoading(false)
      return
    }

    setLocResult(data)
    setLocPreviewLoading(false)
    setLocLoading(false)
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <PageHeader
        title="Bulk Import Sources"
        description="Ingest bibliographic records in batch or harvest publication metadata from Wikidata, Crossref, Google Books, Open Library, and Library of Congress."
        backHref="/admin/sources"
        backLabel="Back to Sources"
      />

      <TabSwitcher<ImportTab>
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        label="Source Importer Modes"
      />

      {/* TAB 1: MANUAL FILE & LINE IMPORT */}
      {activeTab === "manual" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <FormErrorBanner error={manualError} onDismiss={() => setManualError("")} />

          <BulkImportResultCard result={manualResult} onDismiss={() => setManualResult(null)} />

          <BulkImportFormatGuide
            format="title|slug|type|year|yearApproximate|publisher|location|description|externalUrl|authorId"
            notes={
              <p>
                Only <strong className="text-stone-900">title</strong> is required. Types: BOOK, SPEECH, ARTICLE, INTERVIEW, SCRIPTURE, LETTER, OTHER.
              </p>
            }
          />

          <form onSubmit={handleManualSubmit} className="space-y-6">
            <FormSection
              title="Data Input"
              description="Upload a CSV/JSON file or paste raw source lines"
            >
              <BulkFileUploadInput
                onFileChange={onFileChange}
                loadedCount={uploadedItems?.length}
              />

              <Textarea
                label="Raw Input Rows"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setUploadedItems(null)
                }}
                rows={12}
                className="font-mono text-xs leading-relaxed"
                placeholder={`Meditations|meditations|BOOK|180|true|Penguin Classics|Rome|Stoic writings||\nLetter from Birmingham Jail||LETTER|1963|false|||Open letter text|https://example.com|`}
                hint={
                  uploadedItems
                    ? "File upload loaded. Editing text overrides uploaded file."
                    : "Type or paste multiple lines above."
                }
              />
            </FormSection>

            <FormActions
              submitLabel="Import Sources"
              submittingLabel="Importing Sources..."
              isSubmitting={submitting}
              cancelHref="/admin/sources"
            />
          </form>
        </div>
      )}

      {/* TAB 2: WIKIDATA AUTO-IMPORT */}
      {activeTab === "wikidata" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <FormErrorBanner error={autoError} onDismiss={() => setAutoError("")} />

          <BulkImportResultCard result={autoResult} onDismiss={() => setAutoResult(null)} />

          <form onSubmit={handleAutoImport} className="space-y-6">
            <FormSection
              title="Wikidata / Wikipedia Metadata Harvest"
              description="Import published works for an author automatically using author selection, Wikidata ID, or Wikipedia URL"
            >
              <Select
                label="Linked Author (optional)"
                value={autoAuthorId}
                onChange={(e) => setAutoAuthorId(e.target.value)}
                options={authorSelectOptions}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Wikidata ID (optional)"
                  placeholder="e.g. Q937"
                  value={autoWikidataId}
                  onChange={(e) => setAutoWikidataId(e.target.value)}
                  hint="Identifier from Wikidata (e.g. Q937 for Albert Einstein)"
                />

                <Input
                  label="Wikipedia URL (optional)"
                  placeholder="https://en.wikipedia.org/wiki/..."
                  value={autoWikipediaUrl}
                  onChange={(e) => setAutoWikipediaUrl(e.target.value)}
                />
              </div>

              <Input
                type="number"
                min={1}
                max={200}
                label="Import Limit"
                value={autoLimit}
                onChange={(e) => setAutoLimit(e.target.value)}
                className="max-w-xs"
                hint="Maximum number of bibliographic records to ingest"
              />
            </FormSection>

            <FormActions
              submitLabel="Auto Import Sources"
              submittingLabel="Harvesting from Wikidata..."
              isSubmitting={autoLoading}
              cancelHref="/admin/sources"
            />
          </form>
        </div>
      )}

      {/* TAB 3: CROSSREF AUTO-IMPORT */}
      {activeTab === "crossref" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <FormErrorBanner error={crossrefError} onDismiss={() => setCrossrefError("")} />

          {crossrefResult && (
            <BulkImportResultCard
              result={{
                totalReceived: crossrefResult.resolved,
                created: crossrefResult.created,
                skipped: crossrefResult.skipped,
                failed: crossrefResult.failed,
                errors: crossrefResult.errors,
              }}
              onDismiss={() => setCrossrefResult(null)}
            />
          )}

          {crossrefResult?.preview && crossrefResult.items && crossrefResult.items.length > 0 && (
            <PreviewItemsList items={crossrefResult.items} />
          )}

          <div className="space-y-6">
            <FormSection
              title="Crossref Scholarly & Book Metadata"
              description="Import article and book records from Crossref using author name, title, free query, or DOI"
            >
              <Select
                label="Linked Author (optional)"
                value={crossrefAuthorId}
                onChange={(e) => setCrossrefAuthorId(e.target.value)}
                options={authorSelectOptions}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Author Name (optional)"
                  placeholder="e.g. Albert Einstein"
                  value={crossrefAuthorName}
                  onChange={(e) => setCrossrefAuthorName(e.target.value)}
                />

                <Input
                  label="Title (optional)"
                  placeholder="e.g. Relativity"
                  value={crossrefTitle}
                  onChange={(e) => setCrossrefTitle(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Free Query (optional)"
                  placeholder="e.g. quantum theory"
                  value={crossrefQuery}
                  onChange={(e) => setCrossrefQuery(e.target.value)}
                />

                <Input
                  label="DOI (optional)"
                  placeholder="e.g. 10.1038/s41586-020-2649-2"
                  value={crossrefDoi}
                  onChange={(e) => setCrossrefDoi(e.target.value)}
                />
              </div>

              <Input
                type="number"
                min={1}
                max={100}
                label="Import Limit"
                value={crossrefLimit}
                onChange={(e) => setCrossrefLimit(e.target.value)}
                className="max-w-xs"
              />
            </FormSection>

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-stone-200/80">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCrossref(true)}
                isLoading={crossrefPreviewLoading}
                disabled={crossrefLoading || crossrefPreviewLoading}
              >
                {crossrefPreviewLoading ? "Previewing..." : "Preview Crossref"}
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={() => handleCrossref(false)}
                isLoading={crossrefLoading}
                disabled={crossrefLoading || crossrefPreviewLoading}
              >
                {crossrefLoading ? "Importing..." : "Auto Import Crossref"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GOOGLE BOOKS AUTO-IMPORT */}
      {activeTab === "googlebooks" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <FormErrorBanner error={googleBooksError} onDismiss={() => setGoogleBooksError("")} />

          {googleBooksResult && (
            <BulkImportResultCard
              result={{
                totalReceived: googleBooksResult.resolved,
                created: googleBooksResult.created,
                skipped: googleBooksResult.skipped,
                failed: googleBooksResult.failed,
                errors: googleBooksResult.errors,
              }}
              onDismiss={() => setGoogleBooksResult(null)}
            />
          )}

          {googleBooksResult?.preview && googleBooksResult.items && googleBooksResult.items.length > 0 && (
            <PreviewItemsList items={googleBooksResult.items} />
          )}

          <div className="space-y-6">
            <FormSection
              title="Google Books Catalog Search"
              description="Import book volumes from Google Books using author name, title, free query, or ISBN"
            >
              <Select
                label="Linked Author (optional)"
                value={googleBooksAuthorId}
                onChange={(e) => setGoogleBooksAuthorId(e.target.value)}
                options={authorSelectOptions}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Author Name (optional)"
                  placeholder="e.g. Paulo Coelho"
                  value={googleBooksAuthorName}
                  onChange={(e) => setGoogleBooksAuthorName(e.target.value)}
                />

                <Input
                  label="Title (optional)"
                  placeholder="e.g. The Alchemist"
                  value={googleBooksTitle}
                  onChange={(e) => setGoogleBooksTitle(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Free Query (optional)"
                  placeholder="e.g. mindfulness"
                  value={googleBooksQuery}
                  onChange={(e) => setGoogleBooksQuery(e.target.value)}
                />

                <Input
                  label="ISBN (optional)"
                  placeholder="e.g. 9780061122415"
                  value={googleBooksIsbn}
                  onChange={(e) => setGoogleBooksIsbn(e.target.value)}
                />
              </div>

              <Input
                type="number"
                min={1}
                max={40}
                label="Import Limit"
                value={googleBooksLimit}
                onChange={(e) => setGoogleBooksLimit(e.target.value)}
                className="max-w-xs"
              />
            </FormSection>

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-stone-200/80">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleGoogleBooks(true)}
                isLoading={googleBooksPreviewLoading}
                disabled={googleBooksLoading || googleBooksPreviewLoading}
              >
                {googleBooksPreviewLoading ? "Previewing..." : "Preview Google Books"}
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={() => handleGoogleBooks(false)}
                isLoading={googleBooksLoading}
                disabled={googleBooksLoading || googleBooksPreviewLoading}
              >
                {googleBooksLoading ? "Importing..." : "Auto Import Google Books"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: OPEN LIBRARY AUTO-IMPORT */}
      {activeTab === "openlibrary" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <FormErrorBanner error={openLibraryError} onDismiss={() => setOpenLibraryError("")} />

          {openLibraryResult && (
            <BulkImportResultCard
              result={{
                totalReceived: openLibraryResult.resolved,
                created: openLibraryResult.created,
                skipped: openLibraryResult.skipped,
                failed: openLibraryResult.failed,
                errors: openLibraryResult.errors,
              }}
              onDismiss={() => setOpenLibraryResult(null)}
            />
          )}

          {openLibraryResult?.preview && openLibraryResult.items && openLibraryResult.items.length > 0 && (
            <PreviewItemsList items={openLibraryResult.items} />
          )}

          <div className="space-y-6">
            <FormSection
              title="Open Library Universal Catalog"
              description="Import book sources by author name, title, or ISBN from the Open Library open catalog"
            >
              <Select
                label="Linked Author (optional)"
                value={openLibraryAuthorId}
                onChange={(e) => setOpenLibraryAuthorId(e.target.value)}
                options={authorSelectOptions}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Author Name (optional)"
                  placeholder="e.g. Rabindranath Tagore"
                  value={openLibraryAuthorName}
                  onChange={(e) => setOpenLibraryAuthorName(e.target.value)}
                />

                <Input
                  label="Title (optional)"
                  placeholder="e.g. Gitanjali"
                  value={openLibraryTitle}
                  onChange={(e) => setOpenLibraryTitle(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="ISBN (optional)"
                  placeholder="e.g. 9780140449181"
                  value={openLibraryIsbn}
                  onChange={(e) => setOpenLibraryIsbn(e.target.value)}
                />

                <Input
                  type="number"
                  min={1}
                  max={200}
                  label="Import Limit"
                  value={openLibraryLimit}
                  onChange={(e) => setOpenLibraryLimit(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </FormSection>

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-stone-200/80">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenLibrary(true)}
                isLoading={openLibraryPreviewLoading}
                disabled={openLibraryLoading || openLibraryPreviewLoading}
              >
                {openLibraryPreviewLoading ? "Previewing..." : "Preview Open Library"}
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={() => handleOpenLibrary(false)}
                isLoading={openLibraryLoading}
                disabled={openLibraryLoading || openLibraryPreviewLoading}
              >
                {openLibraryLoading ? "Importing..." : "Auto Import Open Library"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: LIBRARY OF CONGRESS AUTO-IMPORT */}
      {activeTab === "loc" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <FormErrorBanner error={locError} onDismiss={() => setLocError("")} />

          {locResult && (
            <BulkImportResultCard
              result={{
                totalReceived: locResult.resolved,
                created: locResult.created,
                skipped: locResult.skipped,
                failed: locResult.failed,
                errors: locResult.errors,
              }}
              onDismiss={() => setLocResult(null)}
            />
          )}

          {locResult?.preview && locResult.items && locResult.items.length > 0 && (
            <PreviewItemsList items={locResult.items} />
          )}

          <div className="space-y-6">
            <FormSection
              title="Library of Congress Public Catalog"
              description="Import book records from the Library of Congress using author name, title, query, or ISBN"
            >
              <Select
                label="Linked Author (optional)"
                value={locAuthorId}
                onChange={(e) => setLocAuthorId(e.target.value)}
                options={authorSelectOptions}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Author Name (optional)"
                  placeholder="e.g. James Baldwin"
                  value={locAuthorName}
                  onChange={(e) => setLocAuthorName(e.target.value)}
                />

                <Input
                  label="Title (optional)"
                  placeholder="e.g. Go Tell It on the Mountain"
                  value={locTitle}
                  onChange={(e) => setLocTitle(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Query (optional)"
                  placeholder="e.g. civil rights"
                  value={locQuery}
                  onChange={(e) => setLocQuery(e.target.value)}
                />

                <Input
                  label="ISBN (optional)"
                  placeholder="e.g. 9780802140883"
                  value={locIsbn}
                  onChange={(e) => setLocIsbn(e.target.value)}
                />
              </div>

              <Input
                type="number"
                min={1}
                max={100}
                label="Import Limit"
                value={locLimit}
                onChange={(e) => setLocLimit(e.target.value)}
                className="max-w-xs"
              />
            </FormSection>

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-stone-200/80">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleLoc(true)}
                isLoading={locPreviewLoading}
                disabled={locLoading || locPreviewLoading}
              >
                {locPreviewLoading ? "Previewing..." : "Preview LoC"}
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={() => handleLoc(false)}
                isLoading={locLoading}
                disabled={locLoading || locPreviewLoading}
              >
                {locLoading ? "Importing..." : "Auto Import LoC"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PreviewItemsList({
  items,
}: {
  items: Array<{
    title: string
    year: number | null
    publisher: string | null
    externalUrl: string
    duplicate: boolean
  }>
}) {
  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs space-y-3 font-sans">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
            Preview Items ({items.length} Candidates)
          </h4>
          <p className="text-xs text-stone-500">
            Previewing remote catalog records without modifying the database.
          </p>
        </div>
        <Badge variant="neutral" size="xs">
          Dry Run
        </Badge>
      </div>

      <div className="max-h-72 overflow-y-auto space-y-2 divide-y divide-stone-100">
        {items.map((item, idx) => (
          <div key={`${idx}-${item.title}`} className="pt-2 flex items-start justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-900">{item.title}</span>
                {item.duplicate && (
                  <Badge variant="warning" size="xs">
                    Duplicate
                  </Badge>
                )}
              </div>
              <p className="text-stone-500">
                {[item.year || null, item.publisher || null, item.externalUrl || null]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
