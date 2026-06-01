"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

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
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">New FAQ</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Question *</label>
          <input
            name="question"
            value={form.question}
            onChange={handleChange}
            className="border w-full p-2 rounded"
          />
          {errors.question && <p className="text-sm text-red-600 mt-1">{errors.question[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium">Answer *</label>
          <textarea
            name="answer"
            value={form.answer}
            onChange={handleChange}
            rows={5}
            className="border w-full p-2 rounded"
          />
          {errors.answer && <p className="text-sm text-red-600 mt-1">{errors.answer[0]}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Page Type *</label>
            <select
              name="pageType"
              value={form.pageType}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            >
              {pageTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Position</label>
            <input
              name="position"
              type="number"
              value={form.position}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Page Slug *</label>
          <input
            name="pageSlug"
            value={form.pageSlug}
            onChange={handleChange}
            placeholder="example: stoicism"
            className="border w-full p-2 rounded"
          />
          {errors.pageSlug && <p className="text-sm text-red-600 mt-1">{errors.pageSlug[0]}</p>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={submitting}
          className="bg-black text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create FAQ"}
        </button>
      </form>
    </div>
  )
}
