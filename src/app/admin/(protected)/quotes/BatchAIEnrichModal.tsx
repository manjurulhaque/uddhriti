"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import type {
  BatchEnrichOptions,
  BatchEnrichResult,
  QuoteEnrichmentItemResult,
} from "@/lib/quotes/batch-enricher"

interface BatchAIEnrichModalProps {
  isOpen: boolean
  onClose: () => void
  selectedQuoteIds: string[]
  onEnrichSuccess?: (result: BatchEnrichResult) => void
}

type QualityGapFilter = "no-context" | "no-tags" | "missing-source" | "unverified" | "draft"

export function BatchAIEnrichModal({
  isOpen,
  onClose,
  selectedQuoteIds,
  onEnrichSuccess,
}: BatchAIEnrichModalProps) {
  const [targetMode, setTargetMode] = useState<"selected" | "filter">(
    selectedQuoteIds.length > 0 ? "selected" : "filter"
  )
  const [selectedFilter, setSelectedFilter] = useState<QualityGapFilter>("no-context")
  const [filterLimit, setFilterLimit] = useState(15)

  // Options
  const [enrichContext, setEnrichContext] = useState(true)
  const [enrichTags, setEnrichTags] = useState(true)
  const [enrichSource, setEnrichSource] = useState(true)
  const [enrichVerification, setEnrichVerification] = useState(true)
  const [autoPublish, setAutoPublish] = useState(false)
  const [overwriteExisting, setOverwriteExisting] = useState(false)

  // Execution state
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BatchEnrichResult | null>(null)

  if (!isOpen) return null

  const handleStartEnrichment = async () => {
    setIsRunning(true)
    setError(null)
    setResult(null)

    const options: BatchEnrichOptions = {
      enrichContext,
      enrichTags,
      enrichSource,
      enrichVerification,
      autoPublish,
      overwriteExisting,
    }

    const payload =
      targetMode === "selected" && selectedQuoteIds.length > 0
        ? { quoteIds: selectedQuoteIds, options }
        : { filter: selectedFilter, limit: filterLimit, options }

    try {
      const res = await fetch("/api/admin/quotes/batch-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || `Batch enrichment failed (${res.status})`)
      }

      const batchResult = data as BatchEnrichResult
      setResult(batchResult)
      if (onEnrichSuccess) {
        onEnrichSuccess(batchResult)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run batch enrichment")
    } finally {
      setIsRunning(false)
    }
  }

  const handleClose = () => {
    if (isRunning) return
    setResult(null)
    setError(null)
    onClose()
  }

  // Aggregate outcome counts
  const totalMeaningsAdded =
    result?.items.filter((i) => i.changes.meaningAdded).length ?? 0
  const totalTagsAdded =
    result?.items.reduce((acc, i) => acc + (i.changes.tagsAddedCount ?? 0), 0) ?? 0
  const totalSourcesLinked =
    result?.items.filter((i) => i.changes.sourceLinkedTitle).length ?? 0
  const totalPublished =
    result?.items.filter((i) => i.changes.published).length ?? 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-enrich-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-200/80 px-6 py-4.5 bg-stone-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🪄</span>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="batch-enrich-modal-title"
                  className="text-sm font-bold uppercase tracking-wider text-stone-900"
                >
                  Batch AI Enrichment
                </h2>
                <Badge variant="warm" size="xs">
                  Gemini Flash
                </Badge>
              </div>
              <p className="text-xs text-stone-500">
                Bulk synthesize context, balanced tags, sources, and verification for existing quotes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isRunning}
            className="rounded-lg p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-30 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Section 1: Target Scope (Only shown before run or if reconfiguring) */}
          {!result && (
            <>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  1. Target Quotes Selection
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs transition-all cursor-pointer ${
                      targetMode === "selected"
                        ? "border-stone-900 bg-stone-50/80 ring-1 ring-stone-900"
                        : "border-stone-200 bg-white hover:bg-stone-50/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetMode"
                      value="selected"
                      checked={targetMode === "selected"}
                      disabled={selectedQuoteIds.length === 0}
                      onChange={() => setTargetMode("selected")}
                      className="mt-0.5 text-stone-900 focus:ring-stone-900"
                    />
                    <div>
                      <span className="font-semibold text-stone-900 block">
                        Selected Quotes ({selectedQuoteIds.length})
                      </span>
                      <span className="text-stone-500 text-[11px]">
                        {selectedQuoteIds.length > 0
                          ? "Enrich only the quotes currently checked in the table."
                          : "No quotes currently selected in the table."}
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs transition-all cursor-pointer ${
                      targetMode === "filter"
                        ? "border-stone-900 bg-stone-50/80 ring-1 ring-stone-900"
                        : "border-stone-200 bg-white hover:bg-stone-50/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetMode"
                      value="filter"
                      checked={targetMode === "filter"}
                      onChange={() => setTargetMode("filter")}
                      className="mt-0.5 text-stone-900 focus:ring-stone-900"
                    />
                    <div>
                      <span className="font-semibold text-stone-900 block">
                        Target by Quality Gap
                      </span>
                      <span className="text-stone-500 text-[11px]">
                        Find quotes in the database that are missing specific curatorial fields.
                      </span>
                    </div>
                  </label>
                </div>

                {targetMode === "filter" && (
                  <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-stone-200/90 bg-stone-50/40 p-3.5">
                    <div className="space-y-1">
                      <label
                        htmlFor="gap-filter-select"
                        className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 block"
                      >
                        Gap Filter
                      </label>
                      <select
                        id="gap-filter-select"
                        value={selectedFilter}
                        onChange={(e) => setSelectedFilter(e.target.value as QualityGapFilter)}
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-800"
                      >
                        <option value="no-context">🧠 Missing Context (Meaning is empty)</option>
                        <option value="no-tags">🏷️ Missing Tags (Zero tags linked)</option>
                        <option value="missing-source">🔍 Missing Sources (No source work linked)</option>
                        <option value="unverified">🛡️ Unverified (Not yet fact-checked)</option>
                        <option value="draft">📝 Draft Quotes (Awaiting curation)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="batch-size-range"
                          className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 block"
                        >
                          Batch Size
                        </label>
                        <span className="text-xs font-mono font-bold text-stone-700">
                          {filterLimit} quotes
                        </span>
                      </div>
                      <input
                        id="batch-size-range"
                        type="range"
                        min={5}
                        max={50}
                        step={5}
                        value={filterLimit}
                        onChange={(e) => setFilterLimit(Number(e.target.value))}
                        className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900 mt-2"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Enrichment Modules */}
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  2. Enrichment Modules
                </label>

                <div className="space-y-2">
                  <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3 bg-white hover:bg-stone-50 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={enrichContext}
                        onChange={(e) => setEnrichContext(e.target.checked)}
                        className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                      />
                      <div>
                        <span className="text-xs font-semibold text-stone-800 block">
                          🧠 Curatorial Context Synthesis
                        </span>
                        <span className="text-[11px] text-stone-500">
                          Generates concise philosophical meaning, historical context, and modern relevance.
                        </span>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3 bg-white hover:bg-stone-50 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={enrichTags}
                        onChange={(e) => setEnrichTags(e.target.checked)}
                        className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                      />
                      <div>
                        <span className="text-xs font-semibold text-stone-800 block">
                          🏷️ Smart Thematic Tagging
                        </span>
                        <span className="text-[11px] text-stone-500">
                          Links 3–5 balanced topic, virtue, and state tags from database taxonomy.
                        </span>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3 bg-white hover:bg-stone-50 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={enrichSource}
                        onChange={(e) => setEnrichSource(e.target.checked)}
                        className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                      />
                      <div>
                        <span className="text-xs font-semibold text-stone-800 block">
                          🔍 Primary Source Discovery
                        </span>
                        <span className="text-[11px] text-stone-500">
                          Discovers primary work title, work type (BOOK/SPEECH/ESSAY), and links source record.
                        </span>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-stone-200 p-3 bg-white hover:bg-stone-50 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={enrichVerification}
                        onChange={(e) => setEnrichVerification(e.target.checked)}
                        className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                      />
                      <div>
                        <span className="text-xs font-semibold text-stone-800 block">
                          🛡️ Fact-Checking &amp; Attribution Verification
                        </span>
                        <span className="text-[11px] text-stone-500">
                          Calculates attribution confidence, flags disputed quotes, and generates scholarly notes.
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Section 3: Safety & Ingestion Policies */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  3. Ingestion Policy
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2.5 rounded-xl border border-stone-200 p-3 bg-stone-50/40 text-xs font-medium text-stone-800 cursor-pointer hover:bg-stone-50">
                    <input
                      type="checkbox"
                      checked={autoPublish}
                      onChange={(e) => setAutoPublish(e.target.checked)}
                      className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                    />
                    <span>Auto-publish high-confidence drafts (≥80%)</span>
                  </label>

                  <label className="flex items-center gap-2.5 rounded-xl border border-stone-200 p-3 bg-stone-50/40 text-xs font-medium text-stone-800 cursor-pointer hover:bg-stone-50">
                    <input
                      type="checkbox"
                      checked={overwriteExisting}
                      onChange={(e) => setOverwriteExisting(e.target.checked)}
                      className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                    />
                    <span>Overwrite non-empty fields (unchecked = fill gaps only)</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Running State */}
          {isRunning && (
            <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-6 text-center space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-white animate-spin">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-stone-900">
                  Processing Batch AI Enrichment...
                </h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Gemini AI is analyzing each quotation in parallel, synthesizing curatorial context,
                  evaluating attribution, and linking taxonomy.
                </p>
              </div>

              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden max-w-sm mx-auto">
                <div className="bg-stone-900 h-full w-2/3 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Outcome / Results Display */}
          {result && (
            <div className="space-y-5">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                    Processed
                  </span>
                  <span className="text-lg font-bold text-stone-900 mt-0.5 block">
                    {result.successCount} of {result.totalProcessed}
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Meanings Added
                  </span>
                  <span className="text-lg font-bold text-emerald-700 mt-0.5 block">
                    {totalMeaningsAdded}
                  </span>
                </div>

                <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Tags Linked
                  </span>
                  <span className="text-lg font-bold text-amber-700 mt-0.5 block">
                    {totalTagsAdded}
                  </span>
                </div>

                <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-3 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                    Sources / Published
                  </span>
                  <span className="text-lg font-bold text-stone-900 mt-0.5 block">
                    {totalSourcesLinked} / {totalPublished}
                  </span>
                </div>
              </div>

              {/* Itemized Results List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Enriched Quotes ({result.items.length})
                </h4>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {result.items.map((item: QuoteEnrichmentItemResult) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-stone-200/80 bg-white p-3 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-serif italic text-xs text-stone-900 line-clamp-2">
                          &ldquo;{item.content}&rdquo;
                        </p>
                        {item.status === "success" ? (
                          <Badge variant="success" size="xs">
                            Enriched
                          </Badge>
                        ) : item.status === "skipped" ? (
                          <Badge variant="neutral" size="xs">
                            No Gaps
                          </Badge>
                        ) : (
                          <Badge variant="danger" size="xs">
                            Error
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        {item.authorName && (
                          <span className="text-stone-500 font-medium">
                            — {item.authorName}
                          </span>
                        )}

                        {item.changes.meaningAdded && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700 border border-emerald-200/60">
                            + Meaning
                          </span>
                        )}

                        {Boolean(item.changes.tagsAddedCount) && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 border border-amber-200/60">
                            + {item.changes.tagsAddedCount} Tags
                          </span>
                        )}

                        {item.changes.sourceLinkedTitle && (
                          <span className="rounded bg-stone-100 px-1.5 py-0.5 font-medium text-stone-700 border border-stone-200/60 truncate max-w-[150px]">
                            📖 {item.changes.sourceLinkedTitle}
                          </span>
                        )}

                        {item.changes.published && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">
                            Published
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between border-t border-stone-200/80 px-6 py-4 bg-stone-50/60 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={isRunning}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-700 hover:bg-stone-50 disabled:opacity-40 transition-all cursor-pointer"
          >
            {result ? "Done & Close" : "Cancel"}
          </button>

          {!result ? (
            <button
              type="button"
              disabled={
                isRunning ||
                (!enrichContext && !enrichTags && !enrichSource && !enrichVerification) ||
                (targetMode === "selected" && selectedQuoteIds.length === 0)
              }
              onClick={handleStartEnrichment}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-xs hover:bg-black disabled:opacity-40 transition-all cursor-pointer"
            >
              {isRunning ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Enriching...</span>
                </>
              ) : (
                <>
                  <span>🪄</span>
                  <span>
                    Start AI Enrichment (
                    {targetMode === "selected" ? selectedQuoteIds.length : filterLimit})
                  </span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setError(null)
              }}
              className="rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-black transition-all cursor-pointer"
            >
              Run Another Batch
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
