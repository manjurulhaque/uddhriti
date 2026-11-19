"use client"

import React, { useState, useEffect, useId, useRef } from "react"
import Link from "next/link"
import { Button, Badge } from "@/components/ui"
import { CloseIcon } from "@/components/ui/icons"
import {
  extractSeoGoldenSnippet,
  detectBannedContextCliches,
  sanitizeHumanContextText,
} from "@/lib/quotes/context-generator"

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
  const [streamingField, setStreamingField] = useState<"meaning" | "historicalContext" | "modernRelevance" | null>(null)
  const [generationProvider, setGenerationProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

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
      setStreamingField(null)
      setGeneratingField(null)
      setIsGeneratingAll(false)
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [quote])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isSaving) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
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

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  if (!isOpen || !quote) return null

  const isMeaningFilled = meaning.trim().length > 0
  const isHistoricalFilled = historicalContext.trim().length > 0
  const isModernFilled = modernRelevance.trim().length > 0
  const filledCount = Number(isMeaningFilled) + Number(isHistoricalFilled) + Number(isModernFilled)

  const meaningSeoSnippet = meaning.trim() ? extractSeoGoldenSnippet(meaning) : ""
  const detectedCliches = [
    ...detectBannedContextCliches(meaning),
    ...detectBannedContextCliches(historicalContext),
    ...detectBannedContextCliches(modernRelevance),
  ].filter((val, idx, arr) => arr.indexOf(val) === idx)

  function handleStopStreaming() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsGeneratingAll(false)
    setGeneratingField(null)
    setStreamingField(null)
  }

  async function handleGenerate(field?: "meaning" | "historicalContext" | "modernRelevance") {
    if (!quote) return

    setError(null)
    setSuccessMessage(null)

    if (field) {
      setGeneratingField(field)
      setStreamingField(field)
      if (field === "meaning") setMeaning("")
      if (field === "historicalContext") setHistoricalContext("")
      if (field === "modernRelevance") setModernRelevance("")
    } else {
      setIsGeneratingAll(true)
      setStreamingField("meaning")
      setMeaning("")
      setHistoricalContext("")
      setModernRelevance("")
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const res = await fetch("/api/admin/quotes/suggest-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          quoteId: quote.id,
          content: quote.content,
          authorName: quote.authorName,
          categoryName: quote.categoryName,
          stream: true,
          targetField: field,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to generate context draft")
      }

      if (!res.body) {
        throw new Error("No response body received for streaming")
      }

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

              if (currentEvent === "start") {
                const pName =
                  data.provider === "gemini"
                    ? "Google Gemini AI (Streaming)"
                    : "Curator Knowledge Engine (Streaming)"
                setGenerationProvider(pName)
              } else if (currentEvent === "delta") {
                setStreamingField(data.field)
                if (data.field === "meaning") {
                  setMeaning((prev) => prev + data.text)
                } else if (data.field === "historicalContext") {
                  setHistoricalContext((prev) => prev + data.text)
                } else if (data.field === "modernRelevance") {
                  setModernRelevance((prev) => prev + data.text)
                }
              } else if (currentEvent === "complete") {
                if (data.field === "meaning") setMeaning(data.fullText)
                if (data.field === "historicalContext") setHistoricalContext(data.fullText)
                if (data.field === "modernRelevance") setModernRelevance(data.fullText)
              } else if (currentEvent === "done") {
                if (data.draft) {
                  if (data.draft.meaning) setMeaning(data.draft.meaning)
                  if (data.draft.historicalContext) setHistoricalContext(data.draft.historicalContext)
                  if (data.draft.modernRelevance) setModernRelevance(data.draft.modernRelevance)
                }
                const pName =
                  data.provider === "gemini" ? "Google Gemini AI" : "Curator Knowledge Engine"
                setGenerationProvider(pName)
              } else if (currentEvent === "error") {
                setError(data.message || "Streaming error encountered")
              }
            } catch {
              // Ignore non-json lines
            }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Failed to generate suggestion")
      }
    } finally {
      setIsGeneratingAll(false)
      setGeneratingField(null)
      setStreamingField(null)
      abortControllerRef.current = null
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
                {isGeneratingAll || Boolean(generatingField) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleStopStreaming}
                    className="border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 font-medium text-xs cursor-pointer"
                    title="Stop real-time streaming"
                  >
                    ⏹ Stop Stream
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => void handleGenerate()}
                    disabled={isSaving}
                    className="border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 font-medium text-xs cursor-pointer"
                    title="Stream all 3 contextual dimensions in real-time with AI"
                  >
                    ⚡ Auto-Draft Context
                  </Button>
                )}

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

            {detectedCliches.length > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/90 px-3.5 py-2.5 text-xs text-amber-900 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚠️</span>
                  <span>
                    Robotic phrasing detected:{" "}
                    <strong className="underline">{detectedCliches.slice(0, 3).map((c) => `"${c}"`).join(", ")}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMeaning((prev) => sanitizeHumanContextText(prev))
                    setHistoricalContext((prev) => sanitizeHumanContextText(prev))
                    setModernRelevance((prev) => sanitizeHumanContextText(prev))
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 transition cursor-pointer"
                  title="Clean and humanize context text"
                >
                  ✨ Humanize Text
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
                    onClick={() => {
                      if (generatingField === "meaning") {
                        handleStopStreaming()
                      } else {
                        void handleGenerate("meaning")
                      }
                    }}
                    disabled={isSaving || isGeneratingAll || (Boolean(generatingField) && generatingField !== "meaning")}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition cursor-pointer disabled:opacity-50 ${
                      generatingField === "meaning"
                        ? "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
                        : "border-violet-200 bg-violet-50/70 text-violet-800 hover:bg-violet-100"
                    }`}
                    title="Stream meaning & interpretation in real-time"
                  >
                    {generatingField === "meaning" ? "⏹ Stop" : "⚡ Suggest"}
                  </button>
                  <span className="text-[11px] text-stone-400">
                    {meaning.length} / 5,000
                  </span>
                  {meaning.length > 0 && !generatingField && !isGeneratingAll && (
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
                className={`w-full rounded-xl border p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden transition-all duration-200 ${
                  streamingField === "meaning"
                    ? "border-violet-500 ring-2 ring-violet-200 bg-violet-50/20"
                    : "border-stone-200 focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                }`}
              />
              {streamingField === "meaning" && (
                <div className="flex items-center gap-1.5 text-[11px] text-violet-700 font-semibold animate-pulse pt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-600 animate-ping" />
                  <span>Streaming interpretation in real-time...</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 text-[11px]">
                {meaningSeoSnippet ? (
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        meaningSeoSnippet.length <= 160 ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {meaningSeoSnippet.length <= 160 ? "✓ Optimal SEO Snippet:" : "⚠ Long SEO Snippet:"}
                    </span>
                    <span className="text-stone-600 font-mono">
                      {meaningSeoSnippet.length} / 160 chars
                    </span>
                    <span className="text-stone-400 hidden sm:inline">
                      (Sentence 1 powers Google Featured Snippets)
                    </span>
                  </div>
                ) : (
                  <span className="text-stone-400">
                    SEO Intent: Sentence 1 should answer &quot;What does this quote mean?&quot; directly in under 160 characters.
                  </span>
                )}
              </div>
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
                    onClick={() => {
                      if (generatingField === "historicalContext") {
                        handleStopStreaming()
                      } else {
                        void handleGenerate("historicalContext")
                      }
                    }}
                    disabled={isSaving || isGeneratingAll || (Boolean(generatingField) && generatingField !== "historicalContext")}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition cursor-pointer disabled:opacity-50 ${
                      generatingField === "historicalContext"
                        ? "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
                        : "border-violet-200 bg-violet-50/70 text-violet-800 hover:bg-violet-100"
                    }`}
                    title="Stream historical context in real-time"
                  >
                    {generatingField === "historicalContext" ? "⏹ Stop" : "⚡ Suggest"}
                  </button>
                  <span className="text-[11px] text-stone-400">
                    {historicalContext.length} / 5,000
                  </span>
                  {historicalContext.length > 0 && !generatingField && !isGeneratingAll && (
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
                className={`w-full rounded-xl border p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden transition-all duration-200 ${
                  streamingField === "historicalContext"
                    ? "border-violet-500 ring-2 ring-violet-200 bg-violet-50/20"
                    : "border-stone-200 focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                }`}
              />
              {streamingField === "historicalContext" && (
                <div className="flex items-center gap-1.5 text-[11px] text-violet-700 font-semibold animate-pulse pt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-600 animate-ping" />
                  <span>Streaming historical context in real-time...</span>
                </div>
              )}
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
                    onClick={() => {
                      if (generatingField === "modernRelevance") {
                        handleStopStreaming()
                      } else {
                        void handleGenerate("modernRelevance")
                      }
                    }}
                    disabled={isSaving || isGeneratingAll || (Boolean(generatingField) && generatingField !== "modernRelevance")}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition cursor-pointer disabled:opacity-50 ${
                      generatingField === "modernRelevance"
                        ? "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
                        : "border-violet-200 bg-violet-50/70 text-violet-800 hover:bg-violet-100"
                    }`}
                    title="Stream modern relevance in real-time"
                  >
                    {generatingField === "modernRelevance" ? "⏹ Stop" : "⚡ Suggest"}
                  </button>
                  <span className="text-[11px] text-stone-400">
                    {modernRelevance.length} / 5,000
                  </span>
                  {modernRelevance.length > 0 && !generatingField && !isGeneratingAll && (
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
                className={`w-full rounded-xl border p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden transition-all duration-200 ${
                  streamingField === "modernRelevance"
                    ? "border-violet-500 ring-2 ring-violet-200 bg-violet-50/20"
                    : "border-stone-200 focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                }`}
              />
              {streamingField === "modernRelevance" && (
                <div className="flex items-center gap-1.5 text-[11px] text-violet-700 font-semibold animate-pulse pt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-600 animate-ping" />
                  <span>Streaming modern relevance in real-time...</span>
                </div>
              )}
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

