"use client"

import * as React from "react"
import { QuoteEditorFormState, Author, Category, Tag, SOURCE_TYPES, ATTRIBUTION_STATUSES } from "./types"
import type { AutoCurateResult, SuggestedNewAuthor } from "@/lib/quotes/auto-curator"

interface AutoCurateBannerProps {
  form: QuoteEditorFormState
  setForm: React.Dispatch<React.SetStateAction<QuoteEditorFormState>>
  updateForm: <K extends keyof QuoteEditorFormState>(key: K, value: QuoteEditorFormState[K]) => void
  authors: Author[]
  categories: Category[]
  tags: Tag[]
  onAuthorCreated?: (newAuthor: Author) => void
}

export function AutoCurateBanner({
  form,
  setForm,
  updateForm,
  authors,
  categories,
  tags,
  onAuthorCreated,
}: AutoCurateBannerProps) {
  const [isCurating, setIsCurating] = React.useState(false)
  const [curateError, setCurateError] = React.useState<string | null>(null)
  const [lastCurateResult, setLastCurateResult] = React.useState<AutoCurateResult | null>(null)
  const [previousSnapshot, setPreviousSnapshot] = React.useState<QuoteEditorFormState | null>(null)
  const [isCreatingAuthor, setIsCreatingAuthor] = React.useState(false)
  const [authorCreateSuccess, setAuthorCreateSuccess] = React.useState<string | null>(null)

  const hasContent = form.content.trim().length >= 8

  async function handleAutoCurate() {
    if (!hasContent) return
    setIsCurating(true)
    setCurateError(null)
    setAuthorCreateSuccess(null)
    setPreviousSnapshot({ ...form })

    try {
      const res = await fetch("/api/admin/quotes/auto-curate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: form.content.trim(),
          currentAuthorId: form.authorId || undefined,
          currentCategoryId: form.categoryId || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to auto-curate quotation")
      }

      const result: AutoCurateResult = await res.json()
      setLastCurateResult(result)

      // Apply curated fields to form
      setForm((prev) => {
        const next: QuoteEditorFormState = {
          ...prev,
          content: result.cleanedContent || prev.content,
          meaning: result.meaning || prev.meaning,
          historicalContext: result.historicalContext || prev.historicalContext,
          modernRelevance: result.modernRelevance || prev.modernRelevance,
          categoryId: result.categoryId || prev.categoryId,
          sourceId: result.sourceId || "",
          sourceTitle: result.sourceTitle || "",
          sourceType: (SOURCE_TYPES.includes(result.sourceType as any)
            ? result.sourceType
            : "BOOK") as (typeof SOURCE_TYPES)[number],
          tagIds: result.tagIds && result.tagIds.length > 0 ? result.tagIds : prev.tagIds,
          isVerified: result.isVerified ?? prev.isVerified,
          attributionStatus: (ATTRIBUTION_STATUSES.includes(result.attributionStatus as any)
            ? result.attributionStatus
            : "CONFIRMED") as (typeof ATTRIBUTION_STATUSES)[number],
          verificationNote: result.verificationNote || prev.verificationNote,
        }

        // If author was matched to an existing DB author, assign it
        if (result.authorId) {
          next.authorId = result.authorId
        }

        return next
      })
    } catch (err: unknown) {
      setCurateError(err instanceof Error ? err.message : "Auto-curate encountered an unexpected error")
    } finally {
      setIsCurating(false)
    }
  }

  function handleUndo() {
    if (previousSnapshot) {
      setForm(previousSnapshot)
      setPreviousSnapshot(null)
      setLastCurateResult(null)
      setAuthorCreateSuccess(null)
    }
  }

  async function handleQuickCreateAuthor(authorData: SuggestedNewAuthor) {
    if (!authorData.name) return
    setIsCreatingAuthor(true)
    setCurateError(null)

    try {
      const res = await fetch("/api/admin/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authorData.name.trim(),
          profession: authorData.profession || null,
          nationality: authorData.nationality || null,
          birthYear: authorData.birthYear ?? null,
          deathYear: authorData.deathYear ?? null,
          bio: authorData.bio || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to create author")
      }

      const createdAuthor: Author = await res.json()

      // Notify parent to add author into list and select author in form
      if (onAuthorCreated) {
        onAuthorCreated(createdAuthor)
      }
      updateForm("authorId", createdAuthor.id)

      setAuthorCreateSuccess(`Added "${createdAuthor.name}" to database & linked to quote!`)
      if (lastCurateResult) {
        setLastCurateResult({
          ...lastCurateResult,
          isNewAuthor: false,
          authorId: createdAuthor.id,
        })
      }
    } catch (err: unknown) {
      setCurateError(err instanceof Error ? err.message : "Failed to quick-create author")
    } finally {
      setIsCreatingAuthor(false)
    }
  }

  return (
    <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-purple-50/80 p-4 sm:p-5 shadow-2xs transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-indigo-600/10 p-2.5 text-indigo-700 shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-stone-900">
                1-Click Auto-Curate
              </h2>
              <span className="inline-flex items-center rounded-full bg-indigo-100/90 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">
                Gemini AI
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              Paste or type your quote below, then click to auto-fill author, category, primary source, balanced tags, and curatorial context in seconds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {previousSnapshot ? (
            <button
              type="button"
              onClick={handleUndo}
              disabled={isCurating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              <span>Undo</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleAutoCurate}
            disabled={isCurating || !hasContent}
            title={
              hasContent
                ? "Auto-fill all fields using Gemini AI"
                : "Type or paste a quotation in the box below to activate Auto-Curate"
            }
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all shadow-sm cursor-pointer ${
              hasContent && !isCurating
                ? "bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-200"
                : "bg-stone-300 cursor-not-allowed opacity-60"
            }`}
          >
            {isCurating ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Curating with Gemini...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Auto-Curate Entire Quote</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Callout */}
      {curateError ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs text-red-800 flex items-center justify-between gap-2">
          <span>⚠️ {curateError}</span>
          <button
            type="button"
            onClick={() => setCurateError(null)}
            className="text-red-600 hover:text-red-900 font-bold"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Author Created Success */}
      {authorCreateSuccess ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-800 flex items-center justify-between gap-2">
          <span>✅ {authorCreateSuccess}</span>
          <button
            type="button"
            onClick={() => setAuthorCreateSuccess(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Success Summary Pill Card */}
      {lastCurateResult && !isCurating ? (
        <div className="mt-4 rounded-xl border border-indigo-200/80 bg-white/90 p-3.5 text-xs text-stone-700 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-stone-900">
                Curation Complete ({lastCurateResult.provider === "gemini" ? "Google Gemini AI" : "Heuristic Synthesis"})
              </span>
            </div>
            <span className="text-[11px] text-stone-500 font-mono">
              Confidence: {Math.round(lastCurateResult.verificationConfidence * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {/* Author */}
            <div className="rounded-lg bg-stone-50 border border-stone-200/60 p-2.5">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Author
              </span>
              <div className="font-semibold text-stone-900 mt-0.5 truncate flex items-center gap-1.5">
                <span>{lastCurateResult.authorName}</span>
                {lastCurateResult.authorId ? (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-mono">
                    Linked
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-mono">
                    New Author
                  </span>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="rounded-lg bg-stone-50 border border-stone-200/60 p-2.5">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Category
              </span>
              <div className="font-semibold text-stone-900 mt-0.5 truncate">
                {lastCurateResult.categoryName}
              </div>
            </div>

            {/* Primary Source */}
            <div className="rounded-lg bg-stone-50 border border-stone-200/60 p-2.5">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Primary Source
              </span>
              <div className="font-semibold text-stone-900 mt-0.5 truncate">
                {lastCurateResult.sourceTitle
                  ? `${lastCurateResult.sourceTitle}${lastCurateResult.sourceYear ? ` (${lastCurateResult.sourceYear})` : ""}`
                  : "None detected"}
              </div>
            </div>

            {/* Tags Count */}
            <div className="rounded-lg bg-stone-50 border border-stone-200/60 p-2.5">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Balanced Tags ({lastCurateResult.tagNames.length})
              </span>
              <div className="font-semibold text-stone-900 mt-0.5 truncate">
                {lastCurateResult.tagNames.join(", ") || "None"}
              </div>
            </div>

            {/* Context */}
            <div className="rounded-lg bg-stone-50 border border-stone-200/60 p-2.5">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Curatorial Context
              </span>
              <div className="font-semibold text-stone-900 mt-0.5 text-emerald-700 flex items-center gap-1">
                <span>✓ Meaning, History, & Relevance</span>
              </div>
            </div>

            {/* Verification */}
            <div className="rounded-lg bg-stone-50 border border-stone-200/60 p-2.5">
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                Verification
              </span>
              <div className="font-semibold text-stone-900 mt-0.5">
                <span
                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-bold ${
                    lastCurateResult.attributionStatus === "CONFIRMED"
                      ? "bg-emerald-100 text-emerald-800"
                      : lastCurateResult.attributionStatus === "MISATTRIBUTED"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {lastCurateResult.attributionStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Quick-Create Author Action if brand new */}
          {lastCurateResult.isNewAuthor && lastCurateResult.suggestedNewAuthor ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/90 border border-amber-200 p-3 rounded-xl">
              <div>
                <span className="font-bold text-amber-950 block">
                  Author &ldquo;{lastCurateResult.suggestedNewAuthor.name}&rdquo; is not yet in your database.
                </span>
                <span className="text-[11px] text-amber-800">
                  {lastCurateResult.suggestedNewAuthor.profession || "Historical figure"}
                  {lastCurateResult.suggestedNewAuthor.nationality ? ` • ${lastCurateResult.suggestedNewAuthor.nationality}` : ""}
                  {lastCurateResult.suggestedNewAuthor.birthYear
                    ? ` (${lastCurateResult.suggestedNewAuthor.birthYear}–${lastCurateResult.suggestedNewAuthor.deathYear || ""})`
                    : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickCreateAuthor(lastCurateResult.suggestedNewAuthor!)}
                disabled={isCreatingAuthor}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer self-start sm:self-auto shrink-0 disabled:opacity-50"
              >
                {isCreatingAuthor ? (
                  <span>Adding Author...</span>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Quick-Add &ldquo;{lastCurateResult.suggestedNewAuthor.name}&rdquo; to DB</span>
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
