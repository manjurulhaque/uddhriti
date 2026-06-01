"use client"

import { useState } from "react"
import { getRowValue, readItemsFromJsonOrCsv } from "@/lib/import/clientFile"

type Result = {
  received: number
  created: number
  skipped: number
  failed: number
  errors: string[]
}

const PAGE_TYPES = ["TAG", "CATEGORY", "AUTHOR", "QUOTE", "COLLECTION"] as const

function parseLines(input: string) {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [question = "", answer = "", pageType = "", pageSlug = "", position = "0"] = line.split("|")
      return {
        question: question.trim(),
        answer: answer.trim(),
        pageType: pageType.trim().toUpperCase() || "TAG",
        pageSlug: pageSlug.trim(),
        position: Number(position || 0),
      }
    })
}

function normalizePageType(value: string) {
  const normalized = value.trim().toUpperCase()
  return PAGE_TYPES.includes(normalized as (typeof PAGE_TYPES)[number]) ? normalized : "TAG"
}

export default function BulkImportFaqsPage() {
  const [input, setInput] = useState("")
  const [uploadedItems, setUploadedItems] = useState<
    {
      question: string
      answer: string
      pageType: string
      pageSlug: string
      position: number
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
        question: getRowValue(row, "question").trim(),
        answer: getRowValue(row, "answer").trim(),
        pageType: normalizePageType(getRowValue(row, "pageType")),
        pageSlug: getRowValue(row, "pageSlug").trim(),
        position: Number(getRowValue(row, "position") || "0"),
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
      setError("Please enter at least one FAQ row.")
      setSubmitting(false)
      return
    }

    const res = await fetch("/api/admin/faqs/bulk", {
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

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Bulk Import FAQs</h1>

      <p className="text-sm text-gray-600">
        One FAQ per line. Format:
        <br />
        <code>question|answer|pageType|pageSlug|position</code>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Upload JSON/CSV (optional)</label>
          <input type="file" accept=".json,.csv,application/json,text/csv" onChange={onFileChange} />
          {uploadedItems && (
            <p className="text-xs text-gray-500 mt-1">Loaded {uploadedItems.length} row(s) from file.</p>
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
          placeholder={`What is stoicism?|Stoicism is a school of philosophy...|CATEGORY|stoicism|0\nWho said this quote?|It is commonly attributed to...|QUOTE|the-obstacle-is-the-way|1`}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={submitting}
          className="bg-black text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Importing..." : "Import FAQs"}
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

