"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { PageHeader } from "@/components/admin"
import {
  Input,
  Select,
  Textarea,
  FormSection,
  FormActions,
  FormErrorBanner,
} from "@/components/ui"
import { parseSourceYearInput } from "@/lib/sourceYear"
import { slugify } from "@/lib/slug"

type Author = {
  id: string
  name: string
}

const sourceTypes = [
  { value: "BOOK", label: "Book" },
  { value: "SPEECH", label: "Speech" },
  { value: "ARTICLE", label: "Article" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "SCRIPTURE", label: "Scripture" },
  { value: "LETTER", label: "Letter" },
  { value: "OTHER", label: "Other" },
]

export default function NewSourcePage() {
  const router = useRouter()
  const [authors, setAuthors] = useState<Author[]>([])
  const [authorSearch, setAuthorSearch] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    title: "",
    slug: "",
    type: "BOOK",
    year: "",
    yearApproximate: false,
    publisher: "",
    location: "",
    description: "",
    externalUrl: "",
    authorId: "",
  })

  useEffect(() => {
    fetch("/api/admin/authors")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAuthors(data)
      })
      .catch(() => {})
  }, [])

  const filteredAuthors = useMemo(() => {
    const needle = authorSearch.trim().toLowerCase()
    if (!needle) return authors
    return authors.filter((author) => author.name.toLowerCase().includes(needle))
  }, [authorSearch, authors])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const target = e.target as HTMLInputElement
    const { name, value, type, checked } = target
    setForm((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }
      if (name === "title" && !prev.slug) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)

    const parsedYear = parseSourceYearInput(form.year, form.yearApproximate)
    if (parsedYear.invalid) {
      setError("Use a year like 1595, -300, or an approximate range like c. 1595-1596.")
      setSubmitting(false)
      return
    }

    const payload = {
      ...form,
      slug: form.slug ? slugify(form.slug) : slugify(form.title),
      year: parsedYear.year,
      yearLabel: form.year.trim() || null,
      yearApproximate: parsedYear.approximate,
      publisher: form.publisher || null,
      location: form.location || null,
      description: form.description || null,
      externalUrl: form.externalUrl || null,
      authorId: form.authorId || null,
    }

    const res = await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || "Failed to create source")
      setSubmitting(false)
      return
    }

    router.push("/admin/sources")
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <PageHeader
        title="New Source"
        description="Add a bibliographic work, treatise, speech, or publication."
      />

      <FormErrorBanner error={error} onDismiss={() => setError("")} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Source Details" description="Title, slug, and work classification">
          <Input
            name="title"
            label="Title"
            placeholder="e.g. Meditations, Nicomachean Ethics"
            value={form.title}
            onChange={handleChange}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="slug"
              label="Slug"
              placeholder="e.g. meditations"
              value={form.slug}
              onChange={handleChange}
              hint="Auto-generated if left blank"
            />

            <Select
              name="type"
              label="Type"
              value={form.type}
              onChange={handleChange}
              options={sourceTypes}
            />
          </div>

          <Textarea
            name="description"
            label="Description"
            placeholder="Overview of the work, historical edition, or translation details..."
            value={form.description}
            onChange={handleChange}
            rows={3}
          />
        </FormSection>

        <FormSection title="Attribution & Chronology" description="Author reference and publication date">
          <div className="space-y-3">
            <Input
              type="search"
              label="Author Filter"
              value={authorSearch}
              onChange={(e) => setAuthorSearch(e.target.value)}
              placeholder="Type to filter authors list..."
            />

            <Select
              name="authorId"
              label="Assigned Author"
              value={form.authorId}
              onChange={handleChange}
            >
              <option value="">No Author Assigned</option>
              {filteredAuthors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <Input
              name="year"
              label="Publication Year"
              placeholder="e.g. 1595, -300, or c. 1595-1596"
              value={form.year}
              onChange={handleChange}
              hint="BCE years should be prefixed with -"
            />

            <label className="flex items-center gap-2.5 text-sm font-medium text-stone-700 cursor-pointer pt-3">
              <input
                type="checkbox"
                name="yearApproximate"
                checked={form.yearApproximate}
                onChange={handleChange}
                className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400"
              />
              <span>Year is approximate</span>
            </label>
          </div>
        </FormSection>

        <FormSection title="Publication & References" description="Publisher metadata and external citations">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="publisher"
              label="Publisher"
              placeholder="e.g. Oxford University Press"
              value={form.publisher}
              onChange={handleChange}
            />

            <Input
              name="location"
              label="Location"
              placeholder="e.g. London, Athens"
              value={form.location}
              onChange={handleChange}
            />
          </div>

          <Input
            name="externalUrl"
            label="External Reference URL"
            placeholder="https://..."
            value={form.externalUrl}
            onChange={handleChange}
            hint="Canonical link to digital text, Archive.org, or standard edition"
          />
        </FormSection>

        <FormActions
          submitLabel="Create Source"
          submittingLabel="Creating..."
          isSubmitting={submitting}
          cancelHref="/admin/sources"
        />
      </form>
    </div>
  )
}
