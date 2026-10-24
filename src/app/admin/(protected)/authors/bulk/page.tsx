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
  Input,
  Textarea,
} from "@/components/ui"

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
  const [result, setResult] = useState<BulkImportResultData | null>(null)

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
    <div className="p-8 max-w-4xl space-y-6">
      <PageHeader
        title="Bulk Import Authors"
        description="Populate thinker, author, and historical figure profiles directly from Wikipedia, Wikidata, or Wikiquote categories."
      />

      <FormErrorBanner error={error} onDismiss={() => setError("")} />

      <BulkImportResultCard result={result} onDismiss={() => setResult(null)} />

      <BulkImportFormatGuide
        format="wikipediaUrl|wikidataId|wikipediaCategoryUrl|wikidataCategoryId|wikiquoteUrl|wikiquoteCategoryUrl"
        notes={
          <p>
            Provide author URLs, entity IDs, or Wikipedia/Wikiquote category feeds. Uploaded JSON/CSV can also use full author schema properties.
          </p>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection
          title="Category Discovery Feed"
          description="Fetch authors belonging to a curated Wikipedia, Wikiquote, or Wikidata category"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Wikipedia Category URL"
              value={wikipediaCategoryUrl}
              onChange={(e) => setWikipediaCategoryUrl(e.target.value)}
              placeholder="https://en.wikipedia.org/wiki/Category:..."
            />

            <Input
              label="Wikiquote Category URL"
              value={wikiquoteCategoryUrl}
              onChange={(e) => setWikiquoteCategoryUrl(e.target.value)}
              placeholder="https://en.wikiquote.org/wiki/Category:People"
            />

            <Input
              label="Wikidata Category ID"
              value={wikidataCategoryId}
              onChange={(e) => setWikidataCategoryId(e.target.value)}
              placeholder="e.g. Q5"
            />
          </div>

          <Input
            type="number"
            min={1}
            max={500}
            label="Category Import Limit"
            value={categoryLimit}
            onChange={(e) => setCategoryLimit(e.target.value)}
            className="max-w-xs"
            hint="Maximum number of author pages to crawl and create"
          />
        </FormSection>

        <FormSection
          title="Wikiquote People List"
          description="Batch import from author name lists or Wikiquote index pages"
        >
          <Textarea
            value={wikiquotePeopleInput}
            onChange={(e) => setWikiquotePeopleInput(e.target.value)}
            rows={5}
            placeholder={"Albert Einstein\nRabindranath Tagore\nhttps://en.wikiquote.org/wiki/Rumi\nhttps://en.wikiquote.org/wiki/List_of_people"}
            hint="One person per line. Plain names or full Wikiquote URLs accepted."
          />
        </FormSection>

        <FormSection
          title="File Upload or Custom Rows"
          description="Direct JSON/CSV upload or pipe-delimited records"
        >
          <BulkFileUploadInput
            onFileChange={onFileChange}
            loadedCount={uploadedItems?.length}
          />

          <Textarea
            label="Structured Rows"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setUploadedItems(null)
            }}
            rows={10}
            className="font-mono text-xs leading-relaxed"
            placeholder={`https://en.wikipedia.org/wiki/Albert_Einstein|Q937||||\n|||Q634|||\n||||https://en.wikiquote.org/wiki/Rumi|\n|||||https://en.wikiquote.org/wiki/Category:People`}
            hint={
              uploadedItems
                ? "File upload loaded. Editing text overrides uploaded file."
                : "Type or paste multiple lines above."
            }
          />
        </FormSection>

        <FormActions
          submitLabel="Import Authors"
          submittingLabel="Importing Authors..."
          isSubmitting={submitting}
          cancelHref="/admin/authors"
        />
      </form>
    </div>
  )
}
