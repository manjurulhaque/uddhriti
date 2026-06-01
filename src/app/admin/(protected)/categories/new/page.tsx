"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function NewCategoryPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    metaTitle: "",
    metaDescription: "",
  })

  const [errors, setErrors] = useState<Record<string, string[]>>({})

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const res = await fetch("/api/admin/categories", {
      method: "POST",
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
      const data = await res.json()
      setErrors(data.errors?.fieldErrors || {})
      return
    }

    router.push("/admin/categories")
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">New Category</h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Name */}
        <div>
          <label className="block text-sm font-medium">Name *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="border w-full p-2 rounded"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">
              {errors.name[0]}
            </p>
          )}
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium">Slug</label>
          <input
            name="slug"
            value={form.slug}
            onChange={handleChange}
            placeholder="auto-generated if empty"
            className="border w-full p-2 rounded"
          />
          {errors.slug && (
            <p className="text-red-500 text-sm mt-1">
              {errors.slug[0]}
            </p>
          )}
        </div>

        {/* Description */}
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

        {/* SEO Meta */}
        <div>
          <label className="block text-sm font-medium">Meta Title</label>
          <input
            name="metaTitle"
            value={form.metaTitle}
            onChange={handleChange}
            className="border w-full p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Meta Description
          </label>
          <textarea
            name="metaDescription"
            value={form.metaDescription}
            onChange={handleChange}
            rows={2}
            className="border w-full p-2 rounded"
          />
        </div>

        <button className="bg-black text-white px-6 py-2 rounded">
          Create Category
        </button>
      </form>
    </div>
  )
}