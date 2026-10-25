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
import { tagTypeOptions } from "@/lib/tags/catalog"
import { slugify } from "@/lib/slug"

export default function NewTagPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "TOPIC",
    description: "",
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    setError("")

    const payload = {
      ...form,
      slug: form.slug || slugify(form.name),
      description: form.description || null,
    }

    const res = await fetch("/api/admin/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setErrors(data?.errors?.fieldErrors || {})
      setError(data?.error || "Failed to create tag")
      setSubmitting(false)
      return
    }

    router.push("/admin/tags")
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <PageHeader
        title="New Tag"
        description="Create a semantic tag or topic to categorize quotations."
      />

      <FormErrorBanner error={error} onDismiss={() => setError("")} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Tag Information" description="Name, type, and URL identifier">
          <Input
            name="name"
            label="Name"
            value={form.name}
            onChange={handleChange}
            required
            error={errors.name}
            placeholder="e.g. Resilience, Wisdom, Leadership"
          />

          <Input
            name="slug"
            label="Slug"
            value={form.slug}
            onChange={handleChange}
            error={errors.slug}
            hint="Auto-generated from name if left empty."
            placeholder="e.g. resilience"
          />

          <Select
            name="type"
            label="Type"
            value={form.type}
            onChange={handleChange}
            required
            error={errors.type}
            options={tagTypeOptions.map((type) => ({ value: type, label: type }))}
          />

          <Textarea
            name="description"
            label="Description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Describe the tag context or themes covered..."
          />
        </FormSection>

        <FormActions
          submitLabel="Create Tag"
          submittingLabel="Creating..."
          isSubmitting={submitting}
          cancelHref="/admin/tags"
        />
      </form>
    </div>
  )
}
