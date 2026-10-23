"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { PageHeader } from "@/components/admin"
import {
  Input,
  Textarea,
  FormSection,
  FormActions,
  FormErrorBanner,
  ConfirmModal,
} from "@/components/ui"

export default function EditCategoryPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    metaTitle: "",
    metaDescription: "",
  })

  useEffect(() => {
    fetch(`/api/admin/categories/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load category")
        return res.json()
      })
      .then((data) => {
        setForm({
          name: data.name || "",
          slug: data.slug || "",
          description: data.description || "",
          metaTitle: data.metaTitle || "",
          metaDescription: data.metaDescription || "",
        })
        setLoading(false)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load category")
        setLoading(false)
      })
  }, [id])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          slug:
            form.slug ||
            form.name.trim().toLowerCase().replace(/\s+/g, "-"),
          description: form.description || null,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to save category")
      }

      router.push("/admin/categories")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save category")
      setSaving(false)
    }
  }

  async function executeDelete() {
    setDeleting(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to delete category")
      }

      router.push("/admin/categories")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete category")
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
        title={`Edit Category: ${form.name || "..."}`}
        description="Update taxonomy details, URL slug, or SEO description."
      />

      <FormErrorBanner error={error} onDismiss={() => setError("")} />

      <form onSubmit={handleSave} className="space-y-6">
        <FormSection title="Category Details" description="Identification and descriptive information">
          <Input
            name="name"
            label="Name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="e.g. Stoicism"
          />

          <Input
            name="slug"
            label="Slug"
            value={form.slug}
            onChange={handleChange}
            placeholder="e.g. stoicism"
          />

          <Textarea
            name="description"
            label="Description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Category description..."
          />
        </FormSection>

        <FormSection title="SEO & Metadata" description="Search engine optimization and meta tags">
          <Input
            name="metaTitle"
            label="Meta Title"
            value={form.metaTitle}
            onChange={handleChange}
            placeholder="Custom SEO title"
          />

          <Textarea
            name="metaDescription"
            label="Meta Description"
            value={form.metaDescription}
            onChange={handleChange}
            rows={2}
            placeholder="Search snippet summary..."
          />
        </FormSection>

        <FormActions
          submitLabel="Save Changes"
          submittingLabel="Saving..."
          isSubmitting={saving}
          cancelHref="/admin/categories"
          onDelete={() => setIsConfirmingDelete(true)}
          deleteLabel="Delete Category"
          isDeleting={deleting}
        />
      </form>

      <ConfirmModal
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={executeDelete}
        title="Delete Category?"
        message={`Are you sure you want to delete category "${form.name}"? Quotes categorized here will have their category unassigned.`}
        confirmLabel="Delete Category"
        isDestructive
        isLoading={deleting}
      />
    </div>
  )
}
