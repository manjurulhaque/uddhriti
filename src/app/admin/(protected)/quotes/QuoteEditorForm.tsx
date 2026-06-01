"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { tagTypeOptions } from "@/lib/tags/catalog"
import { suggestTags } from "@/lib/tagSuggestions"

type Author = {
  id: string
  name: string
}

type Category = {
  id: string
  name: string
  slug?: string
}

type Source = {
  id: string
  title: string
}

type Tag = {
  id: string
  name: string
  type: string
  description?: string | null
}

type QuoteEditorMode = "create" | "edit"

const STATUSES = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const
const ATTRIBUTION_STATUSES = ["CONFIRMED", "DISPUTED", "MISATTRIBUTED", "UNKNOWN"] as const
const SOURCE_TYPES = ["BOOK", "SPEECH", "ARTICLE", "INTERVIEW", "SCRIPTURE", "LETTER", "OTHER"] as const
const FORM_DEFAULTS_STORAGE_KEY = "admin:new-quote-defaults"
const MAX_SELECTED_TAGS = 7
const inputClass = "w-full rounded border border-gray-300 bg-white p-2 text-sm"
const textareaClass = "w-full rounded border border-gray-300 bg-white p-3 text-sm"
const sectionClass = "space-y-4 rounded border border-gray-200 bg-white p-4"
const sectionTitleClass = "text-sm font-semibold text-gray-900"
const helperTextClass = "text-xs text-gray-500"

export type QuoteEditorFormState = {
  content: string
  meaning: string
  historicalContext: string
  modernRelevance: string
  authorId: string
  categoryId: string
  sourceId: string
  sourceTitle: string
  sourceType: (typeof SOURCE_TYPES)[number]
  language: string
  status: (typeof STATUSES)[number]
  tagIds: string[]
  publishedAt: string
  isFeatured: boolean
  isVerified: boolean
  attributionStatus: (typeof ATTRIBUTION_STATUSES)[number]
  verificationNote: string
}

type QuoteEditorFormProps = {
  mode: QuoteEditorMode
  authors: Author[]
  categories: Category[]
  sources: Source[]
  tags: Tag[]
  quoteId?: string
  initialForm?: Partial<QuoteEditorFormState>
}

const EMPTY_FORM: QuoteEditorFormState = {
  content: "",
  meaning: "",
  historicalContext: "",
  modernRelevance: "",
  authorId: "",
  categoryId: "",
  sourceId: "",
  sourceTitle: "",
  sourceType: "BOOK",
  language: "en",
  status: "DRAFT",
  tagIds: [],
  publishedAt: "",
  isFeatured: false,
  isVerified: false,
  attributionStatus: "UNKNOWN",
  verificationNote: "",
}

type StoredDefaults = {
  authorId?: string
  categoryId?: string
  sourceId?: string
  sourceType?: (typeof SOURCE_TYPES)[number]
  language?: string
  status?: (typeof STATUSES)[number]
  tagIds?: string[]
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items))
}

function serializeFormState(form: QuoteEditorFormState) {
  return JSON.stringify({
    ...form,
    tagIds: [...form.tagIds].sort(),
  })
}

function buildInitialForm(initialForm?: Partial<QuoteEditorFormState>) {
  return {
    ...EMPTY_FORM,
    ...initialForm,
    tagIds: initialForm?.tagIds ?? EMPTY_FORM.tagIds,
  }
}

function validateForm(form: QuoteEditorFormState) {
  if (!form.content.trim()) return "Quote content is required."
  if (form.content.trim().length < 5) return "Quote content must be at least 5 characters."
  if (!form.authorId) return "Please select an author."
  if (!form.categoryId) return "Please select a category."
  return null
}

