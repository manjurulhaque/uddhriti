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

const pageTypes = ["TAG", "CATEGORY", "AUTHOR", "QUOTE", "COLLECTION"] as const

export default function NewFaqPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    question: "",
    answer: "",
    pageType: "TAG",
    pageSlug: "",
    position: "0",
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    setErrors({})

    const res = await fetch("/api/admin/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        position: Number(form.position || 0),
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setErrors(data?.errors?.fieldErrors || {})
      setError(data?.error || "Failed to create FAQ")
      setSubmitting(false)
      return
    }

    router.push("/admin/faqs")
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <PageHeader
        title="New FAQ"
        description="Add a structured frequently asked question to an entity landing page."
      />

      <FormErrorBanner error={error} onDismiss={() => setError("")} />

      <form onSubmit={handleSubmit} className="space-y-6">
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
          submitLabel="Create FAQ"
          submittingLabel="Creating..."
          isSubmitting={submitting}
          cancelHref="/admin/faqs"
        />
      </form>
    </div>
  )
}
