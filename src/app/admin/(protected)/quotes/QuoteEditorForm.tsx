"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { tagTypeOptions } from "@/lib/tags/catalog"
import { suggestTags } from "@/lib/tagSuggestions"
import { ConfirmModal } from "@/components/ui"
import {
  QuoteEditorFormProps,
  QuoteEditorFormState,
  FORM_DEFAULTS_STORAGE_KEY,
  MAX_SELECTED_TAGS,
  SOURCE_TYPES,
  STATUSES,
  StoredDefaults,
  buildInitialForm,
  serializeFormState,
  validateForm,
  QuoteContentSection,
  QuoteMetadataSection,
  QuoteAttributionSection,
  QuoteTagsSection,
  QuoteEditorSidebar,
  QuoteDiffModal,
} from "./editor"
import { QuotePublishModal } from "./QuotePublishModal"

export type { QuoteEditorFormState }

function unique<T>(items: T[]) {
  return Array.from(new Set(items))
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
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [submitMode, setSubmitMode] = useState<"list" | "another" | "stay">(
    mode === "create" ? "list" : "stay"
  )
  const [initialSnapshot, setInitialSnapshot] = useState(() =>
    serializeFormState(buildInitialForm(initialForm))
  )
  const [recoveredDraft, setRecoveredDraft] = useState<{
    form: QuoteEditorFormState
    savedAt: string
    formattedTime: string
    contentSnippet: string
  } | null>(null)
  const [lastSavedDraftAt, setLastSavedDraftAt] = useState<string | null>(null)
  const [isReviewingDiff, setIsReviewingDiff] = useState(false)
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)

  const draftStorageKey = useMemo(
    () => (mode === "create" ? "admin:quote-editor:draft:create" : `admin:quote-editor:draft:${quoteId || "unknown"}`),
    [mode, quoteId]
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

  // Check for any uncommitted local draft saved in localStorage from a previous session
  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(draftStorageKey)
      if (!rawDraft) return

      const parsed = JSON.parse(rawDraft)
      if (!parsed || !parsed.form) return

      const currentInitial = serializeFormState(buildInitialForm(initialForm))
      const draftSerialized = serializeFormState(parsed.form)

      if (draftSerialized === currentInitial || !parsed.form.content?.trim()) {
        window.localStorage.removeItem(draftStorageKey)
        return
      }

      const savedDate = new Date(parsed.savedAt)
      const formattedTime = Number.isNaN(savedDate.getTime())
        ? "recently"
        : savedDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

      const frameId = window.requestAnimationFrame(() => {
        setRecoveredDraft({
          form: parsed.form,
          savedAt: parsed.savedAt,
          formattedTime,
          contentSnippet: parsed.contentSnippet || parsed.form.content?.slice(0, 100) || "",
        })
      })

      return () => window.cancelAnimationFrame(frameId)
    } catch {
      window.localStorage.removeItem(draftStorageKey)
    }
  }, [draftStorageKey, initialForm])

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

  const handleSubmitRef = useRef(handleSubmit)

  useEffect(() => {
    handleSubmitRef.current = handleSubmit
  })

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        void handleSubmitRef.current(mode === "create" ? "stay" : "stay")
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        void handleSubmitRef.current(mode === "create" ? "another" : "list")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mode])

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
    const selected = form.authorId ? authors.find((a) => a.id === form.authorId) : null

    if (!needle) {
      const initial = authors.slice(0, 100)
      if (selected && !initial.some((a) => a.id === selected.id)) {
        return [selected, ...initial]
      }
      return initial
    }

    const matching = authors.filter((author) => author.name.toLowerCase().includes(needle))
    if (selected && !matching.some((a) => a.id === selected.id)) {
      return [selected, ...matching.slice(0, 100)]
    }
    return matching.slice(0, 100)
  }, [authors, deferredAuthorSearch, form.authorId])

  const filteredSources = useMemo(() => {
    const needle = deferredSourceSearch.trim().toLowerCase()
    const selected = form.sourceId ? sources.find((s) => s.id === form.sourceId) : null

    if (!needle) {
      const initial = sources.slice(0, 100)
      if (selected && !initial.some((s) => s.id === selected.id)) {
        return [selected, ...initial]
      }
      return initial
    }

    const matching = sources.filter((source) => source.title.toLowerCase().includes(needle))
    if (selected && !matching.some((s) => s.id === selected.id)) {
      return [selected, ...matching.slice(0, 100)]
    }
    return matching.slice(0, 100)
  }, [deferredSourceSearch, form.sourceId, sources])

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
    () => form.tagIds.map((tagId) => tagById.get(tagId)).filter(Boolean) as (typeof tags)[number][],
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

  // Debounced auto-save to browser localStorage for crash recovery
  useEffect(() => {
    const hasContent = Boolean(
      form.content.trim() ||
      form.meaning.trim() ||
      form.historicalContext.trim() ||
      form.modernRelevance.trim()
    )

    if (!isDirty || !hasContent) {
      return
    }

    const timer = setTimeout(() => {
      try {
        const now = new Date()
        const draftPayload = {
          form,
          savedAt: now.toISOString(),
          contentSnippet: form.content.trim().slice(0, 100),
        }
        window.localStorage.setItem(draftStorageKey, JSON.stringify(draftPayload))
        setLastSavedDraftAt(
          `Saved locally at ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
        )
      } catch {
        // Ignore storage write quota exceptions
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [form, isDirty, draftStorageKey])

  function handleRestoreDraft() {
    if (!recoveredDraft) return
    setForm(recoveredDraft.form)
    setRecoveredDraft(null)
    setLastSavedDraftAt(`Draft restored from ${recoveredDraft.formattedTime}`)
  }

  function handleDiscardDraft() {
    try {
      window.localStorage.removeItem(draftStorageKey)
    } catch {
      // Ignore
    }
    setRecoveredDraft(null)
    setLastSavedDraftAt(null)
  }

  function handleClearDraft() {
    try {
      window.localStorage.removeItem(draftStorageKey)
    } catch {
      // Ignore
    }
    setLastSavedDraftAt(null)
  }

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
        setError(null)
        return {
          ...prev,
          tagIds: prev.tagIds.filter((id) => id !== tagId),
        }
      }

      if (prev.tagIds.length >= MAX_SELECTED_TAGS) {
        setError(`Taxonomy limit: You can select up to ${MAX_SELECTED_TAGS} tags total.`)
        return prev
      }

      const targetTag = tagById.get(tagId)
      if (targetTag) {
        const currentTags = prev.tagIds.map((id) => tagById.get(id)).filter(Boolean) as (typeof tags)[number][]
        const normType = targetTag.type.toUpperCase()

        if (normType === "TOPIC") {
          const topicCount = currentTags.filter((t) => t.type.toUpperCase() === "TOPIC").length
          if (topicCount >= 2) {
            setError("Taxonomy limit: Maximum 2 Topic tags allowed. Please remove a Topic tag first.")
            return prev
          }
        } else {
          const sameTypeCount = currentTags.filter((t) => t.type.toUpperCase() === normType).length
          if (sameTypeCount >= 1) {
            setError(
              `Taxonomy limit: Only 1 tag allowed for category "${normType}". Please remove the existing "${normType}" tag first.`
            )
            return prev
          }
        }
      }

      setError(null)
      return {
        ...prev,
        tagIds: [...prev.tagIds, tagId],
      }
    })
  }

  function handleApplyAiTags(tagIds: string[]) {
    const validIds = Array.from(new Set(tagIds)).slice(0, MAX_SELECTED_TAGS)
    setForm((prev) => ({
      ...prev,
      tagIds: validIds,
    }))
    setError(null)
  }

  function handleClearAllTags() {
    setForm((prev) => ({
      ...prev,
      tagIds: [],
    }))
    setError(null)
  }

  function addSuggestedTags() {
    setForm((prev) => {
      const currentTags = prev.tagIds.map((id) => tagById.get(id)).filter(Boolean) as (typeof tags)[number][]
      let topicCount = currentTags.filter((t) => t.type.toUpperCase() === "TOPIC").length
      const countsByType = new Map<string, number>()
      for (const t of currentTags) {
        const norm = t.type.toUpperCase()
        if (norm !== "TOPIC") {
          countsByType.set(norm, (countsByType.get(norm) || 0) + 1)
        }
      }

      const acceptableIds: string[] = []
      for (const st of suggestedTags) {
        if (prev.tagIds.includes(st.id)) continue
        if (prev.tagIds.length + acceptableIds.length >= MAX_SELECTED_TAGS) break

        const normType = st.type.toUpperCase()
        if (normType === "TOPIC") {
          if (topicCount < 2) {
            acceptableIds.push(st.id)
            topicCount += 1
          }
        } else {
          const currentCount = countsByType.get(normType) || 0
          if (currentCount < 1) {
            acceptableIds.push(st.id)
            countsByType.set(normType, currentCount + 1)
          }
        }
      }

      if (acceptableIds.length === 0) {
        setError(`No additional suggestions fit the taxonomy rule (max 2 Topics, 1 per other type, 7 total).`)
        return prev
      }

      setError(null)
      return {
        ...prev,
        tagIds: unique([...prev.tagIds, ...acceptableIds]),
      }
    })
  }

  function resetForNextQuote() {
    try {
      window.localStorage.removeItem(draftStorageKey)
    } catch {
      // Ignore
    }
    setLastSavedDraftAt(null)
    setRecoveredDraft(null)

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

    try {
      window.localStorage.removeItem(draftStorageKey)
    } catch {
      // Ignore
    }
    setLastSavedDraftAt(null)
    setRecoveredDraft(null)

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

  async function executeDelete() {
    if (mode !== "edit" || !quoteId) return

    setIsDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || "Failed to delete quote")
        setIsConfirmingDelete(false)
        return
      }

      try {
        window.localStorage.removeItem(draftStorageKey)
      } catch {
        // Ignore
      }

      router.push("/admin/quotes")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete quote")
      setIsConfirmingDelete(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Recovered Draft Banner */}
      {recoveredDraft ? (
        <div className="mb-5 rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-white p-4 shadow-2xs text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-indigo-100 p-1.5 text-indigo-700 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-indigo-950">
                  Unsaved Draft Recovered
                </span>
                <span className="rounded-full bg-indigo-200/80 px-2 py-0.5 text-[10px] font-mono font-medium text-indigo-900 border border-indigo-300/60">
                  Saved {recoveredDraft.formattedTime}
                </span>
              </div>
              <p className="text-indigo-900/90 line-clamp-1 italic font-serif text-[13px]">
                &ldquo;{recoveredDraft.contentSnippet || "Untitled quote draft"}&rdquo;
              </p>
              <p className="text-[11px] text-indigo-700">
                Found an unsaved draft backed up in this browser from a previous editing session. Would you like to restore it?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-2xs transition cursor-pointer text-xs"
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 border border-stone-200 transition cursor-pointer text-xs"
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}

      {mode === "edit" && isDirty ? (
        <div className="mb-5 rounded-2xl border border-amber-200/90 bg-amber-50/60 p-4 text-xs font-medium text-amber-900 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>You have unsaved modifications in this quotation.</span>
          </div>
          <button
            type="button"
            onClick={() => setIsReviewingDiff(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-200/80 hover:bg-amber-200 text-amber-950 font-semibold transition cursor-pointer text-xs shrink-0 self-start sm:self-auto border border-amber-300/60"
          >
            <svg className="w-3.5 h-3.5 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span>Review Changes Diff</span>
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <QuoteContentSection
            form={form}
            updateForm={updateForm}
            wordCount={wordCount}
            charCount={charCount}
            authorName={selectedAuthorName}
            categoryName={selectedCategoryName}
            sourceTitle={sourceById.get(form.sourceId)?.title || form.sourceTitle}
            tags={selectedTags.map((t) => t.name)}
            quoteId={quoteId}
          />

          <QuoteMetadataSection
            form={form}
            updateForm={updateForm}
            setForm={setForm}
            categories={categories}
            filteredAuthors={filteredAuthors}
            authorSearch={authorSearch}
            setAuthorSearch={setAuthorSearch}
            filteredSources={filteredSources}
            sourceSearch={sourceSearch}
            setSourceSearch={setSourceSearch}
            authors={authors}
            sources={sources}
            authorName={selectedAuthorName}
          />

          {mode === "edit" && (
            <QuoteAttributionSection
              form={form}
              updateForm={updateForm}
              derivedVerificationConfidence={derivedVerificationConfidence}
              derivedAdminSortKey={derivedAdminSortKey}
              authorName={authors.find((a) => a.id === form.authorId)?.name}
              quoteId={quoteId}
            />
          )}

          <QuoteTagsSection
            mode={mode}
            form={form}
            selectedTags={selectedTags}
            suggestedTags={suggestedTags}
            groupedFilteredTags={groupedFilteredTags}
            tagSearch={tagSearch}
            setTagSearch={setTagSearch}
            toggleTag={toggleTag}
            addSuggestedTags={addSuggestedTags}
            onApplyAiTags={handleApplyAiTags}
            onClearAllTags={handleClearAllTags}
            quoteContent={form.content}
            quoteMeaning={form.meaning}
            authorName={selectedAuthorName}
            categoryName={selectedCategoryName}
          />

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}
        </div>

        <QuoteEditorSidebar
          mode={mode}
          form={form}
          selectedAuthorName={selectedAuthorName}
          selectedCategoryName={selectedCategoryName}
          selectedTagsCount={selectedTags.length}
          isDirty={isDirty}
          hasUnsavedDraft={hasUnsavedDraft}
          loading={loading}
          submitMode={submitMode}
          handleSubmit={handleSubmit}
          setIsConfirmingDelete={setIsConfirmingDelete}
          lastSavedDraftAt={lastSavedDraftAt}
          onClearDraft={handleClearDraft}
          onReviewDiff={() => setIsReviewingDiff(true)}
          onOpenPublishAssistant={() => setIsPublishModalOpen(true)}
        />
      </div>

      <QuoteDiffModal
        isOpen={isReviewingDiff}
        onClose={() => setIsReviewingDiff(false)}
        onConfirmSave={async () => {
          await handleSubmit("stay")
          setIsReviewingDiff(false)
        }}
        isSaving={loading}
        initialForm={buildInitialForm(initialForm)}
        currentForm={form}
        authors={authors}
        categories={categories}
        sources={sources}
        tags={tags}
      />

      <ConfirmModal
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={executeDelete}
        title="Delete Quote?"
        message="Are you sure you want to delete this quote? You can restore it later from deleted quotes manager."
        confirmLabel="Delete Quote"
        isDestructive
        isLoading={isDeleting}
      />

      <QuotePublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        quote={{
          id: quoteId || "new",
          content: form.content,
          authorName: selectedAuthorName,
          categoryName: selectedCategoryName,
          sourceTitle: form.sourceTitle,
          tags: selectedTags,
          meaning: form.meaning,
          historicalContext: form.historicalContext,
          modernRelevance: form.modernRelevance,
          isVerified: form.isVerified,
          attributionStatus: form.attributionStatus,
          isFeatured: form.isFeatured,
          status: form.status,
          publishedAt: form.publishedAt,
        }}
        onSaveSuccess={(updated) => {
          updateForm("status", updated.status as (typeof STATUSES)[number])
          updateForm("isFeatured", updated.isFeatured)
          if (updated.publishedAt) {
            updateForm("publishedAt", updated.publishedAt)
          }
          setIsPublishModalOpen(false)
        }}
      />
    </>
  )
}
