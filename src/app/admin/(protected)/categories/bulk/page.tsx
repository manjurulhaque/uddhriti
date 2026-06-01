"use client"

import { useState } from "react"
import { getRowValue, readItemsFromJsonOrCsv } from "@/lib/import/clientFile"

type Result = {
  received: number
  created: number
  failed: number
  errors: string[]
}

function parseLines(input: string) {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", slug = "", description = "", metaTitle = "", metaDescription = ""] =
        line.split("|")

      return {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || null,
        metaTitle: metaTitle.trim() || null,
        metaDescription: metaDescription.trim() || null,
      }
    })
}

export default function BulkCreateCategoriesPage() {
  const [input, setInput] = useState("")
  const [uploadedItems, setUploadedItems] = useState<
    {
      name: string
      slug?: string
      description?: string | null
      metaTitle?: string | null
      metaDescription?: string | null
    }[] | null
  >(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<Result | null>(null)

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const rows = await readItemsFromJsonOrCsv(file)
      const items = rows.map((row) => ({
        name: getRowValue(row, "name").trim(),
        slug: getRowValue(row, "slug").trim() || undefined,
        description: getRowValue(row, "description").trim() || null,
        metaTitle: getRowValue(row, "metaTitle").trim() || null,
        metaDescription: getRowValue(row, "metaDescription").trim() || null,
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

    const res = await fetch("/api/admin/categories/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setError(data?.error || "Bulk create failed")
      setSubmitting(false)
      return
    }

    setResult(data)
    setSubmitting(false)
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Bulk Create Categories</h1>

      <p className="text-sm text-gray-600">
        One category per line. Format:
        <br />
        <code>name|slug|description|metaTitle|metaDescription</code>
        <br />
        Only <code>name</code> is required.
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
          rows={14}
          className="border w-full p-3 rounded font-mono text-sm"
          placeholder={`Motivation\nStoicism|stoicism|Ancient philosophy category\nLeadership||Quotes about leading teams`}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={submitting}
          className="bg-black text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Categories"}
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
