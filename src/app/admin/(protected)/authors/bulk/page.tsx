"use client"

import { useState } from "react"
import { getRowValue, readItemsFromJsonOrCsv } from "@/lib/import/clientFile"

type Result = {
  received: number
  created: number
  failed: number
  errors: string[]
}

function toWikiquoteUrl(input: string) {
  const value = input.trim()
  if (!value) return null

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  const title = value
    .replace(/^\/?wiki\//i, "")
    .replace(/ /g, "_")

  return `https://en.wikiquote.org/wiki/${encodeURIComponent(title)}`
}

function parseWikiquotePeopleList(input: string) {
  return Array.from(
    new Set(
      input
        .split("\n")
        .map((line) => toWikiquoteUrl(line))
        .filter((line): line is string => Boolean(line))
    )
  )
}

function parseLines(input: string) {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [
        wikipediaUrl = "",
        wikidataId = "",
        wikipediaCategoryUrl = "",
        wikidataCategoryId = "",
        wikiquoteUrl = "",
        wikiquoteCategoryUrl = "",
      ] = line.split("|")
      return {
        wikipediaUrl: wikipediaUrl.trim() || undefined,
        wikidataId: wikidataId.trim() || undefined,
        wikipediaCategoryUrl: wikipediaCategoryUrl.trim() || undefined,
        wikidataCategoryId: wikidataCategoryId.trim() || undefined,
        wikiquoteUrl: wikiquoteUrl.trim() || undefined,
        wikiquoteCategoryUrl: wikiquoteCategoryUrl.trim() || undefined,
      }
    })
}

