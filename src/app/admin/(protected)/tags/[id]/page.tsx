"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { tagTypeOptions } from "@/lib/tags/catalog"

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
}

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

  useEffect(() => {
    async function loadTag() {
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
      setLoading(false)
    }

    loadTag()
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

  async function handleDelete() {
    setError("")
    const res = await fetch(`/api/admin/tags/${id}`, {
      method: "DELETE",
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || "Failed to delete tag")
      return
    }

    router.push("/admin/tags")
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Edit Tag</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Name *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="border w-full p-2 rounded"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Slug</label>
          <input
            name="slug"
            value={form.slug}
            onChange={handleChange}
            className="border w-full p-2 rounded"
          />
          {errors.slug && (
            <p className="text-red-500 text-sm mt-1">{errors.slug[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Type *</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="border w-full p-2 rounded"
          >
            {tagTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="text-red-500 text-sm mt-1">{errors.type[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
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

          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-6 py-2 rounded"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
