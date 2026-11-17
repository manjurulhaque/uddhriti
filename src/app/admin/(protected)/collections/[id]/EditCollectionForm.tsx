"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Input,
  Select,
  Textarea,
  FormSection,
  FormActions,
  FormErrorBanner,
  ConfirmModal,
} from "@/components/ui"
import { slugify } from "@/lib/slug"

export type CollectionDetailData = {
  id: string
  title: string
  slug: string
  description: string | null
  visibility: "PUBLIC" | "PRIVATE" | "EDITORIAL"
  quoteCount: number
}

const visibilityOptions = [
  { value: "PUBLIC", label: "PUBLIC — Visible to everyone" },
  { value: "PRIVATE", label: "PRIVATE — Only visible to administrators" },
  { value: "EDITORIAL", label: "EDITORIAL — Editorial and staff selection" },
]

export function EditCollectionForm({
  initialCollection,
}: {
  initialCollection: CollectionDetailData
}) {
  const router = useRouter()

  const [form, setForm] = useState({
    title: initialCollection.title || "",
    slug: initialCollection.slug || "",
    description: initialCollection.description || "",
    visibility: initialCollection.visibility || "PUBLIC",
  })
  const [saving, setSaving] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState("")

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    setError("")

    const payload = {
      ...form,
      slug: form.slug || slugify(form.title),
      description: form.description || null,
    }

    try {
      const res = await fetch(`/api/admin/collections/${initialCollection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setErrors(data?.errors?.fieldErrors || {})
        throw new Error(data?.error || "Failed to update collection")
      }

      router.push("/admin/collections")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update collection")
      setSaving(false)
    }
  }

  async function executeDelete() {
    setDeleting(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/collections/${initialCollection.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to delete collection")
      }

      router.push("/admin/collections")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete collection")
      setIsConfirmingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <FormErrorBanner error={error} onDismiss={() => setError("")} />

      <form onSubmit={handleSave} className="space-y-6">
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
            hint="Unique URL path identifier"
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
          submitLabel="Save Changes"
          submittingLabel="Saving..."
          isSubmitting={saving}
          cancelHref="/admin/collections"
          onDelete={() => setIsConfirmingDelete(true)}
          deleteLabel="Delete Collection"
          isDeleting={deleting}
        />
      </form>

      <ConfirmModal
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={executeDelete}
        title="Delete Collection?"
        message={`Are you sure you want to delete collection "${form.title}"? Quotes belonging to this collection will not be deleted, but will be removed from this collection.`}
        confirmLabel="Delete Collection"
        isDestructive
        isLoading={deleting}
      />
    </div>
  )
}