export default function QuoteEditorForm({
  mode,
  authors,
  categories,
  sources,
  tags,
  quoteId,
  initialForm,
}: QuoteEditorFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<QuoteEditorFormState>(() => buildInitialForm(initialForm))
  const [authorSearch, setAuthorSearch] = useState("")
  const [sourceSearch, setSourceSearch] = useState("")
  const [tagSearch, setTagSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitMode, setSubmitMode] = useState<"list" | "another" | "stay">(
    mode === "create" ? "list" : "stay"
  )
  const [initialSnapshot, setInitialSnapshot] = useState(() =>
    serializeFormState(buildInitialForm(initialForm))
  )

  const deferredAuthorSearch = useDeferredValue(authorSearch)
  const deferredSourceSearch = useDeferredValue(sourceSearch)
  const deferredTagSearch = useDeferredValue(tagSearch)

  useEffect(() => {
    const nextForm = buildInitialForm(initialForm)
    const frameId = window.requestAnimationFrame(() => {
      setForm(nextForm)
      setInitialSnapshot(serializeFormState(nextForm))
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [initialForm])

  useEffect(() => {
    if (mode !== "create") return

    try {
      const rawValue = window.localStorage.getItem(FORM_DEFAULTS_STORAGE_KEY)
      if (!rawValue) return

      const savedDefaults = JSON.parse(rawValue) as StoredDefaults
      const frameId = window.requestAnimationFrame(() => {
        setForm((prev) => {
          const next = { ...prev }

          if (savedDefaults.authorId && authors.some((author) => author.id === savedDefaults.authorId)) {
            next.authorId = savedDefaults.authorId
          }
          if (
            savedDefaults.categoryId &&
            categories.some((category) => category.id === savedDefaults.categoryId)
          ) {
            next.categoryId = savedDefaults.categoryId
          }
          if (savedDefaults.sourceId && sources.some((source) => source.id === savedDefaults.sourceId)) {
            next.sourceId = savedDefaults.sourceId
          }
          if (savedDefaults.sourceType && SOURCE_TYPES.includes(savedDefaults.sourceType)) {
            next.sourceType = savedDefaults.sourceType
          }
          if (savedDefaults.language?.trim()) {
            next.language = savedDefaults.language
          }
          if (savedDefaults.status && STATUSES.includes(savedDefaults.status)) {
            next.status = savedDefaults.status
          }
          if (savedDefaults.tagIds?.length) {
            next.tagIds = savedDefaults.tagIds.filter((tagId) => tags.some((tag) => tag.id === tagId))
          }

          return next
        })
      })

      return () => window.cancelAnimationFrame(frameId)
    } catch {
      window.localStorage.removeItem(FORM_DEFAULTS_STORAGE_KEY)
    }
  }, [authors, categories, mode, sources, tags])

  useEffect(() => {
    if (mode !== "create") return

    const payload: StoredDefaults = {
      authorId: form.authorId || undefined,
      categoryId: form.categoryId || undefined,
      sourceId: form.sourceId || undefined,
      sourceType: form.sourceType,
      language: form.language,
      status: form.status,
      tagIds: form.tagIds,
    }

    window.localStorage.setItem(FORM_DEFAULTS_STORAGE_KEY, JSON.stringify(payload))
  }, [form.authorId, form.categoryId, form.language, form.sourceId, form.sourceType, form.status, form.tagIds, mode])

  const authorById = useMemo(() => new Map(authors.map((author) => [author.id, author])), [authors])
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  )
  const sourceById = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources])
  const tagById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags])

  const wordCount = useMemo(() => form.content.trim().split(/\s+/).filter(Boolean).length, [form.content])
  const charCount = form.content.trim().length

  const filteredAuthors = useMemo(() => {
    const needle = deferredAuthorSearch.trim().toLowerCase()
    if (!needle) return authors
    return authors.filter((author) => author.name.toLowerCase().includes(needle))
  }, [authors, deferredAuthorSearch])

  const filteredSources = useMemo(() => {
    const needle = deferredSourceSearch.trim().toLowerCase()
    if (!needle) return sources
    return sources.filter((source) => source.title.toLowerCase().includes(needle))
  }, [deferredSourceSearch, sources])

  const filteredTags = useMemo(() => {
    const needle = deferredTagSearch.trim().toLowerCase()
    if (!needle) return tags
    return tags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(needle) || tag.type.toLowerCase().includes(needle)
    )
  }, [deferredTagSearch, tags])

  const groupedFilteredTags = useMemo(
    () =>
      tagTypeOptions
        .map((type) => ({
          type,
          tags: filteredTags
            .filter((tag) => tag.type === type)
            .sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .filter((group) => group.tags.length > 0),
    [filteredTags]
  )

  const suggestedTags = useMemo(() => {
    const selectedCategory = categoryById.get(form.categoryId)
    return suggestTags({
      content: form.content,
      categoryName: selectedCategory?.name,
      categorySlug: selectedCategory?.slug,
      sourceTitle: sourceById.get(form.sourceId)?.title,
      sourceTitleDraft: form.sourceTitle,
      selectedTagIds: form.tagIds,
      tags,
    })
  }, [categoryById, form.categoryId, form.content, form.sourceId, form.sourceTitle, form.tagIds, sourceById, tags])

  const selectedAuthorName = authorById.get(form.authorId)?.name || "Author"
  const selectedCategoryName = categoryById.get(form.categoryId)?.name || "No category"
  const selectedTags = useMemo(
    () => form.tagIds.map((tagId) => tagById.get(tagId)).filter(Boolean) as Tag[],
    [form.tagIds, tagById]
  )
  const hasUnsavedDraft = mode === "create" ? Boolean(form.content.trim() || form.sourceTitle.trim()) : false
  const isDirty = useMemo(() => serializeFormState(form) !== initialSnapshot, [form, initialSnapshot])
  const shouldWarnBeforeUnload = mode === "create" ? hasUnsavedDraft : isDirty

  useEffect(() => {
    if (!shouldWarnBeforeUnload) return

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [shouldWarnBeforeUnload])

  const derivedVerificationConfidence = useMemo(() => {
    if (form.isVerified) {
      if (form.attributionStatus === "DISPUTED") return "0.65"
      if (form.attributionStatus === "MISATTRIBUTED") return "0.05"
      return "1.00"
    }

    if (form.attributionStatus === "CONFIRMED") return "0.85"
    if (form.attributionStatus === "DISPUTED") return "0.35"
    if (form.attributionStatus === "MISATTRIBUTED") return "0.05"
    return "0.00"
  }, [form.attributionStatus, form.isVerified])

  const derivedAdminSortKey = useMemo(() => {
    let score = 0

    if (form.status === "PUBLISHED") score += 100
    else if (form.status === "REVIEW") score += 60
    else if (form.status === "DRAFT") score += 20

    if (form.isFeatured) score += 50
    if (form.isVerified) score += 25

    if (form.attributionStatus === "CONFIRMED") score += 10
    else if (form.attributionStatus === "DISPUTED") score -= 10
    else if (form.attributionStatus === "MISATTRIBUTED") score -= 30

    return String(score)
  }, [form.attributionStatus, form.isFeatured, form.isVerified, form.status])

  function updateForm<K extends keyof QuoteEditorFormState>(key: K, value: QuoteEditorFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleTag(tagId: string) {
    setForm((prev) => {
      if (prev.tagIds.includes(tagId)) {
        return {
          ...prev,
          tagIds: prev.tagIds.filter((id) => id !== tagId),
        }
      }

      if (prev.tagIds.length >= MAX_SELECTED_TAGS) {
        setError(`You can select up to ${MAX_SELECTED_TAGS} tags.`)
        return prev
      }

      setError(null)
      return {
        ...prev,
        tagIds: [...prev.tagIds, tagId],
      }
    })
  }

  function addSuggestedTags() {
    setForm((prev) => {
      const availableSlots = MAX_SELECTED_TAGS - prev.tagIds.length
      if (availableSlots <= 0) {
        setError(`You can select up to ${MAX_SELECTED_TAGS} tags.`)
        return prev
      }

      const suggestedIds = suggestedTags.map((tag) => tag.id).filter((id) => !prev.tagIds.includes(id))
      const nextIds = suggestedIds.slice(0, availableSlots)

      if (nextIds.length < suggestedIds.length) {
        setError(`Only ${MAX_SELECTED_TAGS} tags are allowed.`)
      } else {
        setError(null)
      }

      return {
        ...prev,
        tagIds: unique([...prev.tagIds, ...nextIds]),
      }
    })
  }

  function resetForNextQuote() {
    setForm((prev) => ({
      ...prev,
      content: "",
      meaning: "",
      historicalContext: "",
      modernRelevance: "",
      sourceTitle: "",
      publishedAt: "",
      isFeatured: false,
      isVerified: false,
      attributionStatus: "UNKNOWN",
      verificationNote: "",
    }))
    setSourceSearch("")
    setError(null)
  }

  async function handleSubmit(nextMode: "list" | "another" | "stay") {
    const validationError = validateForm(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setSubmitMode(nextMode)
    setError(null)

    const payload = {
      ...form,
      content: form.content.trim(),
      meaning: form.meaning.trim() || null,
      historicalContext: form.historicalContext.trim() || null,
      modernRelevance: form.modernRelevance.trim() || null,
      language: form.language.trim().toLowerCase() || "en",
      sourceId: form.sourceId || null,
      sourceTitle: form.sourceId ? undefined : form.sourceTitle.trim() || undefined,
      sourceType: form.sourceType,
      publishedAt: mode === "edit" ? form.publishedAt || null : undefined,
      verificationNote: mode === "edit" ? form.verificationNote || null : undefined,
      isFeatured: mode === "edit" ? form.isFeatured : undefined,
      isVerified: mode === "edit" ? form.isVerified : undefined,
      attributionStatus: mode === "edit" ? form.attributionStatus : undefined,
    }

    const endpoint = mode === "create" ? "/api/admin/quotes" : `/api/admin/quotes/${quoteId}`
    const method = mode === "create" ? "POST" : "PATCH"

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || `Failed to ${mode === "create" ? "create" : "save"} quote`)
      setLoading(false)
      return
    }

    const savedQuote = await res.json().catch(() => null)

    if (mode === "create" && nextMode === "another") {
      resetForNextQuote()
      setLoading(false)
      return
    }

    if (mode === "edit" && nextMode === "stay") {
      const nextForm = {
        ...form,
        content: form.content.trim(),
        meaning: form.meaning.trim(),
        historicalContext: form.historicalContext.trim(),
        modernRelevance: form.modernRelevance.trim(),
        language: form.language.trim().toLowerCase() || "en",
        sourceId: savedQuote?.sourceId || "",
        sourceTitle: "",
      }
      setForm(nextForm)
      setInitialSnapshot(serializeFormState(nextForm))
      setLoading(false)
      return
    }

    router.push("/admin/quotes")
  }

  async function handleDelete() {
    if (mode !== "edit" || !quoteId) return

    const confirmed = window.confirm("Delete this quote? You can restore it later from deleted quotes.")
    if (!confirmed) return

    const res = await fetch(`/api/admin/quotes/${quoteId}`, {
      method: "DELETE",
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error || "Failed to delete quote")
      return
    }

    router.push("/admin/quotes")
  }

  return (
    <>
      {mode === "edit" && isDirty ? (
        <p className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You have unsaved changes on this quote.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className={sectionClass}>
            <div className="mb-2 flex items-center justify-between">
              <label className={sectionTitleClass}>Quote Text</label>
              <p className="text-xs text-gray-500">
                {wordCount} words / {charCount} chars
              </p>
            </div>
            <label className="mb-2 block text-sm font-medium">Quote Content</label>
            <textarea
              className={`${textareaClass} min-h-[180px]`}
              value={form.content}
              onChange={(e) => updateForm("content", e.target.value)}
              required
            />
          </section>

          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Basic Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
              <label className="mb-2 block text-sm font-medium">Author</label>
              <input
                className={`${inputClass} mb-2`}
                value={authorSearch}
                onChange={(e) => setAuthorSearch(e.target.value)}
                placeholder="Search author..."
              />
              <select
                className={inputClass}
                value={form.authorId}
                onChange={(e) => updateForm("authorId", e.target.value)}
                required
              >
                <option value="">Select Author</option>
                {filteredAuthors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
              </div>

              <div>
              <label className="mb-2 block text-sm font-medium">Category</label>
              <select
                className={inputClass}
                value={form.categoryId}
                onChange={(e) => updateForm("categoryId", e.target.value)}
                required
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
              <label className="mb-2 block text-sm font-medium">Language</label>
              <input
                className={inputClass}
                value={form.language}
                onChange={(e) => updateForm("language", e.target.value)}
                placeholder="en"
              />
              </div>

              <div>
              <label className="mb-2 block text-sm font-medium">Status</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => updateForm("status", e.target.value as (typeof STATUSES)[number])}
              >
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={sectionTitleClass}>Source</h2>
              {form.sourceId ? (
                <button
                  type="button"
                  onClick={() => updateForm("sourceId", "")}
                  className="text-xs font-medium text-gray-600 underline underline-offset-2"
                >
                  Clear source selection
                </button>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Existing Source</label>
                <input
                  className={`${inputClass} mb-2`}
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                  placeholder="Search existing sources..."
                />
                <select
                  className={inputClass}
                  value={form.sourceId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sourceId: e.target.value,
                      sourceTitle: e.target.value ? "" : prev.sourceTitle,
                    }))
                  }
                >
                  <option value="">No Source</option>
                  {filteredSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">New Source</label>
                <input
                  className={`${inputClass} mb-2 disabled:bg-gray-50 disabled:text-gray-400`}
                  placeholder="New source title (optional)"
                  value={form.sourceTitle}
                  onChange={(e) => updateForm("sourceTitle", e.target.value)}
                  disabled={Boolean(form.sourceId)}
                />
                <select
                  className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`}
                  value={form.sourceType}
                  onChange={(e) => updateForm("sourceType", e.target.value as (typeof SOURCE_TYPES)[number])}
                  disabled={Boolean(form.sourceId)}
                >
                  {SOURCE_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className={helperTextClass}>
              Or create one inline when no existing source matches.
            </p>
          </section>

          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>Interpretation</h2>
            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Quote Meaning</label>
                <textarea
                  className={`${textareaClass} min-h-[140px]`}
                  value={form.meaning}
                  onChange={(e) => updateForm("meaning", e.target.value)}
                  placeholder="Explain the idea, lesson, or interpretation of this quote..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Historical Context</label>
                <textarea
                  className={`${textareaClass} min-h-[140px]`}
                  value={form.historicalContext}
                  onChange={(e) => updateForm("historicalContext", e.target.value)}
                  placeholder="Background, time period, audience, event, or source circumstances..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Modern Relevance</label>
                <textarea
                  className={`${textareaClass} min-h-[140px]`}
                  value={form.modernRelevance}
                  onChange={(e) => updateForm("modernRelevance", e.target.value)}
                  placeholder="Why this quote still matters today..."
                />
              </div>
            </div>
          </section>

          {mode === "edit" ? (
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>Publication & Verification</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded border border-gray-300 p-3">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => updateForm("isFeatured", e.target.checked)}
                  />
                  <span className="text-sm font-medium">Featured</span>
                </label>

                <label className="flex items-center gap-2 rounded border border-gray-300 p-3">
                  <input
                    type="checkbox"
                    checked={form.isVerified}
                    onChange={(e) => updateForm("isVerified", e.target.checked)}
                  />
                  <span className="text-sm font-medium">Verified</span>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Attribution Status</label>
                  <select
                    className={inputClass}
                    value={form.attributionStatus}
                    onChange={(e) =>
                      updateForm(
                        "attributionStatus",
                        e.target.value as (typeof ATTRIBUTION_STATUSES)[number]
                      )
                    }
                  >
                    {ATTRIBUTION_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Derived Verification Confidence</label>
                  <div className="w-full rounded border border-gray-300 bg-gray-50 p-2 text-sm">
                    {derivedVerificationConfidence}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Published At (IST)</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={form.publishedAt}
                    onChange={(e) => updateForm("publishedAt", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Derived Admin Sort Key</label>
                  <div className="w-full rounded border border-gray-300 bg-gray-50 p-2 text-sm">
                    {derivedAdminSortKey}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Verification Note</label>
                <textarea
                  className={`${textareaClass} min-h-[100px]`}
                  value={form.verificationNote}
                  onChange={(e) => updateForm("verificationNote", e.target.value)}
                />
              </div>
            </section>
          ) : null}

          <section className={sectionClass}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className={sectionTitleClass}>Tags</h2>
              {suggestedTags.length > 0 ? (
                <button
                  type="button"
                  onClick={addSuggestedTags}
                  className="text-xs font-medium text-gray-600 underline underline-offset-2"
                >
                  Add all suggestions
                </button>
              ) : null}
            </div>
            {suggestedTags.length > 0 ? (
              <div className="mb-3 rounded border border-dashed p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Suggested from quote text
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => {
                    const selected = form.tagIds.includes(tag.id)
                    return (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`rounded border px-3 py-2 text-left text-sm ${
                          selected ? "bg-black text-white" : "bg-white"
                        }`}
                      >
                        <span className="block font-medium">
                          {tag.name} / {tag.type}
                        </span>
                        <span className={`block text-xs ${selected ? "text-gray-200" : "text-gray-500"}`}>
                          {tag.reasons.join(", ")}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="mb-2 text-xs text-gray-500">
                Suggested tags will appear here as you {mode === "create" ? "write" : "edit"} the quote.
              </p>
            )}

            <input
              className={`${inputClass} mb-3`}
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Search tags by name or type..."
            />

            <div className="mb-3 min-h-10 rounded border border-gray-300 p-3">
              {selectedTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className="rounded-full border bg-black px-3 py-1 text-sm text-white"
                    >
                      {tag.name} / {tag.type}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No tags selected yet.</p>
              )}
            </div>

            <div className="max-h-80 space-y-4 overflow-auto rounded border border-gray-300 p-3">
              {groupedFilteredTags.length > 0 ? (
                groupedFilteredTags.map((group) => (
                  <div key={group.type} className="space-y-2">
                    <div className="sticky top-0 bg-white text-xs font-semibold text-gray-500">
                      {group.type}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.tags.map((tag) => {
                        const selected = form.tagIds.includes(tag.id)
                        return (
                          <button
                            type="button"
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            className={`rounded border px-3 py-1 text-sm ${
                              selected ? "bg-black text-white" : "bg-white"
                            }`}
                          >
                            {tag.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No tags match your search.</p>
              )}
            </div>
          </section>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <div className="space-y-3 rounded border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium">{mode === "create" ? "Submission" : "Quote Settings"}</p>
            <p className="text-xs text-gray-500">
              {mode === "create"
                ? `Saving as ${form.status === "PUBLISHED" ? "published quote" : form.status.toLowerCase()}.`
                : "Save back to the list or save and keep editing from this screen."}
            </p>

            {mode === "create" && hasUnsavedDraft ? (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                You have unsaved quote content in progress.
              </p>
            ) : null}

            <div className="rounded border bg-gray-50 p-3 text-xs text-gray-600">
              {mode === "edit" ? <div>Status: {form.status}</div> : <div>Author: {selectedAuthorName}</div>}
              <div>Category: {selectedCategoryName}</div>
              <div>Tags: {selectedTags.length}</div>
              {mode === "edit" ? <div>Dirty: {isDirty ? "Yes" : "No"}</div> : null}
            </div>

            {mode === "create" ? (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleSubmit("list")}
                  className="w-full rounded bg-black p-2 text-white disabled:opacity-50"
                >
                  {loading && submitMode === "list"
                    ? "Saving..."
                    : form.status === "PUBLISHED"
                    ? "Publish Quote"
                    : "Save Quote"}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleSubmit("another")}
                  className="w-full rounded border border-black p-2 disabled:opacity-50"
                >
                  {loading && submitMode === "another" ? "Saving..." : "Save & Add Another"}
                </button>
                <p className="text-xs text-gray-500">
                  Your recent author, category, language, source type, and tags are remembered here.
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleSubmit("list")}
                  className="w-full rounded bg-black p-2 text-white disabled:opacity-50"
                >
                  {loading && submitMode === "list" ? "Saving..." : "Save & Back to List"}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleSubmit("stay")}
                  className="w-full rounded border border-black p-2 disabled:opacity-50"
                >
                  {loading && submitMode === "stay" ? "Saving..." : "Save & Keep Editing"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="w-full rounded bg-red-500 p-2 text-white"
                >
                  Delete Quote
                </button>
              </>
            )}
          </div>

          <div className="rounded border border-gray-200 bg-white p-4">
            <p className="mb-2 text-sm font-medium">Live Preview</p>
            <blockquote className="italic text-gray-700">
              &quot;{form.content || "Your quote preview..."}&quot;
            </blockquote>
            <p className="mt-2 text-sm text-gray-500">- {selectedAuthorName}</p>
          </div>
        </aside>
      </div>
    </>
  )
}
