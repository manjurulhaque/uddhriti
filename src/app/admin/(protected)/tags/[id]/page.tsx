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
import { tagTypeOptions } from "@/lib/tags/catalog"
import { slugify } from "@/lib/slug"

export default function EditTagPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "TOPIC",
    description: "",
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function loadTag() {
      try {
        const res = await fetch(`/api/admin/tags/${id}`)
        if (!res.ok) {
          setError("Failed to load tag")
          setLoading(false)
          return
        }

        const data = await res.json()
        setForm({
          name: data.name || "",
          slug: data.slug || "",
          type: data.type || "TOPIC",
          description: data.description || "",
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load tag")
      } finally {
        setLoading(false)
      }
    }

    loadTag()
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
      slug: form.slug || slugify(form.name),
      description: form.description || null,
    }

    const res = await fetch(`/api/admin/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setErrors(data?.errors?.fieldErrors || {})
      setError(data?.error || "Failed to update tag")
      setSaving(false)
      return
    }

    router.push("/admin/tags")
  }

  async function executeDelete() {
    setDeleting(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/tags/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || "Failed to delete tag")
        setIsConfirmingDelete(false)
        return
      }

      router.push("/admin/tags")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete tag")
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
        title={`Edit Tag: ${form.name || "..."}`}
        description="Update tag attributes, URL slug, or descriptive summary."
      />

      <FormErrorBanner error={error} onDismiss={() => setError("")} />

      <form onSubmit={handleSave} className="space-y-6">
        <FormSection title="Tag Information" description="Name, classification type, and URL identifier">
          <Input
            name="name"
            label="Name"
            value={form.name}
            onChange={handleChange}
            required
            error={errors.name}
            placeholder="e.g. Resilience"
          />

          <Input
            name="slug"
            label="Slug"
            value={form.slug}
            onChange={handleChange}
            error={errors.slug}
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
            placeholder="Describe the tag context..."
          />
        </FormSection>

        <FormActions
          submitLabel="Save Changes"
          submittingLabel="Saving..."
          isSubmitting={saving}
          cancelHref="/admin/tags"
          onDelete={() => setIsConfirmingDelete(true)}
          deleteLabel="Delete Tag"
          isDeleting={deleting}
        />
      </form>

      <ConfirmModal
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={executeDelete}
        title="Delete Tag?"
        message={`Are you sure you want to delete tag "${form.name}"? Quotes tagged with this will no longer reference it.`}
        confirmLabel="Delete Tag"
        isDestructive
        isLoading={deleting}
      />
    </div>
  )
}
