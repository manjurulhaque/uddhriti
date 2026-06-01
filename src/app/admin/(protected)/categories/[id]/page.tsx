"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"

export default function EditCategoryPage() {
  const { id } = useParams()
  const router = useRouter()

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    metaTitle: "",
    metaDescription: "",
  })

  useEffect(() => {
    fetch(`/api/admin/categories/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setForm({
          name: data.name || "",
          slug: data.slug || "",
          description: data.description || "",
          metaTitle: data.metaTitle || "",
          metaDescription: data.metaDescription || "",
        })
      })
  }, [id])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSave() {
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
      return
    }

    router.push("/admin/categories")
  }

  async function handleDelete() {
    await fetch(`/api/admin/categories/${id}`, {
      method: "DELETE",
    })

    router.push("/admin/categories")
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Edit Category</h1>

      <div className="space-y-4">

        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        />

        <input
          name="slug"
          value={form.slug}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        />

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          className="border w-full p-2 rounded"
        />

        <input
          name="metaTitle"
          value={form.metaTitle}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        />

        <textarea
          name="metaDescription"
          value={form.metaDescription}
          onChange={handleChange}
          rows={2}
          className="border w-full p-2 rounded"
        />

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Save
          </button>

          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
