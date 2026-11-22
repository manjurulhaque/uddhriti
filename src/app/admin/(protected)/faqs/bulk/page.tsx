"use client"

import { useState } from "react"
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
  Textarea,
} from "@/components/ui"

const PAGE_TYPES = ["TAG", "CATEGORY", "AUTHOR", "QUOTE", "COLLECTION"] as const

function normalizePageType(value: string) {
  const normalized = value.trim().toUpperCase()
  return PAGE_TYPES.includes(normalized as (typeof PAGE_TYPES)[number]) ? normalized : "TAG"
}

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
  const [result, setResult] = useState<BulkImportResultData | null>(null)

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
      setError("Please enter at least one FAQ row or upload a file.")
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
      <PageHeader
        title="Bulk Import FAQs"
        description="Batch create frequently asked questions and associate them with target entity landing pages."
      />

      <FormErrorBanner error={error} onDismiss={() => setError("")} />

      <BulkImportResultCard result={result} onDismiss={() => setResult(null)} />

      <BulkImportFormatGuide
        format="question|answer|pageType|pageSlug|position"
        notes={
          <p>
            Valid page types: <strong className="text-stone-900">{PAGE_TYPES.join(", ")}</strong>. Position is 0-indexed.
          </p>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection
          title="Data Input"
          description="Upload a CSV/JSON file or paste raw FAQ lines"
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
            placeholder={`What is stoicism?|Stoicism is a school of Hellenistic philosophy...|CATEGORY|stoicism|0\nWho said this quote?|It is commonly attributed to Marcus Aurelius...|QUOTE|the-obstacle-is-the-way|1`}
            hint={
              uploadedItems
                ? "File upload loaded. Editing text overrides uploaded file."
                : "Type or paste multiple lines above."
            }
          />
        </FormSection>

        <FormActions
          submitLabel="Import FAQs"
          submittingLabel="Importing FAQs..."
          isSubmitting={submitting}
          cancelHref="/admin/faqs"
        />
      </form>
    </div>
  )
}
