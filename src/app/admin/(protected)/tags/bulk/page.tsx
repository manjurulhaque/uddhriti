"use client"

import { useState } from "react"
import { getRowValue, readItemsFromJsonOrCsv } from "@/lib/import/clientFile"
import { starterTagSeedText, tagTypeOptions } from "@/lib/tags/catalog"
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
  Button,
} from "@/components/ui"

function parseLines(input: string) {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", slug = "", type = "", description = ""] = line.split("|")

      return {
        name: name.trim(),
        slug: slug.trim() || undefined,
        type: type.trim().toUpperCase() || undefined,
        description: description.trim() || null,
      }
    })
}

export default function BulkCreateTagsPage() {
  const [input, setInput] = useState("")
  const [uploadedItems, setUploadedItems] = useState<
    {
      name: string
      slug?: string
      type?: string
      description?: string | null
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
        name: getRowValue(row, "name").trim(),
        slug: getRowValue(row, "slug").trim() || undefined,
        type: getRowValue(row, "type").trim().toUpperCase() || undefined,
        description: getRowValue(row, "description").trim() || null,
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
      setError("Please enter at least one tag or upload a file.")
      setSubmitting(false)
      return
    }

    const res = await fetch("/api/admin/tags/bulk", {
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
      <PageHeader
        title="Bulk Create Tags"
        description="Quickly populate semantic tags, moods, topics, or movement taxonomies."
      />

      <FormErrorBanner error={error} onDismiss={() => setError("")} />

      <BulkImportResultCard result={result} onDismiss={() => setResult(null)} />

      <BulkImportFormatGuide
        format="name|slug|type|description"
        notes={
          <p>
            Only <strong className="text-stone-900">name</strong> is required. Valid types: {tagTypeOptions.join(", ")}.
          </p>
        }
        actions={
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => {
              setInput(starterTagSeedText)
              setUploadedItems(null)
              setError("")
            }}
          >
            Load Starter Taxonomy
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection
          title="Data Input"
          description="Upload a CSV/JSON file or paste raw tag lines"
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
            placeholder={starterTagSeedText}
            hint={
              uploadedItems
                ? "File upload loaded. Editing text overrides uploaded file."
                : "Type or paste multiple lines above."
            }
          />
        </FormSection>

        <FormActions
          submitLabel="Create Tags"
          submittingLabel="Creating Tags..."
          isSubmitting={submitting}
          cancelHref="/admin/tags"
        />
      </form>
    </div>
  )
}
