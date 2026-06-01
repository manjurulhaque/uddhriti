"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

const visibilityOptions = ["PUBLIC", "PRIVATE", "EDITORIAL"] as const

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
}

export default function NewCollectionPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    visibility: "PUBLIC",
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
      slug: form.slug || slugify(form.title),
      description: form.description || null,
    }

    const res = await fetch("/api/admin/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setErrors(data?.errors?.fieldErrors || {})
      setError(data?.error || "Failed to create collection")
      setSubmitting(false)
      return
    }

    router.push("/admin/collections")
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">New Collection</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Title *</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="border w-full p-2 rounded"
          />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium">Slug</label>
          <input
            name="slug"
            value={form.slug}
            onChange={handleChange}
            placeholder="auto-generated if empty"
            className="border w-full p-2 rounded"
          />
          {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug[0]}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium">Visibility *</label>
          <select
            name="visibility"
            value={form.visibility}
            onChange={handleChange}
            className="border w-full p-2 rounded"
          >
            {visibilityOptions.map((visibility) => (
              <option key={visibility} value={visibility}>
                {visibility}
              </option>
            ))}
          </select>
          {errors.visibility && (
            <p className="text-red-500 text-sm mt-1">{errors.visibility[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="border w-full p-2 rounded"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={submitting}
          className="bg-black text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Collection"}
        </button>
      </form>
    </div>
  )
}
