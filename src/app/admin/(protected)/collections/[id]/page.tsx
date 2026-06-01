"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

const visibilityOptions = ["PUBLIC", "PRIVATE", "EDITORIAL"] as const

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
}

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
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadCollection() {
      const res = await fetch(`/api/admin/collections/${id}`)
      if (!res.ok) {
        setError("Failed to load collection")
        setLoading(false)
        return
      }

      const data = await res.json()
      setForm({
        title: data.title || "",
        slug: data.slug || "",
        description: data.description || "",
        visibility: data.visibility || "PUBLIC",
      })
      setLoading(false)
    }

    loadCollection()
  }, [id])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setErrors({})
    setError("")

    const payload = {
      ...form,
      slug: form.slug || slugify(form.title),
      description: form.description || null,
    }

    const res = await fetch(`/api/admin/collections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setErrors(data?.errors?.fieldErrors || {})
      setError(data?.error || "Failed to update collection")
      setSaving(false)
      return
    }

    router.push("/admin/collections")
  }

  async function handleDelete() {
    const res = await fetch(`/api/admin/collections/${id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || "Failed to delete collection")
      return
    }

    router.push("/admin/collections")
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Edit Collection</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Title *</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
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
