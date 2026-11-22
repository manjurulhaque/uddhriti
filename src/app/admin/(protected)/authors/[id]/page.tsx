"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
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
  ConfirmModal,
} from "@/components/ui"
import { slugify } from "@/lib/slug"

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
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState("")
  const [importError, setImportError] = useState("")
  const [isBioStudioOpen, setIsBioStudioOpen] = useState(false)
  const [form, setForm] = useState<AuthorForm>(emptyForm)
  const [authorStats, setAuthorStats] = useState<{ quoteCount: number; sourceCount: number } | null>(null)
  const lastAutoImportedWikidataId = useRef<string | null>(null)

  useEffect(() => {
    if (!id) return

    let cancelled = false

    async function loadAuthor() {
      setLoading(true)
      setError("")

      try {
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

        if (data._count) {
          setAuthorStats({
            quoteCount: data._count.quotes || 0,
            sourceCount: data._count.sources || 0,
          })
        } else if (typeof data.quoteCount === "number") {
          setAuthorStats({
            quoteCount: data.quoteCount,
            sourceCount: 0,
          })
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load author")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
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

    try {
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save author")
      setSaving(false)
    }
  }

  async function executeDelete() {
    if (!id) return

    setDeleting(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/authors/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || "Failed to delete author")
        setIsConfirmingDelete(false)
        return
      }

      router.push("/admin/authors")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete author")
      setIsConfirmingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-3xl space-y-4">
        <div className="h-8 w-48 bg-stone-200 animate-pulse rounded-lg" />
        <div className="h-4 w-72 bg-stone-100 animate-pulse rounded-md" />
        <div className="h-64 w-full bg-stone-50 animate-pulse rounded-2xl border border-stone-200/60" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <PageHeader
        title={`Edit Author: ${form.name || "..."}`}
        description="Update author biography, chronology, portrait, and authority citations."
      />

      {/* Author Footprint & Quick-Sync Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/90 rounded-2xl p-4 border border-stone-200/90 text-xs shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-stone-700 mr-1 uppercase text-[10px] tracking-wider">
            Footprint:
          </span>
          <a
            href={`/admin/quotes?authorId=${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-stone-900 font-mono shadow-2xs hover:border-stone-300 transition"
          >
            <span>{authorStats?.quoteCount ?? 0} Quotes</span>
            <svg className="w-3 h-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          <a
            href={`/admin/sources?authorId=${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-stone-900 font-mono shadow-2xs hover:border-stone-300 transition"
          >
            <span>{authorStats?.sourceCount ?? 0} Works</span>
            <svg className="w-3 h-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {form.slug && (
            <a
              href={`/authors/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 shadow-2xs transition"
            >
              <span>Public Page</span>
              <svg className="w-3 h-3 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
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

      <form onSubmit={handleSave} className="space-y-6">
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
          description="Wikidata, Wikipedia, and library identifier links"
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

          <Input
            name="wikiquoteUrl"
            label="Wikiquote URL"
            value={form.wikiquoteUrl}
            onChange={handleChange}
            placeholder="https://en.wikiquote.org/wiki/..."
          />

          <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Import Profile Data
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Refresh bio, dates, profession, and portrait from the linked authorities.
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
          submitLabel="Save Changes"
          submittingLabel="Saving..."
          isSubmitting={saving}
          cancelHref="/admin/authors"
          onDelete={() => setIsConfirmingDelete(true)}
          deleteLabel="Delete Author"
          isDeleting={deleting}
        />
      </form>

      <ConfirmModal
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={executeDelete}
        title="Delete Author?"
        message={`Are you sure you want to delete author "${form.name}"? Quotes and sources attributed to this author may become orphaned.`}
        confirmLabel="Delete Author"
        isDestructive
        isLoading={deleting}
      />

      <AuthorBioGeneratorModal
        isOpen={isBioStudioOpen}
        onClose={() => setIsBioStudioOpen(false)}
        author={{
          id: id || undefined,
          name: form.name,
          slug: form.slug,
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