export default function BulkImportAuthorsPage() {
  const [input, setInput] = useState("")
  const [wikiquotePeopleInput, setWikiquotePeopleInput] = useState("")
  const [uploadedItems, setUploadedItems] = useState<
    {
      name?: string
      slug?: string
      bio?: string
      birthYear?: number
      deathYear?: number
      dateOfBirth?: string
      dateOfDeath?: string
      profession?: string
      nationality?: string
      imageUrl?: string
      wikipediaUrl?: string
      wikidataId?: string
      wikiquoteUrl?: string
      wikipediaCategoryUrl?: string
      wikiquoteCategoryUrl?: string
      wikidataCategoryId?: string
      categoryLimit?: number
    }[] | null
  >(null)
  const [wikipediaCategoryUrl, setWikipediaCategoryUrl] = useState("")
  const [wikiquoteCategoryUrl, setWikiquoteCategoryUrl] = useState("")
  const [wikidataCategoryId, setWikidataCategoryId] = useState("")
  const [categoryLimit, setCategoryLimit] = useState("100")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<Result | null>(null)

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const rows = await readItemsFromJsonOrCsv(file)
      const items = rows.map((row) => ({
        name: getRowValue(row, "name").trim() || undefined,
        slug: getRowValue(row, "slug").trim() || undefined,
        bio: getRowValue(row, "bio").trim() || undefined,
        birthYear: (() => {
          const raw = getRowValue(row, "birthYear").trim()
          if (!raw) return undefined
          const n = Number(raw)
          return Number.isFinite(n) ? n : undefined
        })(),
        deathYear: (() => {
          const raw = getRowValue(row, "deathYear").trim()
          if (!raw) return undefined
          const n = Number(raw)
          return Number.isFinite(n) ? n : undefined
        })(),
        dateOfBirth: getRowValue(row, "dateOfBirth").trim() || undefined,
        dateOfDeath: getRowValue(row, "dateOfDeath").trim() || undefined,
        profession: getRowValue(row, "profession").trim() || undefined,
        nationality: getRowValue(row, "nationality").trim() || undefined,
        imageUrl: getRowValue(row, "imageUrl").trim() || undefined,
        wikipediaUrl: getRowValue(row, "wikipediaUrl").trim() || undefined,
        wikidataId: getRowValue(row, "wikidataId").trim() || undefined,
        wikiquoteUrl: getRowValue(row, "wikiquoteUrl").trim() || undefined,
        wikipediaCategoryUrl: getRowValue(row, "wikipediaCategoryUrl").trim() || undefined,
        wikiquoteCategoryUrl: getRowValue(row, "wikiquoteCategoryUrl").trim() || undefined,
        wikidataCategoryId: getRowValue(row, "wikidataCategoryId").trim() || undefined,
        categoryLimit: (() => {
          const raw = getRowValue(row, "categoryLimit").trim()
          if (!raw) return undefined
          const n = Number(raw)
          return Number.isFinite(n) ? n : undefined
        })(),
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
    const wikiquoteUrls = parseWikiquotePeopleList(wikiquotePeopleInput)
    const hasCategorySource = Boolean(
      wikipediaCategoryUrl.trim() || wikiquoteCategoryUrl.trim() || wikidataCategoryId.trim()
    )

    if (items.length === 0 && wikiquoteUrls.length === 0 && !hasCategorySource) {
      setError("Please enter items, a Wikiquote people list, or provide a category source.")
      setSubmitting(false)
      return
    }

    const res = await fetch("/api/admin/authors/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        wikiquoteUrls,
        wikipediaCategoryUrl: wikipediaCategoryUrl || undefined,
        wikiquoteCategoryUrl: wikiquoteCategoryUrl || undefined,
        wikidataCategoryId: wikidataCategoryId || undefined,
        categoryLimit: Number(categoryLimit || 100),
      }),
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

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Bulk Import Authors</h1>

      <p className="text-sm text-gray-600">
        One author per line. Format:
        <br />
        <code>wikipediaUrl|wikidataId|wikipediaCategoryUrl|wikidataCategoryId|wikiquoteUrl|wikiquoteCategoryUrl</code>
        <br />
        Provide author identifiers, or category identifiers. You can also use the category
        fields below to import members directly. Uploaded JSON/CSV files can also use author
        schema fields such as <code>name</code>, <code>slug</code>, <code>bio</code>,
        <code>birthYear</code>, <code>deathYear</code>, <code>dateOfBirth</code>,
        <code>dateOfDeath</code>, <code>profession</code>, <code>nationality</code>,
        <code>imageUrl</code>, <code>wikipediaUrl</code>, <code>wikidataId</code>,
        <code>wikiquoteUrl</code>, <code>wikipediaCategoryUrl</code>, and <code>wikiquoteCategoryUrl</code>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-1">Wikipedia Category URL</label>
            <input
              className="border w-full p-2 rounded"
              value={wikipediaCategoryUrl}
              onChange={(e) => setWikipediaCategoryUrl(e.target.value)}
              placeholder="https://en.wikipedia.org/wiki/Category:..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Wikiquote Category URL</label>
            <input
              className="border w-full p-2 rounded"
              value={wikiquoteCategoryUrl}
              onChange={(e) => setWikiquoteCategoryUrl(e.target.value)}
              placeholder="https://en.wikiquote.org/wiki/Category:People"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Wikidata Category ID</label>
            <input
              className="border w-full p-2 rounded"
              value={wikidataCategoryId}
              onChange={(e) => setWikidataCategoryId(e.target.value)}
              placeholder="Q..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category import limit</label>
          <input
            type="number"
            min={1}
            max={500}
            className="border w-full p-2 rounded max-w-xs"
            value={categoryLimit}
            onChange={(e) => setCategoryLimit(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Wikiquote People List</label>
          <textarea
            value={wikiquotePeopleInput}
            onChange={(e) => setWikiquotePeopleInput(e.target.value)}
            rows={6}
            className="border w-full p-3 rounded text-sm"
            placeholder={"Albert Einstein\nRabindranath Tagore\nhttps://en.wikiquote.org/wiki/Rumi\nhttps://en.wikiquote.org/wiki/List_of_people"}
          />
          <p className="mt-1 text-xs text-gray-500">
            One person per line. You can paste plain names, full Wikiquote author URLs, or
            the Wikiquote <code>List_of_people</code> URL to expand it automatically.
          </p>
        </div>

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
          rows={14}
          className="border w-full p-3 rounded font-mono text-sm"
          placeholder={`https://en.wikipedia.org/wiki/Albert_Einstein|Q937||||\n|||Q634|||\n||||https://en.wikiquote.org/wiki/Rumi|\n|||||https://en.wikiquote.org/wiki/Category:People\n||https://en.wikipedia.org/wiki/Category:20th-century_Indian_philosophers|||`}
        />
        <p className="text-xs text-gray-500">
          Use the structured textarea only when you need mixed sources or per-row category fields.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={submitting}
          className="bg-black text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Importing..." : "Import Authors"}
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
            Failed: <b>{result.failed}</b>
          </div>

          {result.errors.length > 0 && (
            <ul className="text-sm text-red-700 list-disc pl-5">
              {result.errors.map((msg, index) => (
                <li key={`${index}-${msg}`}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
