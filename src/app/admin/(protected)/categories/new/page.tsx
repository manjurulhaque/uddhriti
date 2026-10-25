"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { PageHeader } from "@/components/admin"
import { Input, Textarea, FormSection, FormActions, FormErrorBanner } from "@/components/ui"
import { slugify } from "@/lib/slug"

export default function NewCategoryPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    metaTitle: "",
    metaDescription: "",
  })

  const [errors, setErrors] = useState<Record<string, string[]>>({})

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === "name" && !prev.slug) {
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

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        slug: form.slug || slugify(form.name),
        description: form.description || null,
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setErrors(data?.errors?.fieldErrors || {})
      setError(data?.error || "Failed to create category")
      setSubmitting(false)
      return
    }

    router.push("/admin/categories")
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <PageHeader
        title="New Category"
        description="Create a new thematic taxonomy to organize published quotes."
      />

      <FormErrorBanner error={error} onDismiss={() => setError("")} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Category Details" description="Basic identification and description">
          <Input
            name="name"
            label="Name"
            value={form.name}
            onChange={handleChange}
            required
            error={errors.name}
            placeholder="e.g. Stoicism, Love, Courage"
          />

          <Input
            name="slug"
            label="Slug"
            value={form.slug}
            onChange={handleChange}
            error={errors.slug}
            hint="Auto-generated from name if left empty."
            placeholder="e.g. stoicism"
          />

          <Textarea
            name="description"
            label="Description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Provide context or summary for this category..."
          />
        </FormSection>

        <FormSection title="SEO & Metadata" description="Search engine optimization and meta tags">
          <Input
            name="metaTitle"
            label="Meta Title"
            value={form.metaTitle}
            onChange={handleChange}
            placeholder="Custom SEO title for category page"
          />

          <Textarea
            name="metaDescription"
            label="Meta Description"
            value={form.metaDescription}
            onChange={handleChange}
            rows={2}
            placeholder="Brief snippet shown in search engine results..."
          />
        </FormSection>

        <FormActions
          submitLabel="Create Category"
          submittingLabel="Creating..."
          isSubmitting={submitting}
          cancelHref="/admin/categories"
        />
      </form>
    </div>
  )
}