"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import Image from "next/image"

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

type ImportSource = "manual" | "wikidata-blur"

export default function NewAuthorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState("")
  const lastAutoImportedWikidataId = useRef<string | null>(null)

  const [form, setForm] = useState({
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
    openLibraryUrl: "",
    viafUrl: "",
    locAuthorityUrl: "",
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target

    setForm((prev) => {
      const updated = { ...prev, [name]: value }

      if (name === "name" && !prev.slug) {
        updated.slug = slugify(value)
      }

      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await fetch("/api/admin/authors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug || slugify(form.name),
        bio: form.bio || null,
        birthYear: form.birthYear ? Number(form.birthYear) : null,
        deathYear: form.deathYear ? Number(form.deathYear) : null,
        profession: form.profession || null,
        nationality: form.nationality || null,
        imageUrl: form.imageUrl || null,
        wikipediaUrl: form.wikipediaUrl || null,
        wikidataId: form.wikidataId || null,
        dateOfBirth: form.dateOfBirth || null,
        dateOfDeath: form.dateOfDeath || null,
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setError(data?.error || "Failed to create author")
      setLoading(false)
      return
    }

    router.push("/admin/authors")
  }

  async function handleImportAuthorData(source: ImportSource = "manual") {
    setImporting(true)
    setImportError("")

    const payload = {
      wikipediaUrl: form.wikipediaUrl || undefined,
      wikidataId: form.wikidataId || undefined,
      wikiquoteUrl: form.wikiquoteUrl || undefined,
      openLibraryUrl: form.openLibraryUrl || undefined,
      viafUrl: form.viafUrl || undefined,
      locAuthorityUrl: form.locAuthorityUrl || undefined,
      name: form.name || undefined,
      provider: form.locAuthorityUrl
        ? "loc"
        : form.viafUrl
          ? "viaf"
          : form.wikiquoteUrl
            ? "wikiquote"
          : form.openLibraryUrl
            ? "openlibrary"
            : form.wikipediaUrl || form.wikidataId
              ? "wikimedia"
            : "auto",
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

    setForm((prev) => {
      const next = {
        ...prev,
        name: data.name || prev.name,
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
        openLibraryUrl: prev.openLibraryUrl,
        viafUrl: prev.viafUrl,
        locAuthorityUrl: prev.locAuthorityUrl,
      }

      return next
    })

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

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">New Author</h1>

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
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium">Slug</label>
          <input
            name="slug"
            value={form.slug}
            onChange={handleChange}
            className="border w-full p-2 rounded"
          />
        </div>

        {/* Bio */}
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

        {/* Exact Birth / Death Dates */}
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

        {/* Birth / Death Year */}
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

        {/* Profession / Nationality */}
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

        {/* Image URL */}
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

        {/* Wikipedia */}
        <div>
          <label className="block text-sm font-medium">Wikipedia URL</label>
          <input
            name="wikipediaUrl"
            value={form.wikipediaUrl}
            onChange={handleChange}
            className="border w-full p-2 rounded"
          />
        </div>

        {/* Wikidata */}
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
          <label className="block text-sm font-medium">Open Library Author URL</label>
          <input
            name="openLibraryUrl"
            value={form.openLibraryUrl}
            onChange={handleChange}
            placeholder="https://openlibrary.org/authors/OL23919A"
            className="border w-full p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">VIAF URL</label>
          <input
            name="viafUrl"
            value={form.viafUrl}
            onChange={handleChange}
            placeholder="https://viaf.org/viaf/113230702/"
            className="border w-full p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">LoC Name Authority URL</label>
          <input
            name="locAuthorityUrl"
            value={form.locAuthorityUrl}
            onChange={handleChange}
            placeholder="https://id.loc.gov/authorities/names/n79021164"
            className="border w-full p-2 rounded"
          />
        </div>

        <div className="rounded border p-4 space-y-3">
          <p className="text-sm font-medium">Import from Wikimedia/Wikiquote/Open Library/VIAF/LoC</p>
          <p className="text-xs text-gray-500">
            Fill Wikipedia, Wikidata, Wikiquote, Open Library, VIAF, or LoC Name Authority URL to import profile data.
          </p>

          {importError && (
            <p className="text-sm text-red-600">{importError}</p>
          )}

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

        <button
          disabled={loading}
          className="bg-black text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Author"}
        </button>

      </form>
    </div>
  )
}
