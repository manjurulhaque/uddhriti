"use client"

import { useEffect } from "react"
import { useState } from "react"
import { getRowValue, readItemsFromJsonOrCsv } from "@/lib/import/clientFile"

type Result = {
  received: number
  created: number
  skipped: number
  failed: number
  errors: string[]
}

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
  const [error, setError] = useState("")
  const [result, setResult] = useState<Result | null>(null)
  const [authors, setAuthors] = useState<Author[]>([])
  const [autoAuthorId, setAutoAuthorId] = useState("")
  const [autoWikidataId, setAutoWikidataId] = useState("")
  const [autoWikipediaUrl, setAutoWikipediaUrl] = useState("")
  const [autoLimit, setAutoLimit] = useState("25")
  const [autoLoading, setAutoLoading] = useState(false)
  const [autoError, setAutoError] = useState("")
  const [autoResult, setAutoResult] = useState<AutoImportResult | null>(null)
  const [openLibraryAuthorId, setOpenLibraryAuthorId] = useState("")
  const [openLibraryAuthorName, setOpenLibraryAuthorName] = useState("")
  const [openLibraryTitle, setOpenLibraryTitle] = useState("")
  const [openLibraryIsbn, setOpenLibraryIsbn] = useState("")
  const [openLibraryLimit, setOpenLibraryLimit] = useState("25")
  const [openLibraryLoading, setOpenLibraryLoading] = useState(false)
  const [openLibraryPreviewLoading, setOpenLibraryPreviewLoading] = useState(false)
  const [openLibraryError, setOpenLibraryError] = useState("")
  const [openLibraryResult, setOpenLibraryResult] = useState<AutoImportResult | null>(null)
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
    fetch("/api/admin/authors")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAuthors(Array.isArray(data) ? data : []))
      .catch(() => setAuthors([]))
  }, [])


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
      setError("")
    } catch {
      setUploadedItems(null)
      setError("Could not parse file. Upload valid JSON or CSV.")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    setResult(null)

    const items = uploadedItems ?? parseLines(input)
    if (items.length === 0) {
      setError("Please enter at least one line.")
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
      setError(data?.error || "Bulk import failed")
      setSubmitting(false)
      return
    }

    setResult(data)
    setSubmitting(false)
  }

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

    setAutoResult(data)
    setAutoLoading(false)
  }

  async function handleOpenLibraryImport(e: React.FormEvent) {
    e.preventDefault()
    setOpenLibraryLoading(true)
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
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setOpenLibraryError(data?.error || "Open Library import failed")
      setOpenLibraryLoading(false)
      return
    }

    setOpenLibraryResult(data)
    setOpenLibraryLoading(false)
  }

  async function handleOpenLibraryPreview(e: React.FormEvent) {
    e.preventDefault()
    setOpenLibraryPreviewLoading(true)
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
        preview: true,
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setOpenLibraryError(data?.error || "Open Library preview failed")
      setOpenLibraryPreviewLoading(false)
      return
    }

    setOpenLibraryResult(data)
    setOpenLibraryPreviewLoading(false)
  }

  async function handleCrossrefImport(e: React.FormEvent) {
    e.preventDefault()
    setCrossrefLoading(true)
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
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setCrossrefError(data?.error || "Crossref import failed")
      setCrossrefLoading(false)
      return
    }

    setCrossrefResult(data)
    setCrossrefLoading(false)
  }

  async function handleCrossrefPreview(e: React.FormEvent) {
    e.preventDefault()
    setCrossrefPreviewLoading(true)
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
        preview: true,
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setCrossrefError(data?.error || "Crossref preview failed")
      setCrossrefPreviewLoading(false)
      return
    }

    setCrossrefResult(data)
    setCrossrefPreviewLoading(false)
  }

  async function handleGoogleBooksImport(e: React.FormEvent) {
    e.preventDefault()
    setGoogleBooksLoading(true)
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
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setGoogleBooksError(data?.error || "Google Books import failed")
      setGoogleBooksLoading(false)
      return
    }

    setGoogleBooksResult(data)
    setGoogleBooksLoading(false)
  }

  async function handleGoogleBooksPreview(e: React.FormEvent) {
    e.preventDefault()
    setGoogleBooksPreviewLoading(true)
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
        preview: true,
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setGoogleBooksError(data?.error || "Google Books preview failed")
      setGoogleBooksPreviewLoading(false)
      return
    }

    setGoogleBooksResult(data)
    setGoogleBooksPreviewLoading(false)
  }

  async function handleLocImport(e: React.FormEvent) {
    e.preventDefault()
    setLocLoading(true)
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
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setLocError(data?.error || "Library of Congress import failed")
      setLocLoading(false)
      return
    }

    setLocResult(data)
    setLocLoading(false)
  }

  async function handleLocPreview(e: React.FormEvent) {
    e.preventDefault()
    setLocPreviewLoading(true)
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
        preview: true,
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setLocError(data?.error || "Library of Congress preview failed")
      setLocPreviewLoading(false)
      return
    }

    setLocResult(data)
    setLocPreviewLoading(false)
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Bulk Import Sources</h1>

      <div className="border rounded p-4 bg-white space-y-4">
        <h2 className="text-lg font-semibold">Auto Import from Wikidata</h2>
        <p className="text-sm text-gray-600">
          Import works for one author automatically using author selection, Wikidata ID,
          or Wikipedia URL.
        </p>

        <form onSubmit={handleAutoImport} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Author (optional)</label>
            <select
              className="border w-full p-2 rounded"
              value={autoAuthorId}
              onChange={(e) => setAutoAuthorId(e.target.value)}
            >
              <option value="">No linked author</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Wikidata ID (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={autoWikidataId}
                onChange={(e) => setAutoWikidataId(e.target.value)}
                placeholder="Q937"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Wikipedia URL (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={autoWikipediaUrl}
                onChange={(e) => setAutoWikipediaUrl(e.target.value)}
                placeholder="https://en.wikipedia.org/wiki/..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Import limit</label>
            <input
              type="number"
              min={1}
              max={200}
              className="border w-full p-2 rounded max-w-xs"
              value={autoLimit}
              onChange={(e) => setAutoLimit(e.target.value)}
            />
          </div>

          {autoError && <p className="text-sm text-red-600">{autoError}</p>}

          <button
            disabled={autoLoading}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {autoLoading ? "Importing..." : "Auto Import Sources"}
          </button>
        </form>

        {autoResult && (
          <div className="border rounded p-3 bg-gray-50 space-y-1 text-sm">
            <div>
              Resolved: <b>{autoResult.resolved}</b>
            </div>
            <div>
              Created: <b>{autoResult.created}</b>
            </div>
            <div>
              Skipped: <b>{autoResult.skipped}</b>
            </div>
            <div>
              Failed: <b>{autoResult.failed}</b>
            </div>
            {autoResult.errors.length > 0 && (
              <ul className="text-red-700 list-disc pl-5">
                {autoResult.errors.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="border rounded p-4 bg-white space-y-4">
        <h2 className="text-lg font-semibold">Auto Import from Crossref</h2>
        <p className="text-sm text-gray-600">
          Import article/book metadata from Crossref using author, title, free query, or DOI.
        </p>

        <form onSubmit={handleCrossrefImport} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Author (optional)</label>
            <select
              className="border w-full p-2 rounded"
              value={crossrefAuthorId}
              onChange={(e) => setCrossrefAuthorId(e.target.value)}
            >
              <option value="">No linked author</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Author Name (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={crossrefAuthorName}
                onChange={(e) => setCrossrefAuthorName(e.target.value)}
                placeholder="Albert Einstein"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={crossrefTitle}
                onChange={(e) => setCrossrefTitle(e.target.value)}
                placeholder="Relativity"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Query (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={crossrefQuery}
                onChange={(e) => setCrossrefQuery(e.target.value)}
                placeholder="quantum theory"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">DOI (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={crossrefDoi}
                onChange={(e) => setCrossrefDoi(e.target.value)}
                placeholder="10.1038/s41586-020-2649-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Import limit</label>
            <input
              type="number"
              min={1}
              max={100}
              className="border w-full p-2 rounded max-w-xs"
              value={crossrefLimit}
              onChange={(e) => setCrossrefLimit(e.target.value)}
            />
          </div>

          {crossrefError && <p className="text-sm text-red-600">{crossrefError}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={crossrefPreviewLoading}
              onClick={handleCrossrefPreview}
              className="border px-4 py-2 rounded disabled:opacity-50"
            >
              {crossrefPreviewLoading ? "Previewing..." : "Preview Crossref"}
            </button>
            <button
              disabled={crossrefLoading}
              className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {crossrefLoading ? "Importing..." : "Auto Import Crossref"}
            </button>
          </div>
        </form>

        {crossrefResult && (
          <div className="border rounded p-3 bg-gray-50 space-y-1 text-sm">
            {crossrefResult.preview && (
              <div className="font-medium text-gray-700">Preview only (no records created)</div>
            )}
            <div>
              Resolved: <b>{crossrefResult.resolved}</b>
            </div>
            <div>
              Created: <b>{crossrefResult.created}</b>
            </div>
            <div>
              Skipped: <b>{crossrefResult.skipped}</b>
            </div>
            <div>
              Failed: <b>{crossrefResult.failed}</b>
            </div>
            {crossrefResult.errors.length > 0 && (
              <ul className="text-red-700 list-disc pl-5">
                {crossrefResult.errors.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
            {crossrefResult.preview && crossrefResult.items && crossrefResult.items.length > 0 && (
              <div className="mt-3 max-h-64 overflow-auto border rounded bg-white p-2 space-y-1">
                {crossrefResult.items.map((item) => (
                  <div key={`${item.title}|${item.externalUrl}`} className="text-xs">
                    <div className="font-medium">
                      {item.title} {item.duplicate ? "(duplicate)" : ""}
                    </div>
                    <div className="text-gray-600">
                      {item.year || "-"} • {item.publisher || "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border rounded p-4 bg-white space-y-4">
        <h2 className="text-lg font-semibold">Auto Import from Google Books</h2>
        <p className="text-sm text-gray-600">
          Import book metadata from Google Books using author, title, free query, or ISBN.
        </p>

        <form onSubmit={handleGoogleBooksImport} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Author (optional)</label>
            <select
              className="border w-full p-2 rounded"
              value={googleBooksAuthorId}
              onChange={(e) => setGoogleBooksAuthorId(e.target.value)}
            >
              <option value="">No linked author</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Author Name (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={googleBooksAuthorName}
                onChange={(e) => setGoogleBooksAuthorName(e.target.value)}
                placeholder="Paulo Coelho"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={googleBooksTitle}
                onChange={(e) => setGoogleBooksTitle(e.target.value)}
                placeholder="The Alchemist"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Query (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={googleBooksQuery}
                onChange={(e) => setGoogleBooksQuery(e.target.value)}
                placeholder="mindfulness"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ISBN (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={googleBooksIsbn}
                onChange={(e) => setGoogleBooksIsbn(e.target.value)}
                placeholder="9780061122415"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Import limit</label>
            <input
              type="number"
              min={1}
              max={40}
              className="border w-full p-2 rounded max-w-xs"
              value={googleBooksLimit}
              onChange={(e) => setGoogleBooksLimit(e.target.value)}
            />
          </div>

          {googleBooksError && <p className="text-sm text-red-600">{googleBooksError}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={googleBooksPreviewLoading}
              onClick={handleGoogleBooksPreview}
              className="border px-4 py-2 rounded disabled:opacity-50"
            >
              {googleBooksPreviewLoading ? "Previewing..." : "Preview Google Books"}
            </button>
            <button
              disabled={googleBooksLoading}
              className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {googleBooksLoading ? "Importing..." : "Auto Import Google Books"}
            </button>
          </div>
        </form>

        {googleBooksResult && (
          <div className="border rounded p-3 bg-gray-50 space-y-1 text-sm">
            {googleBooksResult.preview && (
              <div className="font-medium text-gray-700">Preview only (no records created)</div>
            )}
            <div>
              Resolved: <b>{googleBooksResult.resolved}</b>
            </div>
            <div>
              Created: <b>{googleBooksResult.created}</b>
            </div>
            <div>
              Skipped: <b>{googleBooksResult.skipped}</b>
            </div>
            <div>
              Failed: <b>{googleBooksResult.failed}</b>
            </div>
            {googleBooksResult.errors.length > 0 && (
              <ul className="text-red-700 list-disc pl-5">
                {googleBooksResult.errors.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
            {googleBooksResult.preview &&
              googleBooksResult.items &&
              googleBooksResult.items.length > 0 && (
                <div className="mt-3 max-h-64 overflow-auto border rounded bg-white p-2 space-y-1">
                  {googleBooksResult.items.map((item) => (
                    <div key={`${item.title}|${item.externalUrl}`} className="text-xs">
                      <div className="font-medium">
                        {item.title} {item.duplicate ? "(duplicate)" : ""}
                      </div>
                      <div className="text-gray-600">
                        {item.year || "-"} • {item.publisher || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
      </div>

      <div className="border rounded p-4 bg-white space-y-4">
        <h2 className="text-lg font-semibold">Auto Import from Open Library</h2>
        <p className="text-sm text-gray-600">
          Import book sources by author, title, or ISBN from Open Library metadata.
        </p>

        <form onSubmit={handleOpenLibraryImport} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Author (optional)</label>
            <select
              className="border w-full p-2 rounded"
              value={openLibraryAuthorId}
              onChange={(e) => setOpenLibraryAuthorId(e.target.value)}
            >
              <option value="">No linked author</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Author Name (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={openLibraryAuthorName}
                onChange={(e) => setOpenLibraryAuthorName(e.target.value)}
                placeholder="Rabindranath Tagore"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={openLibraryTitle}
                onChange={(e) => setOpenLibraryTitle(e.target.value)}
                placeholder="Gitanjali"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">ISBN (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={openLibraryIsbn}
                onChange={(e) => setOpenLibraryIsbn(e.target.value)}
                placeholder="9780140449181"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Import limit</label>
              <input
                type="number"
                min={1}
                max={200}
                className="border w-full p-2 rounded"
                value={openLibraryLimit}
                onChange={(e) => setOpenLibraryLimit(e.target.value)}
              />
            </div>
          </div>

          {openLibraryError && <p className="text-sm text-red-600">{openLibraryError}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={openLibraryPreviewLoading}
              onClick={handleOpenLibraryPreview}
              className="border px-4 py-2 rounded disabled:opacity-50"
            >
              {openLibraryPreviewLoading ? "Previewing..." : "Preview Open Library"}
            </button>
            <button
              disabled={openLibraryLoading}
              className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {openLibraryLoading ? "Importing..." : "Auto Import Open Library"}
            </button>
          </div>
        </form>

        {openLibraryResult && (
          <div className="border rounded p-3 bg-gray-50 space-y-1 text-sm">
            {openLibraryResult.preview && (
              <div className="font-medium text-gray-700">Preview only (no records created)</div>
            )}
            <div>
              Resolved: <b>{openLibraryResult.resolved}</b>
            </div>
            <div>
              Created: <b>{openLibraryResult.created}</b>
            </div>
            <div>
              Skipped: <b>{openLibraryResult.skipped}</b>
            </div>
            <div>
              Failed: <b>{openLibraryResult.failed}</b>
            </div>
            {openLibraryResult.errors.length > 0 && (
              <ul className="text-red-700 list-disc pl-5">
                {openLibraryResult.errors.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
            {openLibraryResult.preview && openLibraryResult.items && openLibraryResult.items.length > 0 && (
              <div className="mt-3 max-h-64 overflow-auto border rounded bg-white p-2 space-y-1">
                {openLibraryResult.items.map((item) => (
                  <div key={`${item.title}|${item.externalUrl}`} className="text-xs">
                    <div className="font-medium">
                      {item.title} {item.duplicate ? "(duplicate)" : ""}
                    </div>
                    <div className="text-gray-600">
                      {item.year || "-"} • {item.publisher || "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border rounded p-4 bg-white space-y-4">
        <h2 className="text-lg font-semibold">Auto Import from Library of Congress</h2>
        <p className="text-sm text-gray-600">
          Import book metadata from LoC using title, author, query, or ISBN.
        </p>

        <form onSubmit={handleLocImport} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Author (optional)</label>
            <select
              className="border w-full p-2 rounded"
              value={locAuthorId}
              onChange={(e) => setLocAuthorId(e.target.value)}
            >
              <option value="">No linked author</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Author Name (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={locAuthorName}
                onChange={(e) => setLocAuthorName(e.target.value)}
                placeholder="James Baldwin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={locTitle}
                onChange={(e) => setLocTitle(e.target.value)}
                placeholder="Go Tell It on the Mountain"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Query (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={locQuery}
                onChange={(e) => setLocQuery(e.target.value)}
                placeholder="civil rights"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ISBN (optional)</label>
              <input
                className="border w-full p-2 rounded"
                value={locIsbn}
                onChange={(e) => setLocIsbn(e.target.value)}
                placeholder="9780802140883"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Import limit</label>
            <input
              type="number"
              min={1}
              max={100}
              className="border w-full p-2 rounded max-w-xs"
              value={locLimit}
              onChange={(e) => setLocLimit(e.target.value)}
            />
          </div>

          {locError && <p className="text-sm text-red-600">{locError}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={locPreviewLoading}
              onClick={handleLocPreview}
              className="border px-4 py-2 rounded disabled:opacity-50"
            >
              {locPreviewLoading ? "Previewing..." : "Preview LoC"}
            </button>
            <button
              disabled={locLoading}
              className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {locLoading ? "Importing..." : "Auto Import LoC"}
            </button>
          </div>
        </form>

        {locResult && (
          <div className="border rounded p-3 bg-gray-50 space-y-1 text-sm">
            {locResult.preview && (
              <div className="font-medium text-gray-700">Preview only (no records created)</div>
            )}
            <div>
              Resolved: <b>{locResult.resolved}</b>
            </div>
            <div>
              Created: <b>{locResult.created}</b>
            </div>
            <div>
              Skipped: <b>{locResult.skipped}</b>
            </div>
            <div>
              Failed: <b>{locResult.failed}</b>
            </div>
            {locResult.errors.length > 0 && (
              <ul className="text-red-700 list-disc pl-5">
                {locResult.errors.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
            {locResult.preview && locResult.items && locResult.items.length > 0 && (
              <div className="mt-3 max-h-64 overflow-auto border rounded bg-white p-2 space-y-1">
                {locResult.items.map((item) => (
                  <div key={`${item.title}|${item.externalUrl}`} className="text-xs">
                    <div className="font-medium">
                      {item.title} {item.duplicate ? "(duplicate)" : ""}
                    </div>
                    <div className="text-gray-600">
                      {item.year || "-"} • {item.publisher || "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-600">
        One source per line. Format:
        <br />
        <code>
          title|slug|type|year|yearApproximate|publisher|location|description|externalUrl|authorId
        </code>
        <br />
        Only <code>title</code> is required. Types: BOOK, SPEECH, ARTICLE, INTERVIEW,
        SCRIPTURE, LETTER, OTHER.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Upload JSON/CSV (optional)</label>
          <input type="file" accept=".json,.csv,application/json,text/csv" onChange={onFileChange} />
          {uploadedItems && (
            <p className="text-xs text-gray-500 mt-1">
              Loaded {uploadedItems.length} row(s) from file.
            </p>
          )}
        </div>

        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setUploadedItems(null)
          }}
          rows={16}
          className="border w-full p-3 rounded font-mono text-sm"
          placeholder={`Meditations|meditations|BOOK|180|true|Penguin Classics|Rome|Stoic writings||\nLetter from Birmingham Jail||LETTER|1963|false|||Open letter text|https://example.com|`}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={submitting}
          className="bg-black text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Importing..." : "Import Sources"}
        </button>
      </form>

      {result && (
        <div className="border rounded p-4 bg-white space-y-2">
          <div className="text-sm">
            Received: <b>{result.received}</b>
          </div>
          <div className="text-sm">
            Created: <b>{result.created}</b>
          </div>
          <div className="text-sm">
            Skipped: <b>{result.skipped}</b>
          </div>
          <div className="text-sm">
            Failed: <b>{result.failed}</b>
          </div>

          {result.errors.length > 0 && (
            <ul className="text-sm text-red-700 list-disc pl-5">
              {result.errors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

    </div>
  )
}
