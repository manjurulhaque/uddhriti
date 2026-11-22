"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { PageHeader } from "@/components/admin"
import {
  Input,
  Select,
  Textarea,
  FormSection,
  FormActions,
  FormErrorBanner,
} from "@/components/ui"
import { slugify } from "@/lib/slug"

const visibilityOptions = [
  { value: "PUBLIC", label: "PUBLIC — Visible to everyone" },
  { value: "PRIVATE", label: "PRIVATE — Only visible to administrators" },
  { value: "EDITORIAL", label: "EDITORIAL — Editorial and staff selection" },
]

export default function NewCollectionPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    visibility: "PUBLIC",
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === "title" && !prev.slug) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    setError("")

    const payload = {
      ...form,
      slug: form.slug || slugify(form.title),
      description: form.description || null,
    }

    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setErrors(data?.errors?.fieldErrors || {})
        throw new Error(data?.error || "Failed to create collection")
      }

      router.push("/admin/collections")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create collection")
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <PageHeader
        title="New Collection"
        description="Curate thematic anthologies and editorial selections of quotations."
        backHref="/admin/collections"
        backLabel="Back to Collections"
      />

      <FormErrorBanner error={error} onDismiss={() => setError("")} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection
          title="Collection Details"
          description="Basic information, taxonomy slug, and visibility settings."
        >
          <Input
            name="title"
            label="Title"
            value={form.title}
            onChange={handleChange}
            required
            placeholder="e.g. Meditations on Courage & Duty"
            error={errors.title?.[0]}
          />

          <Input
            name="slug"
            label="Slug"
            value={form.slug}
            onChange={handleChange}
            placeholder="e.g. meditations-on-courage-and-duty"
            hint="Unique URL path identifier (auto-generated from title if empty)"
            error={errors.slug?.[0]}
          />

          <Select
            name="visibility"
            label="Visibility"
            value={form.visibility}
            onChange={handleChange}
            options={visibilityOptions}
            error={errors.visibility?.[0]}
          />

          <Textarea
            name="description"
            label="Description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            placeholder="Describe the anthology theme, historical context, or editorial intent..."
          />
        </FormSection>

        <FormActions
          submitLabel="Create Collection"
          submittingLabel="Creating..."
          isSubmitting={submitting}
          cancelHref="/admin/collections"
        />
      </form>
    </div>
  )
}
