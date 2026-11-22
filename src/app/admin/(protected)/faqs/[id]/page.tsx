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

const pageTypes = ["TAG", "CATEGORY", "AUTHOR", "QUOTE", "COLLECTION"] as const

export default function EditFaqPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    question: "",
    answer: "",
    pageType: "TAG",
    pageSlug: "",
    position: "0",
  })

  useEffect(() => {
    async function loadFaq() {
      try {
        const res = await fetch(`/api/admin/faqs/${id}`)
        if (!res.ok) {
          setError("Failed to load FAQ")
          setLoading(false)
          return
        }

        const data = await res.json()
        setForm({
          question: data.question || "",
          answer: data.answer || "",
          pageType: data.pageType || "TAG",
          pageSlug: data.pageSlug || "",
          position: String(data.position ?? 0),
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load FAQ")
      } finally {
        setLoading(false)
      }
    }

    loadFaq()
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
    setError("")
    setErrors({})

    const res = await fetch(`/api/admin/faqs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        position: Number(form.position || 0),
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setErrors(data?.errors?.fieldErrors || {})
      setError(data?.error || "Failed to update FAQ")
      setSaving(false)
      return
    }

    router.push("/admin/faqs")
  }

  async function executeDelete() {
    setDeleting(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || "Failed to delete FAQ")
        setIsConfirmingDelete(false)
        return
      }

      router.push("/admin/faqs")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete FAQ")
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
        title="Edit FAQ"
        description="Update question copy, answer text, or landing page placement."
      />

      <FormErrorBanner error={error} onDismiss={() => setError("")} />

      <form onSubmit={handleSave} className="space-y-6">
        <FormSection title="Question & Answer" description="The core Q&A copy displayed to users">
          <Input
            name="question"
            label="Question"
            value={form.question}
            onChange={handleChange}
            required
            error={errors.question}
            placeholder="e.g. What is the central theme of Stoic philosophy?"
          />

          <Textarea
            name="answer"
            label="Answer"
            value={form.answer}
            onChange={handleChange}
            required
            error={errors.answer}
            rows={5}
            placeholder="Write a clear, authoritative response..."
          />
        </FormSection>

        <FormSection
          title="Target Page & Ordering"
          description="Where this FAQ should appear and its display order"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              name="pageType"
              label="Page Type"
              value={form.pageType}
              onChange={handleChange}
              required
              options={pageTypes.map((type) => ({ value: type, label: type }))}
            />

            <Input
              name="position"
              type="number"
              label="Display Position"
              value={form.position}
              onChange={handleChange}
              hint="0-indexed display priority order"
            />
          </div>

          <Input
            name="pageSlug"
            label="Target Page Slug"
            value={form.pageSlug}
            onChange={handleChange}
            required
            error={errors.pageSlug}
            hint="The slug identifier for the category, author, tag, quote, or collection"
            placeholder="e.g. stoicism, marcus-aurelius"
          />
        </FormSection>

        <FormActions
          submitLabel="Save Changes"
          submittingLabel="Saving..."
          isSubmitting={saving}
          cancelHref="/admin/faqs"
          onDelete={() => setIsConfirmingDelete(true)}
          deleteLabel="Delete FAQ"
          isDeleting={deleting}
        />
      </form>

      <ConfirmModal
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={executeDelete}
        title="Delete FAQ?"
        message="Are you sure you want to delete this FAQ? It will be permanently removed from the public entity page."
        confirmLabel="Delete FAQ"
        isDestructive
        isLoading={deleting}
      />
    </div>
  )
}
