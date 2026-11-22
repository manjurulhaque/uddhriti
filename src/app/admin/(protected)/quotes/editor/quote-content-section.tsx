"use client"

import * as React from "react"
import { QuoteEditorFormState } from "./types"
import { QuoteSocialCardPreview } from "./quote-social-card-preview"

interface QuoteContentSectionProps {
  form: QuoteEditorFormState
  updateForm: <K extends keyof QuoteEditorFormState>(key: K, value: QuoteEditorFormState[K]) => void
  wordCount: number
  charCount: number
  authorName?: string
  categoryName?: string
  sourceTitle?: string
  tags?: string[]
  quoteId?: string
}

type DuplicateStatus = {
  isChecking: boolean
  isDuplicate: boolean
  matchType?: "exact" | "near"
  similarity?: number
  quote?: {
    id: string
    content: string
    status: string
    slug: string
    authorName?: string | null
    categoryName?: string | null
  }
}

function IconPen({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

function IconEye({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function IconShareCard({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

export function QuoteContentSection({
  form,
  updateForm,
  wordCount,
  charCount,
  authorName,
  categoryName,
  sourceTitle,
  tags = [],
  quoteId,
}: QuoteContentSectionProps) {
  const [viewMode, setViewMode] = React.useState<"edit" | "preview" | "social">("edit")
  const [previewTheme, setPreviewTheme] = React.useState<"paper" | "dark">("paper")
  const [duplicateStatus, setDuplicateStatus] = React.useState<DuplicateStatus>({
    isChecking: false,
    isDuplicate: false,
  })
  const [dismissedForContent, setDismissedForContent] = React.useState<string | null>(null)
  const [isStreamingContext, setIsStreamingContext] = React.useState(false)
  const [streamingContextField, setStreamingContextField] = React.useState<"meaning" | "historicalContext" | "modernRelevance" | null>(null)
  const [contextStreamError, setContextStreamError] = React.useState<string | null>(null)
  const contextAbortRef = React.useRef<AbortController | null>(null)

  React.useEffect(() => {
    return () => {
      if (contextAbortRef.current) {
        contextAbortRef.current.abort()
      }
    }
  }, [])

  function handleStopContextStream() {
    if (contextAbortRef.current) {
      contextAbortRef.current.abort()
      contextAbortRef.current = null
    }
    setIsStreamingContext(false)
    setStreamingContextField(null)
  }

  async function handleStreamContext(field?: "meaning" | "historicalContext" | "modernRelevance") {
    if (!form.content.trim()) return

    setContextStreamError(null)
    setIsStreamingContext(true)
    setStreamingContextField(field || "meaning")

    const accumulated = {
      meaning: field === "meaning" ? "" : form.meaning || "",
      historicalContext: field === "historicalContext" ? "" : form.historicalContext || "",
      modernRelevance: field === "modernRelevance" ? "" : form.modernRelevance || "",
    }

    if (field) {
      accumulated[field] = ""
      updateForm(field, "")
    } else {
      accumulated.meaning = ""
      accumulated.historicalContext = ""
      accumulated.modernRelevance = ""
      updateForm("meaning", "")
      updateForm("historicalContext", "")
      updateForm("modernRelevance", "")
    }

    const controller = new AbortController()
    contextAbortRef.current = controller

    try {
      const res = await fetch("/api/admin/quotes/suggest-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          quoteId: quoteId,
          content: form.content.trim(),
          authorName: authorName,
          categoryName: categoryName,
          sourceTitle: sourceTitle,
          stream: true,
          targetField: field,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to generate context")
      }

      if (!res.body) throw new Error("No response body received")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let sseBuffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        sseBuffer += decoder.decode(value, { stream: true })
        const lines = sseBuffer.split("\n")
        sseBuffer = lines.pop() ?? ""

        let currentEvent = "message"

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) {
            currentEvent = "message"
            continue
          }

          if (trimmed.startsWith("event:")) {
            currentEvent = trimmed.slice(6).trim()
            continue
          }

          if (trimmed.startsWith("data:")) {
            const jsonStr = trimmed.slice(5).trim()
            if (!jsonStr) continue

            try {
              const data = JSON.parse(jsonStr)

              if (currentEvent === "delta") {
                const targetKey = data.field as "meaning" | "historicalContext" | "modernRelevance"
                setStreamingContextField(targetKey)
                accumulated[targetKey] = (accumulated[targetKey] || "") + data.text
                updateForm(targetKey, accumulated[targetKey])
              } else if (currentEvent === "complete") {
                const targetKey = data.field as "meaning" | "historicalContext" | "modernRelevance"
                accumulated[targetKey] = data.fullText
                updateForm(targetKey, data.fullText)
              } else if (currentEvent === "done") {
                if (data.draft) {
                  if (data.draft.meaning) updateForm("meaning", data.draft.meaning)
                  if (data.draft.historicalContext) updateForm("historicalContext", data.draft.historicalContext)
                  if (data.draft.modernRelevance) updateForm("modernRelevance", data.draft.modernRelevance)
                }
              } else if (currentEvent === "error") {
                setContextStreamError(data.message || "Streaming error encountered")
              }
            } catch {
              // Ignore non-json
            }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setContextStreamError(err instanceof Error ? err.message : "Failed to stream context")
      }
    } finally {
      setIsStreamingContext(false)
      setStreamingContextField(null)
      contextAbortRef.current = null
    }
  }

  const trimmedContent = form.content.trim()
  const isTooShort = trimmedContent.length < 12
  const activeDuplicateStatus = isTooShort
    ? { isChecking: false, isDuplicate: false }
    : duplicateStatus
  const isDismissed =
    dismissedForContent !== null && dismissedForContent === trimmedContent

  React.useEffect(() => {
    if (trimmedContent.length < 12) {
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setDuplicateStatus((prev) => ({ ...prev, isChecking: true }))

      try {
        const res = await fetch("/api/admin/quotes/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: trimmedContent,
            excludeId: quoteId,
            authorId: form.authorId || undefined,
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          setDuplicateStatus({ isChecking: false, isDuplicate: false })
          return
        }

        const data = await res.json()
        setDuplicateStatus({
          isChecking: false,
          isDuplicate: Boolean(data.isDuplicate),
          matchType: data.matchType,
          similarity: data.similarity,
          quote: data.quote,
        })
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return
        }
        setDuplicateStatus({ isChecking: false, isDuplicate: false })
      }
    }, 400)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [trimmedContent, form.authorId, quoteId])

  // Editorial metrics
  const readingTimeSec = Math.max(1, Math.round((wordCount / 200) * 60))
  const fitsTwitter = charCount <= 280

  const resolvedAuthor =
    authorName && authorName !== "Author"
      ? authorName
      : "Unknown Thinker"

  const resolvedSource =
    (sourceTitle && sourceTitle.trim() ? sourceTitle : null) ||
    (form.sourceTitle && form.sourceTitle.trim() ? form.sourceTitle : null)

  const resolvedCategory =
    categoryName && categoryName !== "No category" ? categoryName : "Philosophy"

  return (
    <div className="space-y-6">
      {/* Primary Quote Content Section */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        {/* Header with Title and Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
              Quote Content
            </h2>
            <p className="text-xs text-stone-500">
              The primary text of the quotation exactly as spoken or written.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch between Editor and Live Preview */}
            <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200/80">
              <button
                type="button"
                onClick={() => setViewMode("edit")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  viewMode === "edit"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <IconPen className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  viewMode === "preview"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <IconEye className="w-3.5 h-3.5" />
                <span>Card Mockup</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("social")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  viewMode === "social"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <IconShareCard className="w-3.5 h-3.5" />
                <span>Social Card (1200×630)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Editorial Metrics & Social Fit Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-50/80 rounded-xl px-3.5 py-2 border border-stone-200/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-white border border-stone-200/80 px-2 py-0.5 text-[11px] font-mono text-stone-700">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
            <span className="inline-flex items-center rounded-md bg-white border border-stone-200/80 px-2 py-0.5 text-[11px] font-mono text-stone-700">
              {charCount} chars
            </span>
            <span className="inline-flex items-center rounded-md bg-white border border-stone-200/80 px-2 py-0.5 text-[11px] text-stone-600">
              ~{readingTimeSec}s read
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeDuplicateStatus.isChecking ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-mono animate-pulse border border-stone-200">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                checking duplicate...
              </span>
            ) : !activeDuplicateStatus.isDuplicate && trimmedContent.length >= 20 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Unique quote
              </span>
            ) : null}

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                fitsTwitter
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
              title={
                fitsTwitter
                  ? "Fits within a single Twitter / X post"
                  : "Passage exceeds 280 characters, suitable for thread or typography card"
              }
            >
              <span className={`w-1.5 h-1.5 rounded-full ${fitsTwitter ? "bg-emerald-500" : "bg-amber-500"}`} />
              {fitsTwitter ? `Fits X/Twitter (${charCount}/280)` : `Exceeds 280 chars (${charCount}/280)`}
            </span>
          </div>
        </div>

        {/* Main Editor View */}
        {viewMode === "edit" ? (
          <div className="space-y-3">
            <textarea
              className="w-full min-h-[160px] rounded-xl border border-stone-300 bg-stone-50/30 p-4 font-serif text-base text-stone-900 leading-relaxed placeholder:font-sans placeholder:text-sm placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
              value={form.content}
              onChange={(e) => updateForm("content", e.target.value)}
              placeholder="Type or paste the quotation text here..."
              required
              aria-label="Quote Content"
            />

            {/* Duplicate Warning Callout */}
            {!isDismissed && activeDuplicateStatus.isDuplicate && activeDuplicateStatus.quote ? (
              <div
                className={`rounded-xl border p-4 text-xs transition-all animate-in fade-in duration-200 ${
                  activeDuplicateStatus.matchType === "exact"
                    ? "bg-rose-50/90 border-rose-300 text-rose-950 shadow-2xs"
                    : "bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 rounded-full p-1.5 shrink-0 ${
                        activeDuplicateStatus.matchType === "exact"
                          ? "bg-rose-200/80 text-rose-800"
                          : "bg-amber-200/80 text-amber-800"
                      }`}
                    >
                      {activeDuplicateStatus.matchType === "exact" ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold tracking-tight text-sm">
                          {activeDuplicateStatus.matchType === "exact"
                            ? "Exact Duplicate Detected"
                            : `Potential Duplicate Found (${activeDuplicateStatus.similarity}% match)`}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${
                            activeDuplicateStatus.matchType === "exact"
                              ? "bg-rose-200 text-rose-900"
                              : "bg-amber-200 text-amber-900"
                          }`}
                        >
                          {activeDuplicateStatus.matchType === "exact" ? "100% Match" : `${activeDuplicateStatus.similarity}% Similarity`}
                        </span>
                        {activeDuplicateStatus.quote.status ? (
                          <span className="px-1.5 py-0.5 rounded bg-white/80 border border-stone-200 text-[10px] text-stone-600 font-mono">
                            {activeDuplicateStatus.quote.status}
                          </span>
                        ) : null}
                      </div>

                      <p className="font-serif italic text-stone-800 bg-white/80 rounded-lg p-3 border border-stone-200/70 leading-relaxed text-[13px]">
                        &ldquo;{activeDuplicateStatus.quote.content}&rdquo;
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-stone-600 pt-0.5 text-xs">
                        {activeDuplicateStatus.quote.authorName ? (
                          <span>
                            Author: <strong className="font-medium text-stone-900">{activeDuplicateStatus.quote.authorName}</strong>
                          </span>
                        ) : null}
                        {activeDuplicateStatus.quote.categoryName ? (
                          <span>
                            Category: <strong className="font-medium text-stone-900">{activeDuplicateStatus.quote.categoryName}</strong>
                          </span>
                        ) : null}
                        {activeDuplicateStatus.matchType === "exact" ? (
                          <span className="text-rose-700 font-medium">
                            Submitting will fail due to database unique constraint.
                          </span>
                        ) : (
                          <span className="text-amber-800">
                            Please check if this quote is already in Quotzen under another phrasing or author.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    <a
                      href={`/admin/quotes/${activeDuplicateStatus.quote.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 transition cursor-pointer text-xs shadow-2xs"
                    >
                      <span>View Quote</span>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    {activeDuplicateStatus.matchType === "near" ? (
                      <button
                        type="button"
                        onClick={() => setDismissedForContent(trimmedContent)}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 border border-stone-200 transition cursor-pointer text-xs"
                      >
                        Dismiss
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : viewMode === "preview" ? (
          /* Live Typography Card Preview View */
          <div className="space-y-3">
            {/* Card Theme Switcher */}
            <div className="flex items-center justify-between text-xs text-stone-500 px-1">
              <span>Card preview mockup</span>
              <div className="inline-flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                <button
                  type="button"
                  onClick={() => setPreviewTheme("paper")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition ${
                    previewTheme === "paper" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-600"
                  }`}
                >
                  Paper Light
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTheme("dark")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition ${
                    previewTheme === "dark" ? "bg-stone-900 text-white shadow-2xs" : "text-stone-600"
                  }`}
                >
                  Noir Dark
                </button>
              </div>
            </div>

            {/* Rendered Quote Card */}
            <div
              className={`rounded-2xl p-6 sm:p-8 transition-all duration-200 border shadow-sm ${
                previewTheme === "dark"
                  ? "bg-neutral-900 text-neutral-100 border-neutral-800"
                  : "bg-stone-50/70 text-stone-900 border-stone-200"
              }`}
            >
              <div className="space-y-4">
                {/* Category & Tags Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
                      previewTheme === "dark"
                        ? "bg-neutral-800 text-neutral-300 border border-neutral-700"
                        : "bg-white text-stone-800 border border-stone-200 shadow-2xs"
                    }`}
                  >
                    {resolvedCategory}
                  </span>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      {tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            previewTheme === "dark"
                              ? "bg-neutral-800/80 text-neutral-400"
                              : "bg-stone-200/60 text-stone-600"
                          }`}
                        >
                          #{tag}
                        </span>
                      ))}
                      {tags.length > 4 && (
                        <span className="text-[10px] text-stone-400">+{tags.length - 4} more</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Quote Typography */}
                <blockquote className="relative pt-2">
                  <span className="font-serif text-3xl opacity-30 select-none mr-1">“</span>
                  <p className="font-serif text-lg sm:text-xl md:text-2xl leading-relaxed italic inline">
                    {form.content.trim() ? form.content : "The text of your quotation will appear here formatted with typographic precision..."}
                  </p>
                  <span className="font-serif text-3xl opacity-30 select-none ml-1">”</span>
                </blockquote>

                {/* Attribution Footer */}
                <div className="pt-3 border-t border-dashed border-stone-200/50 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{resolvedAuthor}</span>
                    {resolvedSource && (
                      <span className="text-xs opacity-70 italic">
                        in {resolvedSource}
                      </span>
                    )}
                  </div>
                  <span className="text-xs opacity-50 font-mono">Quotzen</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Social Sharing Card (1200×630) Live Generator & Preview */
          <QuoteSocialCardPreview
            content={form.content}
            authorName={resolvedAuthor}
            categoryName={resolvedCategory}
            sourceTitle={resolvedSource}
            isVerified={form.isVerified}
            tags={tags}
            quoteId={quoteId}
          />
        )}
      </section>

      {/* Literary Interpretation & Context */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
                Interpretation &amp; Context
              </h2>
              {isStreamingContext && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-800 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-ping" />
                  Streaming live...
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">
              Enrich the quotation with meaning, historical provenance, and contemporary relevance.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {isStreamingContext ? (
              <button
                type="button"
                onClick={handleStopContextStream}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition shadow-2xs cursor-pointer"
                title="Interrupt real-time stream"
              >
                ⏹ Stop Stream
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleStreamContext()}
                disabled={!form.content.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-50 text-violet-800 border border-violet-200 hover:bg-violet-100 disabled:opacity-50 transition shadow-2xs cursor-pointer"
                title="Stream all 3 contextual dimensions in real-time with AI"
              >
                ⚡ AI Stream All 3
              </button>
            )}
          </div>
        </div>

        {contextStreamError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-medium">
            {contextStreamError}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Quote Meaning */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Quote Meaning
              </label>
              <button
                type="button"
                onClick={() => {
                  if (streamingContextField === "meaning") {
                    handleStopContextStream()
                  } else {
                    void handleStreamContext("meaning")
                  }
                }}
                disabled={!form.content.trim() || (isStreamingContext && streamingContextField !== "meaning")}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition cursor-pointer disabled:opacity-50 ${
                  streamingContextField === "meaning"
                    ? "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
                    : "border-violet-200 bg-violet-50/70 text-violet-800 hover:bg-violet-100"
                }`}
                title="Stream meaning interpretation"
              >
                {streamingContextField === "meaning" ? "⏹ Stop" : "⚡ Suggest"}
              </button>
            </div>
            <textarea
              className={`w-full min-h-[130px] rounded-xl border p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none transition-all leading-relaxed ${
                streamingContextField === "meaning"
                  ? "border-violet-500 ring-2 ring-violet-200 bg-violet-50/20"
                  : "border-stone-300 bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
              }`}
              value={form.meaning}
              onChange={(e) => updateForm("meaning", e.target.value)}
              placeholder="Explain the central idea, moral lesson, or interpretation of this quote..."
            />
          </div>

          {/* Historical Context */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Historical Context
              </label>
              <button
                type="button"
                onClick={() => {
                  if (streamingContextField === "historicalContext") {
                    handleStopContextStream()
                  } else {
                    void handleStreamContext("historicalContext")
                  }
                }}
                disabled={!form.content.trim() || (isStreamingContext && streamingContextField !== "historicalContext")}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition cursor-pointer disabled:opacity-50 ${
                  streamingContextField === "historicalContext"
                    ? "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
                    : "border-violet-200 bg-violet-50/70 text-violet-800 hover:bg-violet-100"
                }`}
                title="Stream historical context"
              >
                {streamingContextField === "historicalContext" ? "⏹ Stop" : "⚡ Suggest"}
              </button>
            </div>
            <textarea
              className={`w-full min-h-[130px] rounded-xl border p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none transition-all leading-relaxed ${
                streamingContextField === "historicalContext"
                  ? "border-violet-500 ring-2 ring-violet-200 bg-violet-50/20"
                  : "border-stone-300 bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
              }`}
              value={form.historicalContext}
              onChange={(e) => updateForm("historicalContext", e.target.value)}
              placeholder="Background, era, audience, event, speech circumstance, or treaty..."
            />
          </div>

          {/* Modern Relevance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Modern Relevance
              </label>
              <button
                type="button"
                onClick={() => {
                  if (streamingContextField === "modernRelevance") {
                    handleStopContextStream()
                  } else {
                    void handleStreamContext("modernRelevance")
                  }
                }}
                disabled={!form.content.trim() || (isStreamingContext && streamingContextField !== "modernRelevance")}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition cursor-pointer disabled:opacity-50 ${
                  streamingContextField === "modernRelevance"
                    ? "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
                    : "border-violet-200 bg-violet-50/70 text-violet-800 hover:bg-violet-100"
                }`}
                title="Stream modern relevance"
              >
                {streamingContextField === "modernRelevance" ? "⏹ Stop" : "⚡ Suggest"}
              </button>
            </div>
            <textarea
              className={`w-full min-h-[130px] rounded-xl border p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none transition-all leading-relaxed ${
                streamingContextField === "modernRelevance"
                  ? "border-violet-500 ring-2 ring-violet-200 bg-violet-50/20"
                  : "border-stone-300 bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
              }`}
              value={form.modernRelevance}
              onChange={(e) => updateForm("modernRelevance", e.target.value)}
              placeholder="Why this timeless wisdom remains impactful today..."
            />
          </div>
        </div>
      </section>
    </div>
  )
}
