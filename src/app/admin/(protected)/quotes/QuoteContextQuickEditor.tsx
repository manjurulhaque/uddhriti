"use client"

import React, { useState, useEffect, useId } from "react"
import Link from "next/link"
import { Button, Badge } from "@/components/ui"
import { CloseIcon } from "@/components/ui/icons"

export interface QuoteContextQuickEditorProps {
  isOpen: boolean
  onClose: () => void
  quote: {
    id: string
    content: string
    authorName: string | null
    categoryName: string | null
    meaning?: string | null
    historicalContext?: string | null
    modernRelevance?: string | null
  } | null
  onSaveSuccess: (updated: {
    id: string
    meaning: string | null
    historicalContext: string | null
    modernRelevance: string | null
    hasContext: boolean
  }) => void
}

export function QuoteContextQuickEditor({
  isOpen,
  onClose,
  quote,
  onSaveSuccess,
}: QuoteContextQuickEditorProps) {
  const [meaning, setMeaning] = useState("")
  const [historicalContext, setHistoricalContext] = useState("")
  const [modernRelevance, setModernRelevance] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [generatingField, setGeneratingField] = useState<"meaning" | "historicalContext" | "modernRelevance" | null>(null)
  const [generationProvider, setGenerationProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const meaningId = useId()
  const historyId = useId()
  const modernId = useId()

  useEffect(() => {
    if (!quote) return
    const frameId = window.requestAnimationFrame(() => {
      setMeaning(quote.meaning ?? "")
      setHistoricalContext(quote.historicalContext ?? "")
      setModernRelevance(quote.modernRelevance ?? "")
      setError(null)
      setSuccessMessage(null)
      setGenerationProvider(null)
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [quote])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isSaving) {
        onClose()
      }
    }

    if (isOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.body.style.overflow = "unset"
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, isSaving, onClose])

  if (!isOpen || !quote) return null

  const isMeaningFilled = meaning.trim().length > 0
  const isHistoricalFilled = historicalContext.trim().length > 0
  const isModernFilled = modernRelevance.trim().length > 0
  const filledCount = Number(isMeaningFilled) + Number(isHistoricalFilled) + Number(isModernFilled)

  async function handleGenerate(field?: "meaning" | "historicalContext" | "modernRelevance") {
    if (!quote) return
    if (field) {
      setGeneratingField(field)
    } else {
      setIsGeneratingAll(true)
    }
    setError(null)

    try {
      const res = await fetch("/api/admin/quotes/suggest-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          content: quote.content,
          authorName: quote.authorName,
          categoryName: quote.categoryName,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to generate context draft")
      }

      const result = await res.json()
      const draft = result.draft
      const providerName =
        result.provider === "gemini" ? "Google Gemini AI" : "Curator Knowledge Engine"

      if (field === "meaning") {
        setMeaning(draft.meaning)
      } else if (field === "historicalContext") {
        setHistoricalContext(draft.historicalContext)
      } else if (field === "modernRelevance") {
        setModernRelevance(draft.modernRelevance)
      } else {
        setMeaning(draft.meaning)
        setHistoricalContext(draft.historicalContext)
        setModernRelevance(draft.modernRelevance)
      }

      setGenerationProvider(providerName)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate suggestion")
    } finally {
      setIsGeneratingAll(false)
      setGeneratingField(null)
    }
  }

  async function handleSave() {
    if (!quote) return
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    const payload = {
      meaning: meaning.trim() || null,
      historicalContext: historicalContext.trim() || null,
      modernRelevance: modernRelevance.trim() || null,
    }

    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}/context`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to update quote context")
      }

      const hasContext = Boolean(payload.meaning || payload.historicalContext || payload.modernRelevance)

      setSuccessMessage("Quote context saved successfully!")

      onSaveSuccess({
        id: quote.id,
        meaning: payload.meaning,
        historicalContext: payload.historicalContext,
        modernRelevance: payload.modernRelevance,
        hasContext,
      })

      setTimeout(() => {
        onClose()
      }, 650)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save context")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-editor-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={() => {
          if (!isSaving) onClose()
        }}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl transform bg-white shadow-2xl transition ease-in-out duration-300 flex flex-col">
          {/* Header */}
          <div className="border-b border-stone-200 bg-stone-50/75 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral" size="xs">
                    Quick Enrich
                  </Badge>
                  <h2 id="quick-editor-title" className="text-lg font-bold tracking-tight text-stone-900">
                    Meaning & Context
                  </h2>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  Enrich philosophical interpretation, historical background, and modern relevance.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => handleGenerate()}
                  disabled={isSaving || isGeneratingAll || Boolean(generatingField)}
                  isLoading={isGeneratingAll}
                  className="border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 font-medium text-xs cursor-pointer"
                  title="Draft all 3 contextual dimensions automatically with AI"
                >
                  ✨ Auto-Draft Context
                </Button>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving || isGeneratingAll}
                  className="rounded-full p-1.5 text-stone-400 hover:bg-stone-200/70 hover:text-stone-700 transition cursor-pointer"
                  aria-label="Close drawer"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Quote Snippet Callout */}
            <div className="mt-4 rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs">
              <blockquote className="text-xs font-serif italic text-stone-800 line-clamp-3">
                “{quote.content}”
              </blockquote>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                <span className="font-semibold text-stone-900">— {quote.authorName || "Unknown Author"}</span>
                {quote.categoryName && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="text-stone-500">{quote.categoryName}</span>
                  </>
                )}
              </div>
            </div>

            {/* Dimensions Completion Status Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition ${
                    isMeaningFilled ? "bg-emerald-100 text-emerald-800" : "bg-stone-200/80 text-stone-600"
                  }`}
                >
                  {isMeaningFilled ? "✓" : "○"} Meaning
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition ${
                    isHistoricalFilled ? "bg-emerald-100 text-emerald-800" : "bg-stone-200/80 text-stone-600"
                  }`}
                >
                  {isHistoricalFilled ? "✓" : "○"} Historical
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition ${
                    isModernFilled ? "bg-emerald-100 text-emerald-800" : "bg-stone-200/80 text-stone-600"
                  }`}
                >
                  {isModernFilled ? "✓" : "○"} Modern
                </span>
              </div>

              <span
                className={`font-semibold ${
                  filledCount === 3
                    ? "text-emerald-700"
                    : filledCount > 0
                    ? "text-amber-700"
                    : "text-stone-500"
                }`}
              >
                {filledCount} of 3 dimensions populated
              </span>
            </div>
          </div>

          {/* Form Content Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-medium">
                ✓ {successMessage}
              </div>
            )}

            {generationProvider && (
              <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50/80 px-3.5 py-2.5 text-xs text-violet-900 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-sm">✨</span>
                  <span>
                    Context drafted via <strong>{generationProvider}</strong>. Review and tailor each dimension before saving.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setGenerationProvider(null)}
                  className="text-violet-500 hover:text-violet-800 cursor-pointer font-bold text-xs ml-2"
                  title="Dismiss notice"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Dimension 1: Meaning & Interpretation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={meaningId} className="text-sm font-bold text-stone-900">
                  Meaning & Interpretation
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerate("meaning")}
                    disabled={isSaving || isGeneratingAll || Boolean(generatingField)}
                    className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50/70 px-2 py-0.5 text-[11px] font-medium text-violet-800 hover:bg-violet-100 transition cursor-pointer disabled:opacity-50"
                    title="Draft meaning & interpretation"
                  >
                    {generatingField === "meaning" ? "Drafting..." : "✨ Suggest"}
                  </button>
                  <span className="text-[11px] text-stone-400">
                    {meaning.length} / 5,000
                  </span>
                  {meaning.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMeaning("")}
                      className="text-[11px] text-stone-500 hover:text-stone-900 underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-stone-500">
                Explain the deeper philosophical essence, symbolism, and moral message of this quote.
              </p>
              <textarea
                id={meaningId}
                rows={4}
                maxLength={5000}
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="e.g. This quote reflects the stoic discipline of distinguishing between what is within our control and what is not, urging inner tranquility..."
                className="w-full rounded-xl border border-stone-200 p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-hidden focus:ring-1 focus:ring-stone-400"
              />
            </div>

            {/* Dimension 2: Historical Context */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={historyId} className="text-sm font-bold text-stone-900">
                  Historical Context
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerate("historicalContext")}
                    disabled={isSaving || isGeneratingAll || Boolean(generatingField)}
                    className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50/70 px-2 py-0.5 text-[11px] font-medium text-violet-800 hover:bg-violet-100 transition cursor-pointer disabled:opacity-50"
                    title="Draft historical context"
                  >
                    {generatingField === "historicalContext" ? "Drafting..." : "✨ Suggest"}
                  </button>
                  <span className="text-[11px] text-stone-400">
                    {historicalContext.length} / 5,000
                  </span>
                  {historicalContext.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setHistoricalContext("")}
                      className="text-[11px] text-stone-500 hover:text-stone-900 underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-stone-500">
                Contextualize the time period, historical circumstances, author&apos;s life situation, or publication origin.
              </p>
              <textarea
                id={historyId}
                rows={4}
                maxLength={5000}
                value={historicalContext}
                onChange={(e) => setHistoricalContext(e.target.value)}
                placeholder="e.g. Written during the emperor's military campaign along the northern frontier in 170-180 AD as personal private journals..."
                className="w-full rounded-xl border border-stone-200 p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-hidden focus:ring-1 focus:ring-stone-400"
              />
            </div>

            {/* Dimension 3: Modern Relevance */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={modernId} className="text-sm font-bold text-stone-900">
                  Modern Relevance
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerate("modernRelevance")}
                    disabled={isSaving || isGeneratingAll || Boolean(generatingField)}
                    className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50/70 px-2 py-0.5 text-[11px] font-medium text-violet-800 hover:bg-violet-100 transition cursor-pointer disabled:opacity-50"
                    title="Draft modern relevance"
                  >
                    {generatingField === "modernRelevance" ? "Drafting..." : "✨ Suggest"}
                  </button>
                  <span className="text-[11px] text-stone-400">
                    {modernRelevance.length} / 5,000
                  </span>
                  {modernRelevance.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setModernRelevance("")}
                      className="text-[11px] text-stone-500 hover:text-stone-900 underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-stone-500">
                How does this wisdom apply to contemporary everyday life, professional leadership, relationships, or mental health?
              </p>
              <textarea
                id={modernId}
                rows={4}
                maxLength={5000}
                value={modernRelevance}
                onChange={(e) => setModernRelevance(e.target.value)}
                placeholder="e.g. In today's hyper-connected, high-distraction world, this principle serves as a cognitive anchor against information overload and social anxiety..."
                className="w-full rounded-xl border border-stone-200 p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-hidden focus:ring-1 focus:ring-stone-400"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-stone-200 bg-stone-50/75 px-6 py-4 flex items-center justify-between gap-3">
            <Link
              href={`/admin/quotes/${quote.id}`}
              className="text-xs font-semibold text-stone-600 hover:text-stone-950 underline transition"
            >
              Open full quote editor &rarr;
            </Link>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={isSaving}
              >
                Save Context
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

