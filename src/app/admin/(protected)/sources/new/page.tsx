"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import slugify from "slugify"
import { parseSourceYearInput } from "@/lib/sourceYear"

type Author = {
  id: string
  name: string
}

export default function NewSourcePage() {
  const router = useRouter()
  const [authors, setAuthors] = useState<Author[]>([])
  const [authorSearch, setAuthorSearch] = useState("")
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
    fetch("/api/admin/authors")
      .then((res) => res.json())
      .then(setAuthors)
  }, [])

  const filteredAuthors = useMemo(() => {
    const needle = authorSearch.trim().toLowerCase()
    if (!needle) return authors

    return authors.filter((author) => author.name.toLowerCase().includes(needle))
  }, [authorSearch, authors])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const target = e.target as HTMLInputElement
    const { name, value, type, checked } = target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const parsedYear = parseSourceYearInput(form.year, form.yearApproximate)
    if (parsedYear.invalid) {
      setError("Use a year like 1595, -300, or an approximate range like c. 1595-1596.")
      return
    }

    const payload = {
      ...form,
      slug: slugify((form.slug || form.title).trim(), { lower: true, strict: true }),
      year: parsedYear.year,
      yearLabel: form.year.trim() || null,
      yearApproximate: parsedYear.approximate,
      publisher: form.publisher || null,
      location: form.location || null,
      description: form.description || null,
      externalUrl: form.externalUrl || null,
      authorId: form.authorId || null,
    }

    const res = await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || "Failed to create source")
      return
    }

    router.push("/admin/sources")
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">New Source</h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Title */}
        <input
          name="title"
          placeholder="Title *"
          value={form.title}
          onChange={handleChange}
          required
          className="border w-full p-2 rounded"
        />

        {/* Slug */}
        <input
          name="slug"
          placeholder="Slug (auto-generated if empty)"
          value={form.slug}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        />

        {/* Type */}
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

        {/* Year */}
        <input
          name="year"
          type="text"
          placeholder="Year or range, e.g. 1595, -300, or c. 1595-1596"
          value={form.year}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        />

        {/* Approximate */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="yearApproximate"
            checked={form.yearApproximate}
            onChange={handleChange}
          />
          Year Approximate
        </label>

        {/* Author (Optional) */}
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

        {/* Publisher */}
        <input
          name="publisher"
          placeholder="Publisher"
          value={form.publisher}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        />

        {/* Location */}
        <input
          name="location"
          placeholder="Location"
          value={form.location}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        />

        {/* Description */}
        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          className="border w-full p-2 rounded"
        />

        {/* External URL */}
        <input
          name="externalUrl"
          placeholder="External URL"
          value={form.externalUrl}
          onChange={handleChange}
          className="border w-full p-2 rounded"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button className="bg-black text-white px-4 py-2 rounded">
          Create Source
        </button>
      </form>
    </div>
  )
}
