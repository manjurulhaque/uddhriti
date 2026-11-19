"use client"

import React, { useState } from "react"
import { Button, Badge } from "@/components/ui"
import { CloseIcon, CheckIcon } from "@/components/ui/icons"
import type { BioTone, BioLength, BioPerspective } from "@/lib/authors/bio-generator"

export interface BatchBioGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  authorIds: string[]
  authors: Array<{ id: string; name: string; hasBio?: boolean }>
  onComplete?: () => void
}

export function BatchBioGeneratorModal({
  isOpen,
  onClose,
  authorIds,
  authors,
  onComplete,
}: BatchBioGeneratorModalProps) {
  if (!isOpen) return null

  return (
    <BatchBioModalInner
      onClose={onClose}
      authorIds={authorIds}
      authors={authors}
      onComplete={onComplete}
    />
  )
}

function BatchBioModalInner({
  onClose,
  authorIds,
  authors,
  onComplete,
}: Omit<BatchBioGeneratorModalProps, "isOpen">) {
  const [tone, setTone] = useState<BioTone>("humanized")
  const [perspective, setPerspective] = useState<BioPerspective>("literary")
  const [length, setLength] = useState<BioLength>("balanced")
  const [onlyMissing, setOnlyMissing] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number; currentName?: string }>({
    current: 0,
    total: 0,
  })
  const [results, setResults] = useState<
    Array<{ id: string; name: string; success: boolean; wordCount?: number; error?: string }>
  >([])
  const [error, setError] = useState<string | null>(null)

  const selectedAuthors = authors.filter((a) => authorIds.includes(a.id))
  const targetAuthors = onlyMissing
    ? selectedAuthors.filter((a) => !a.hasBio)
    : selectedAuthors

  async function handleStartBatch() {
    if (targetAuthors.length === 0) return

    setIsProcessing(true)
    setError(null)
    setResults([])
    setProgress({ current: 0, total: targetAuthors.length })

    try {
      const res = await fetch("/api/admin/authors/bulk-generate-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorIds: targetAuthors.map((a) => a.id),
          tone,
          perspective,
          length,
          onlyMissing,
          limit: 50,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || "Batch generation failed")
      }

      const updated = Array.isArray(data.updatedAuthors) ? data.updatedAuthors : []
      const errList = Array.isArray(data.errors) ? data.errors : []

      const combinedResults = targetAuthors.map((author) => {
        const matchSuccess = updated.find((u: { id: string }) => u.id === author.id)
        const matchError = errList.find((e: { id: string }) => e.id === author.id)

        if (matchSuccess) {
          return {
            id: author.id,
            name: author.name,
            success: true,
            wordCount: matchSuccess.wordCount,
          }
        }
        return {
          id: author.id,
          name: author.name,
          success: false,
          error: matchError?.error || "Skipped or failed",
        }
      })

      setResults(combinedResults)
      setProgress({ current: targetAuthors.length, total: targetAuthors.length })
      onComplete?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Batch generation encountered an error")
    } finally {
      setIsProcessing(false)
    }
  }

  const isDone = results.length > 0 && !isProcessing
  const successCount = results.filter((r) => r.success).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-bio-studio-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isProcessing) onClose()
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200/90 overflow-hidden flex flex-col max-h-[90vh] font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 bg-gradient-to-r from-stone-50 via-white to-violet-50/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h2 id="batch-bio-studio-title" className="text-base font-bold text-stone-900 tracking-tight">
                Batch AI Bio Generator
              </h2>
              <Badge variant="neutral" size="xs">
                {targetAuthors.length} {targetAuthors.length === 1 ? "Author" : "Authors"}
              </Badge>
            </div>
            <p className="text-xs text-stone-500">
              Generate humanized, SEO-optimized biographies with RAG quote grounding in batch.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-200/70 hover:text-stone-700 transition cursor-pointer"
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 font-medium">
              {error}
            </div>
          )}

          {!isProcessing && !isDone && (
            <>
              {/* Batch Configuration Form */}
              <div className="space-y-4">
                {/* Tone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Editorial Tone
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "humanized" as const, label: "Humanized (Literary)" },
                      { value: "philosophical" as const, label: "Philosophical & Deep" },
                      { value: "punchy" as const, label: "Punchy & Modern" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTone(opt.value)}
                        className={`px-3 py-2 text-xs font-medium rounded-xl border transition cursor-pointer text-center ${
                          tone === opt.value
                            ? "bg-violet-50 border-violet-500 text-violet-900 font-semibold shadow-2xs"
                            : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Perspective */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Framing Perspective
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: "literary" as const, label: "Literary Profile" },
                      { value: "crucible" as const, label: "Crucible & Origins" },
                      { value: "modern" as const, label: "Modern Relevance" },
                      { value: "paradox" as const, label: "Human Paradox" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPerspective(opt.value)}
                        className={`px-3 py-2 text-xs font-medium rounded-xl border transition cursor-pointer text-center ${
                          perspective === opt.value
                            ? "bg-amber-50 border-amber-500 text-amber-900 font-semibold shadow-2xs"
                            : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Bio Length
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "concise" as const, label: "Concise (1 Par.)" },
                      { value: "balanced" as const, label: "Balanced (2 Par.)" },
                      { value: "comprehensive" as const, label: "Comprehensive (3 Par.)" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setLength(opt.value)}
                        className={`px-3 py-2 text-xs font-medium rounded-xl border transition cursor-pointer text-center ${
                          length === opt.value
                            ? "bg-stone-900 border-stone-900 text-white font-semibold shadow-2xs"
                            : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Overwrite guard */}
                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-700 select-none">
                    <input
                      type="checkbox"
                      checked={onlyMissing}
                      onChange={(e) => setOnlyMissing(e.target.checked)}
                      className="rounded border-stone-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
                    />
                    <span>
                      Skip authors who already have a biography ({selectedAuthors.filter((a) => a.hasBio).length} existing)
                    </span>
                  </label>
                </div>

                {/* Selected Authors List Preview */}
                <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-3 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                    Queue Preview ({targetAuthors.length} authors to generate):
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {targetAuthors.map((a) => (
                      <span
                        key={a.id}
                        className="px-2 py-1 rounded-md bg-white border border-stone-200 text-xs font-medium text-stone-800 shadow-2xs"
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Processing Progress */}
          {isProcessing && (
            <div className="py-8 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-violet-100 flex items-center justify-center text-violet-600 animate-spin">
                ⏳
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-stone-900">
                  Generating Biographies...
                </h3>
                <p className="text-xs text-stone-500">
                  Grounding narratives with author quotes, notable works, and Wikipedia facts.
                </p>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden border border-stone-200">
                <div
                  className="bg-violet-600 h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${progress.total ? Math.round((progress.current / progress.total) * 100) : 10}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Completed Results Summary */}
          {isDone && (
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-1">
                <div className="text-emerald-700 font-bold text-sm">
                  Batch Generation Complete!
                </div>
                <div className="text-xs text-emerald-800">
                  Successfully generated biographies for {successCount} out of {results.length} authors.
                </div>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {results.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 bg-white text-xs"
                  >
                    <span className="font-semibold text-stone-900">{res.name}</span>
                    {res.success ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckIcon className="w-3.5 h-3.5" />
                        <span>{res.wordCount} words</span>
                      </span>
                    ) : (
                      <span className="text-rose-600 font-medium">{res.error || "Failed"}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-stone-200 bg-stone-50/80">
          {isDone ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onClose}
              className="bg-stone-900 hover:bg-black font-semibold cursor-pointer"
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleStartBatch}
                disabled={isProcessing || targetAuthors.length === 0}
                className="bg-violet-600 hover:bg-violet-700 font-semibold shadow-2xs cursor-pointer"
              >
                ⚡ Start Batch Generation ({targetAuthors.length})
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
