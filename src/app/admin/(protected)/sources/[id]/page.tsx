"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/admin"
import {
  Input,
  Select,
  Textarea,
  FormSection,
  FormActions,
  FormErrorBanner,
  ConfirmModal,
} from "@/components/ui"
import { formatSourceYearLabel, parseSourceYearInput } from "@/lib/sourceYear"

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

export default function EditSourcePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [authors, setAuthors] = useState<Author[]>([])
  const [authorSearch, setAuthorSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
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
    async function load() {
      try {
        const [sourceRes, authorsRes] = await Promise.all([
          fetch(`/api/admin/sources/${id}`),
          fetch("/api/admin/authors"),
        ])

        if (!sourceRes.ok) {
          setError("Failed to load source")
          setLoading(false)
          return
        }

        const source = await sourceRes.json()
        const authorsList = authorsRes.ok ? await authorsRes.json() : []

        if (Array.isArray(authorsList)) {
          setAuthors(authorsList)
        }

        setForm({
          title: source.title || "",
          slug: source.slug || "",
          type: source.type || "BOOK",
          year: formatSourceYearLabel(source) || "",
          yearApproximate: Boolean(source.yearApproximate),
          publisher: source.publisher || "",
          location: source.location || "",
          description: source.description || "",
          externalUrl: source.externalUrl || "",
          authorId: source.authorId || "",
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load source")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  const filteredAuthors = useMemo(() => {
    const needle = authorSearch.trim().toLowerCase()
    if (!needle) return authors
    return authors.filter((author) => author.name.toLowerCase().includes(needle))
  }, [authorSearch, authors])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type, checked } = e.target as HTMLInputElement
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    const parsedYear = parseSourceYearInput(form.year, form.yearApproximate)
    if (parsedYear.invalid) {
      setError("Use a year like 1595, -300, or an approximate range like c. 1595-1596.")
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/admin/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          slug:
            form.slug ||
            form.title.trim().toLowerCase().replace(/\s+/g, "-"),
          year: parsedYear.year,
          yearLabel: form.year.trim() || null,
          yearApproximate: parsedYear.approximate,
          publisher: form.publisher || null,
          location: form.location || null,
          description: form.description || null,
          externalUrl: form.externalUrl || null,
          authorId: form.authorId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || "Failed to save source")
        setSaving(false)
        return
      }

      router.push("/admin/sources")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save source")
      setSaving(false)
    }
  }

  async function executeDelete() {
    setDeleting(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/sources/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || "Failed to delete source")
        setIsConfirmingDelete(false)
        return
      }

      router.push("/admin/sources")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete source")
      setIsConfirmingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-3xl space-y-4">
        <div className="h-8 w-48 bg-stone-200 animate-pulse rounded-lg" />
        <div className="h-4 w-72 bg-stone-100 animate-pulse rounded-md" />
        <div className="h-64 w-full bg-stone-50 animate-pulse rounded-2xl border border-stone-200/60" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <PageHeader
        title={`Edit Source: ${form.title || "..."}`}
        description="Update publication information, citation metadata, or authorship."
      />

      <FormErrorBanner error={error} onDismiss={() => setError("")} />

      <form onSubmit={handleSave} className="space-y-6">
        <FormSection title="Source Details" description="Title, slug, and work classification">
          <Input
            name="title"
            label="Title"
            placeholder="e.g. Meditations"
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
            placeholder="Overview of the work or historical edition..."
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
          />
        </FormSection>

        <FormActions
          submitLabel="Save Changes"
          submittingLabel="Saving..."
          isSubmitting={saving}
          cancelHref="/admin/sources"
          onDelete={() => setIsConfirmingDelete(true)}
          deleteLabel="Delete Source"
          isDeleting={deleting}
        />
      </form>

      <ConfirmModal
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={executeDelete}
        title="Delete Source?"
        message={`Are you sure you want to delete "${form.title}"? Quotes attributed to this source will remain but have their source unlinked.`}
        confirmLabel="Delete Source"
        isDestructive
        isLoading={deleting}
      />
    </div>
  )
}
