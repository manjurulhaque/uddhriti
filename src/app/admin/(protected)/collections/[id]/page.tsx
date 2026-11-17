"use client"

import { useEffect, useState } from "react"
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
import { slugify } from "@/lib/slug"
import { CollectionQuotesManager } from "./CollectionQuotesManager"

const visibilityOptions = [
  { value: "PUBLIC", label: "PUBLIC — Visible to everyone" },
  { value: "PRIVATE", label: "PRIVATE — Only visible to administrators" },
  { value: "EDITORIAL", label: "EDITORIAL — Editorial and staff selection" },
]

export default function EditCollectionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    visibility: "PUBLIC",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadCollection() {
      try {
        const res = await fetch(`/api/admin/collections/${id}`)
        if (!res.ok) {
          throw new Error("Failed to load collection")
        }

        const data = await res.json()
        setForm({
          title: data.title || "",
          slug: data.slug || "",
          description: data.description || "",
          visibility: data.visibility || "PUBLIC",
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load collection")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadCollection()
    }
  }, [id])

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
      const res = await fetch(`/api/admin/collections/${id}`, {
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update collection")
      setSaving(false)
    }
  }

  async function executeDelete() {
    setDeleting(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/collections/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to delete collection")
      }

      router.push("/admin/collections")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete collection")
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
    <div className="p-8 max-w-4xl space-y-8">
      <PageHeader
        title={`Edit Collection: ${form.title || "..."}`}
        description="Update collection details, public URL slug, description, or visibility."
        backHref="/admin/collections"
        backLabel="Back to Collections"
      />

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

      {/* Quotes in this Collection */}
      <CollectionQuotesManager
        collectionId={id}
        collectionTitle={form.title}
      />

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
