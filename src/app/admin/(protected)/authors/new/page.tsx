"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { PageHeader } from "@/components/admin"
import {
  AuthorWikipediaQuickSync,
  AuthorRichMediaStudio,
  AuthorBioGeneratorModal,
} from "@/components/admin/authors"
import {
  Input,
  Textarea,
  Button,
  FormSection,
  FormActions,
  FormErrorBanner,
} from "@/components/ui"
import { slugify } from "@/lib/slug"

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
  const [isBioStudioOpen, setIsBioStudioOpen] = useState(false)
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

    setForm((prev) => ({
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

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <PageHeader
        title="New Author"
        description="Add a philosopher, author, leader, or historical figure."
      />

      {/* Quick-Sync Helper Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/90 rounded-2xl p-4 border border-stone-200/90 text-xs shadow-2xs">
        <div>
          <span className="font-bold text-stone-800 text-xs block">
            Speed up author creation
          </span>
          <span className="text-[11px] text-stone-500">
            Search Wikipedia to auto-fill biography, portrait, dates, and authority IDs in one click.
          </span>
        </div>

        <AuthorWikipediaQuickSync
          currentName={form.name}
          onApplyProfile={(imported) => {
            setForm((prev) => ({
              ...prev,
              name: imported.name || prev.name,
              slug: prev.slug || (imported.name ? slugify(imported.name) : prev.slug),
              bio: imported.bio ?? prev.bio,
              birthYear: imported.birthYear?.toString() || prev.birthYear,
              deathYear: imported.deathYear?.toString() || prev.deathYear,
              dateOfBirth: imported.dateOfBirth || prev.dateOfBirth,
              dateOfDeath: imported.dateOfDeath || prev.dateOfDeath,
              profession: imported.profession || prev.profession,
              nationality: imported.nationality || prev.nationality,
              imageUrl: imported.imageUrl || prev.imageUrl,
              wikipediaUrl: imported.wikipediaUrl || prev.wikipediaUrl,
              wikidataId: imported.wikidataId || prev.wikidataId,
            }))
          }}
        />
      </div>

      <FormErrorBanner error={error} onDismiss={() => setError("")} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Basic Profile" description="Name, slug, bio, and credentials">
          <Input
            name="name"
            label="Name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="e.g. Marcus Aurelius"
          />

          <Input
            name="slug"
            label="Slug"
            value={form.slug}
            onChange={handleChange}
            hint="Auto-generated if left blank"
            placeholder="e.g. marcus-aurelius"
          />

          <div className="space-y-1.5 font-sans">
            <div className="flex items-center justify-between">
              <label
                htmlFor="author-bio"
                className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-700)]"
              >
                Biography
              </label>
              <button
                type="button"
                onClick={() => setIsBioStudioOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 text-indigo-700 hover:text-indigo-900 border border-indigo-200/60 hover:border-indigo-300 transition shadow-2xs cursor-pointer"
              >
                <span className="text-amber-600">✨</span>
                <span>AI Bio Studio</span>
              </button>
            </div>
            <Textarea
              id="author-bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Biographical summary, philosophical background, and key works..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="profession"
              label="Profession / Role"
              value={form.profession}
              onChange={handleChange}
              placeholder="e.g. Roman Emperor & Philosopher"
            />

            <Input
              name="nationality"
              label="Nationality / Region"
              value={form.nationality}
              onChange={handleChange}
              placeholder="e.g. Roman"
            />
          </div>
        </FormSection>

        <FormSection
          title="Lifespan & Dates"
          description="Exact birth/death dates or calendar years"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="dateOfBirth"
              label="Date of Birth"
              value={form.dateOfBirth}
              onChange={handleChange}
              placeholder="YYYY-MM-DD"
              hint="ISO format (e.g. 1879-03-14)"
            />

            <Input
              name="dateOfDeath"
              label="Date of Death"
              value={form.dateOfDeath}
              onChange={handleChange}
              placeholder="YYYY-MM-DD"
              hint="ISO format (e.g. 1955-04-18)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="birthYear"
              type="number"
              label="Birth Year"
              value={form.birthYear}
              onChange={handleChange}
              placeholder="e.g. 121 or -384"
              hint="Negative numbers indicate BCE"
            />

            <Input
              name="deathYear"
              type="number"
              label="Death Year"
              value={form.deathYear}
              onChange={handleChange}
              placeholder="e.g. 180 or -322"
            />
          </div>
        </FormSection>

        <FormSection title="Portrait & Visuals" description="Public avatar, catalog photo, and multi-surface rendering">
          <AuthorRichMediaStudio
            imageUrl={form.imageUrl}
            authorName={form.name}
            profession={form.profession}
            nationality={form.nationality}
            onChange={(url) => setForm((prev) => ({ ...prev, imageUrl: url }))}
          />
        </FormSection>

        <FormSection
          title="External Authorities & Auto-Import"
          description="Wikidata, Wikipedia, VIAF, and library identifier links"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="wikidataId"
              label="Wikidata ID"
              value={form.wikidataId}
              onChange={handleChange}
              onBlur={handleWikidataBlur}
              placeholder="e.g. Q1405"
              hint="Tab out after typing to auto-fetch details"
            />

            <Input
              name="wikipediaUrl"
              label="Wikipedia URL"
              value={form.wikipediaUrl}
              onChange={handleChange}
              placeholder="https://en.wikipedia.org/wiki/..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="wikiquoteUrl"
              label="Wikiquote URL"
              value={form.wikiquoteUrl}
              onChange={handleChange}
              placeholder="https://en.wikiquote.org/wiki/..."
            />

            <Input
              name="openLibraryUrl"
              label="Open Library URL"
              value={form.openLibraryUrl}
              onChange={handleChange}
              placeholder="https://openlibrary.org/authors/..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="viafUrl"
              label="VIAF URL"
              value={form.viafUrl}
              onChange={handleChange}
              placeholder="https://viaf.org/viaf/..."
            />

            <Input
              name="locAuthorityUrl"
              label="Library of Congress URL"
              value={form.locAuthorityUrl}
              onChange={handleChange}
              placeholder="https://id.loc.gov/authorities/names/..."
            />
          </div>

          <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Import Profile Data
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Fetch bio, dates, profession, and portrait from the configured authority links above.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleImportAuthorData()}
                isLoading={importing}
                disabled={importing}
                className="shrink-0"
              >
                {importing ? "Importing..." : "Import Author Data"}
              </Button>
            </div>

            {importError && (
              <p className="text-xs text-red-600 font-medium">{importError}</p>
            )}
          </div>
        </FormSection>

        <FormActions
          submitLabel="Create Author"
          submittingLabel="Creating..."
          isSubmitting={loading}
          cancelHref="/admin/authors"
        />
      </form>

      <AuthorBioGeneratorModal
        isOpen={isBioStudioOpen}
        onClose={() => setIsBioStudioOpen(false)}
        author={{
          name: form.name,
          profession: form.profession,
          nationality: form.nationality,
          birthYear: form.birthYear,
          deathYear: form.deathYear,
          wikipediaUrl: form.wikipediaUrl,
          wikidataId: form.wikidataId,
          currentBio: form.bio,
        }}
        onApplyBio={(newBio) => {
          setForm((prev) => ({ ...prev, bio: newBio }))
        }}
      />
    </div>
  )
}
