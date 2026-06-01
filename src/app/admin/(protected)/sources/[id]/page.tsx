"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { formatSourceYearLabel, parseSourceYearInput } from "@/lib/sourceYear"

type Author = {
  id: string
  name: string
}

export default function EditSourcePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [authors, setAuthors] = useState<Author[]>([])
  const [authorSearch, setAuthorSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    title: "",
    slug: "",
    type: "BOOK",
    year: "",
    yearApproximate: false,
    publisher: "",
    location: "",
    description: "",
    externalUrl: "",
    authorId: "",
  })

  useEffect(() => {
    async function load() {
      const [sourceRes, authorsRes] = await Promise.all([
        fetch(`/api/admin/sources/${id}`),
        fetch("/api/admin/authors"),
      ])

      if (!sourceRes.ok) {
        setError("Failed to load source")
        setLoading(false)
        return
      }

      const source = await sourceRes.json()
      const authorsList = authorsRes.ok ? await authorsRes.json() : []

      setAuthors(authorsList)
      setForm({
        title: source.title || "",
        slug: source.slug || "",
        type: source.type || "BOOK",
        year: formatSourceYearLabel(source) || "",
        yearApproximate: Boolean(source.yearApproximate),
        publisher: source.publisher || "",
        location: source.location || "",
        description: source.description || "",
        externalUrl: source.externalUrl || "",
        authorId: source.authorId || "",
      })
      setLoading(false)
    }

    load()
  }, [id])

  const filteredAuthors = useMemo(() => {
    const needle = authorSearch.trim().toLowerCase()
    if (!needle) return authors

    return authors.filter((author) => author.name.toLowerCase().includes(needle))
  }, [authorSearch, authors])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type, checked } = e.target as HTMLInputElement
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError("")

    const parsedYear = parseSourceYearInput(form.year, form.yearApproximate)
    if (parsedYear.invalid) {
      setError("Use a year like 1595, -300, or an approximate range like c. 1595-1596.")
      setSaving(false)
      return
    }

    const res = await fetch(`/api/admin/sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        slug:
          form.slug ||
          form.title.trim().toLowerCase().replace(/\s+/g, "-"),
        year: parsedYear.year,
        yearLabel: form.year.trim() || null,
        yearApproximate: parsedYear.approximate,
        publisher: form.publisher || null,
        location: form.location || null,
        description: form.description || null,
        externalUrl: form.externalUrl || null,
        authorId: form.authorId || null,
      }),
    })

    if (!res.ok) {
      setError("Failed to save source")
      setSaving(false)
      return
    }

    router.push("/admin/sources")
  }

  async function handleDelete() {
    const res = await fetch(`/api/admin/sources/${id}`, {
      method: "DELETE",
    })

    if (!res.ok) {
      setError("Failed to delete source")
      return
    }

    router.push("/admin/sources")
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Edit Source</h1>

      <div className="space-y-4">
        <input
          name="title"
          placeholder="Title *"
          value={form.title}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        />

        <input
          name="slug"
          placeholder="Slug"
          value={form.slug}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        />

        <select
          name="type"
          value={form.type}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        >
          <option value="BOOK">BOOK</option>
          <option value="SPEECH">SPEECH</option>
          <option value="ARTICLE">ARTICLE</option>
          <option value="INTERVIEW">INTERVIEW</option>
          <option value="SCRIPTURE">SCRIPTURE</option>
          <option value="LETTER">LETTER</option>
          <option value="OTHER">OTHER</option>
        </select>

        <input
          name="year"
          type="text"
          placeholder="Year or range, e.g. 1595, -300, or c. 1595-1596"
          value={form.year}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="yearApproximate"
            checked={form.yearApproximate}
            onChange={handleChange}
          />
          Year Approximate
        </label>

        <div className="space-y-2">
          <input
            type="search"
            value={authorSearch}
            onChange={(e) => setAuthorSearch(e.target.value)}
            placeholder="Search authors"
            className="border w-full p-2 rounded"
          />
          <select
            name="authorId"
            value={form.authorId}
            onChange={handleChange}
            className="border w-full p-2 rounded"
          >
            <option value="">No Author</option>
            {filteredAuthors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <input
          name="publisher"
          placeholder="Publisher"
          value={form.publisher}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        />

        <input
          name="location"
          placeholder="Location"
          value={form.location}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        />

        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          className="border w-full p-2 rounded"
        />

        <input
          name="externalUrl"
          placeholder="External URL"
          value={form.externalUrl}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-4">
          <button
            disabled={saving}
            onClick={handleSave}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
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
