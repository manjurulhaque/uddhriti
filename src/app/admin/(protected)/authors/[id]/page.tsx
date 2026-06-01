"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
}

function normalizeWikidataId(value: string) {
  const normalized = value.trim().toUpperCase()
  return /^Q\d+$/.test(normalized) ? normalized : null
}

type AuthorForm = {
  name: string
  slug: string
  bio: string
  birthYear: string
  deathYear: string
  dateOfBirth: string
  dateOfDeath: string
  profession: string
  nationality: string
  imageUrl: string
  wikipediaUrl: string
  wikidataId: string
  wikiquoteUrl: string
}

type ImportProvider = "wikimedia" | "wikiquote"

const emptyForm: AuthorForm = {
  name: "",
  slug: "",
  bio: "",
  birthYear: "",
  deathYear: "",
  dateOfBirth: "",
  dateOfDeath: "",
  profession: "",
  nationality: "",
  imageUrl: "",
  wikipediaUrl: "",
  wikidataId: "",
  wikiquoteUrl: "",
}

export default function EditAuthorPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState("")
  const [importError, setImportError] = useState("")
  const [form, setForm] = useState<AuthorForm>(emptyForm)
  const lastAutoImportedWikidataId = useRef<string | null>(null)

  useEffect(() => {
    if (!id) return

    let cancelled = false

    async function loadAuthor() {
      setLoading(true)
      setError("")

      const res = await fetch(`/api/admin/authors/${id}`)
      const data = await res.json().catch(() => null)

      if (cancelled) return

      if (!res.ok || !data) {
        setError(data?.error || "Failed to load author")
        setLoading(false)
        return
      }

      setForm({
        name: data.name || "",
        slug: data.slug || "",
        bio: data.bio || "",
        birthYear: data.birthYear?.toString() || "",
        deathYear: data.deathYear?.toString() || "",
        dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : "",
        dateOfDeath: data.dateOfDeath ? String(data.dateOfDeath).slice(0, 10) : "",
        profession: data.profession || "",
        nationality: data.nationality || "",
        imageUrl: data.imageUrl || "",
        wikipediaUrl: data.wikipediaUrl || "",
        wikidataId: data.wikidataId || "",
        wikiquoteUrl: "",
      })
      setLoading(false)
    }

    loadAuthor()

    return () => {
      cancelled = true
    }
  }, [id])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target

    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === "name" && !prev.slug) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  async function handleImportAuthorData(source: "manual" | "wikidata-blur" = "manual") {
    setImporting(true)
    setImportError("")

    const provider: ImportProvider = form.wikiquoteUrl ? "wikiquote" : "wikimedia"

    const payload = {
      wikipediaUrl: form.wikipediaUrl || undefined,
      wikidataId: form.wikidataId || undefined,
      wikiquoteUrl: form.wikiquoteUrl || undefined,
      name: form.name || undefined,
      provider,
    }

    const res = await fetch("/api/admin/authors/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setImportError(data?.error || "Failed to import author data")
      setImporting(false)
      return
    }

    setForm((prev) => ({
      ...prev,
      name: prev.name || data.name || "",
      slug: prev.slug || (data.name ? slugify(data.name) : prev.slug),
      bio: data.bio ?? prev.bio,
      birthYear: data.birthYear?.toString() || prev.birthYear,
      deathYear: data.deathYear?.toString() || prev.deathYear,
      dateOfBirth: data.dateOfBirth || prev.dateOfBirth,
      dateOfDeath: data.dateOfDeath || prev.dateOfDeath,
      profession: data.profession || prev.profession,
      nationality: data.nationality || prev.nationality,
      imageUrl: data.imageUrl || prev.imageUrl,
      wikipediaUrl: data.wikipediaUrl || prev.wikipediaUrl,
      wikidataId: data.wikidataId || prev.wikidataId,
      wikiquoteUrl: prev.wikiquoteUrl,
    }))

    setImporting(false)

    if (source === "wikidata-blur") {
      lastAutoImportedWikidataId.current = normalizeWikidataId(form.wikidataId)
    }
  }

  async function handleWikidataBlur() {
    const wikidataId = normalizeWikidataId(form.wikidataId)
    if (!wikidataId || importing) return
    if (lastAutoImportedWikidataId.current === wikidataId) return

    await handleImportAuthorData("wikidata-blur")
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return

    setSaving(true)
    setError("")

    const res = await fetch(`/api/admin/authors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug || slugify(form.name),
        bio: form.bio || null,
        birthYear: form.birthYear ? Number(form.birthYear) : null,
        deathYear: form.deathYear ? Number(form.deathYear) : null,
        dateOfBirth: form.dateOfBirth || null,
        dateOfDeath: form.dateOfDeath || null,
        profession: form.profession || null,
        nationality: form.nationality || null,
        imageUrl: form.imageUrl || null,
        wikipediaUrl: form.wikipediaUrl || null,
        wikidataId: form.wikidataId || null,
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setError(data?.error || "Failed to save author")
      setSaving(false)
      return
    }

    router.push("/admin/authors")
  }

  async function handleDelete() {
    if (!id) return

    setDeleting(true)
    setError("")

    const res = await fetch(`/api/admin/authors/${id}`, {
      method: "DELETE",
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || "Failed to delete author")
      setDeleting(false)
      return
    }

    router.push("/admin/authors")
  }

  if (loading) {
    return <div className="p-8">Loading author...</div>
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Edit Author</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Name *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="border w-full p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Slug</label>
          <input
            name="slug"
            value={form.slug}
            onChange={handleChange}
            className="border w-full p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Bio</label>
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={4}
            className="border w-full p-2 rounded"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Date of Birth</label>
            <input
              name="dateOfBirth"
              type="text"
              value={form.dateOfBirth}
              onChange={handleChange}
              placeholder="YYYY-MM-DD"
              className="border w-full p-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Date of Death</label>
            <input
              name="dateOfDeath"
              type="text"
              value={form.dateOfDeath}
              onChange={handleChange}
              placeholder="YYYY-MM-DD"
              className="border w-full p-2 rounded"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Use ISO format when exact dates are known. For historical figures where exact dates are
          unavailable or unsupported, keep the year fields filled and leave exact dates blank.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Birth Year</label>
            <input
              name="birthYear"
              type="number"
              value={form.birthYear}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Death Year</label>
            <input
              name="deathYear"
              type="number"
              value={form.deathYear}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Profession</label>
            <input
              name="profession"
              value={form.profession}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Nationality</label>
            <input
              name="nationality"
              value={form.nationality}
              onChange={handleChange}
              className="border w-full p-2 rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Image URL</label>
          <input
            name="imageUrl"
            value={form.imageUrl}
            onChange={handleChange}
            className="border w-full p-2 rounded"
          />

          {form.imageUrl && (
            <Image
              src={form.imageUrl}
              alt={`${form.name || "Author"} portrait`}
              width={64}
              height={64}
              className="mt-2 w-16 h-16 rounded-full object-cover border"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Wikipedia URL</label>
          <input
            name="wikipediaUrl"
            value={form.wikipediaUrl}
            onChange={handleChange}
            className="border w-full p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Wikiquote URL</label>
          <input
            name="wikiquoteUrl"
            value={form.wikiquoteUrl}
            onChange={handleChange}
            placeholder="https://en.wikiquote.org/wiki/Albert_Einstein"
            className="border w-full p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Wikidata ID</label>
          <input
            name="wikidataId"
            value={form.wikidataId}
            onChange={handleChange}
            onBlur={handleWikidataBlur}
            placeholder="Q42"
            className="border w-full p-2 rounded"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter a valid Wikidata ID like <code>Q42</code> and tab out to auto-fill author data.
          </p>
        </div>

        <div className="rounded border p-4 space-y-3">
          <p className="text-sm font-medium">Import From Wikimedia</p>
          <p className="text-xs text-gray-500">
            Use the current Wikipedia URL, Wikidata ID, or Wikiquote URL to refresh this author with imported profile data.
          </p>

          {importError && <p className="text-sm text-red-600">{importError}</p>}

          <button
            type="button"
            onClick={() => void handleImportAuthorData()}
            disabled={importing}
            className="bg-white border px-4 py-2 rounded disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import Author Data"}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </form>
    </div>
  )
}
