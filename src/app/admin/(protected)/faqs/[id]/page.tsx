"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

const pageTypes = ["TAG", "CATEGORY", "AUTHOR", "QUOTE", "COLLECTION"] as const

export default function EditFaqPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
      setLoading(false)
    }

    loadFaq()
  }, [id])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSave() {
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

  async function handleDelete() {
    const res = await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || "Failed to delete FAQ")
      return
    }

    router.push("/admin/faqs")
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Edit FAQ</h1>

      <div className="space-y-4">
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
            className="border w-full p-2 rounded"
          />
          {errors.pageSlug && <p className="text-sm text-red-600 mt-1">{errors.pageSlug[0]}</p>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-4">
          <button
            disabled={saving}
            onClick={handleSave}
            className="bg-black text-white px-6 py-2 rounded disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={handleDelete} className="bg-red-500 text-white px-6 py-2 rounded">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
