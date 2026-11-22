"use client"

import { useMemo, useState } from "react"
import { computeWordDiff, type DiffPart } from "@/lib/diff"
import { Button } from "@/components/ui"
import type { Author, Category, Source, Tag, QuoteEditorFormState } from "./types"

interface QuoteDiffModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmSave: () => void
  isSaving: boolean
  initialForm: QuoteEditorFormState
  currentForm: QuoteEditorFormState
  authors: Author[]
  categories: Category[]
  sources: Source[]
  tags: Tag[]
}

type MetadataDiffItem = {
  label: string
  from: string
  to: string
}

function renderDiffParts(parts: DiffPart[], mode: "unified" | "old" | "new") {
  return parts.map((part, idx) => {
    if (mode === "old") {
      if (part.type === "added") return null
      if (part.type === "removed") {
        return (
          <mark
            key={idx}
            className="bg-rose-100/90 text-rose-900 line-through rounded px-1 py-0.5"
          >
            {part.value}
          </mark>
        )
      }
      return <span key={idx}>{part.value}</span>
    }

    if (mode === "new") {
      if (part.type === "removed") return null
      if (part.type === "added") {
        return (
          <mark
            key={idx}
            className="bg-emerald-100/90 text-emerald-950 font-medium rounded px-1 py-0.5"
          >
            {part.value}
          </mark>
        )
      }
      return <span key={idx}>{part.value}</span>
    }

    // Unified mode
    if (part.type === "added") {
      return (
        <mark
          key={idx}
          className="bg-emerald-100 text-emerald-950 font-medium rounded px-1 py-0.5 inline-block mx-0.5"
        >
          {part.value}
        </mark>
      )
    }

    if (part.type === "removed") {
      return (
        <mark
          key={idx}
          className="bg-rose-100 text-rose-900 line-through rounded px-1 py-0.5 inline-block mx-0.5 opacity-80"
        >
          {part.value}
        </mark>
      )
    }

    return <span key={idx}>{part.value}</span>
  })
}

export function QuoteDiffModal({
  isOpen,
  onClose,
  onConfirmSave,
  isSaving,
  initialForm,
  currentForm,
  authors,
  categories,
  sources,
  tags,
}: QuoteDiffModalProps) {
  const [viewStyle, setViewStyle] = useState<"unified" | "split">("unified")

  const authorById = useMemo(() => new Map(authors.map((a) => [a.id, a.name])), [authors])
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories])
  const sourceById = useMemo(() => new Map(sources.map((s) => [s.id, s.title])), [sources])
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t.name])), [tags])

  // Compute text diffs
  const contentDiff = useMemo(
    () => computeWordDiff(initialForm.content.trim(), currentForm.content.trim()),
    [initialForm.content, currentForm.content]
  )
  const isContentChanged = initialForm.content.trim() !== currentForm.content.trim()

  const meaningDiff = useMemo(
    () => computeWordDiff(initialForm.meaning.trim(), currentForm.meaning.trim()),
    [initialForm.meaning, currentForm.meaning]
  )
  const isMeaningChanged = initialForm.meaning.trim() !== currentForm.meaning.trim()

  const contextDiff = useMemo(
    () => computeWordDiff(initialForm.historicalContext.trim(), currentForm.historicalContext.trim()),
    [initialForm.historicalContext, currentForm.historicalContext]
  )
  const isContextChanged = initialForm.historicalContext.trim() !== currentForm.historicalContext.trim()

  const relevanceDiff = useMemo(
    () => computeWordDiff(initialForm.modernRelevance.trim(), currentForm.modernRelevance.trim()),
    [initialForm.modernRelevance, currentForm.modernRelevance]
  )
  const isRelevanceChanged = initialForm.modernRelevance.trim() !== currentForm.modernRelevance.trim()

  // Compute metadata diffs
  const metadataDiffs = useMemo(() => {
    const list: MetadataDiffItem[] = []

    if (initialForm.status !== currentForm.status) {
      list.push({ label: "Status", from: initialForm.status, to: currentForm.status })
    }

    if (initialForm.authorId !== currentForm.authorId) {
      list.push({
        label: "Author",
        from: authorById.get(initialForm.authorId) || "Unassigned",
        to: authorById.get(currentForm.authorId) || "Unassigned",
      })
    }

    if (initialForm.categoryId !== currentForm.categoryId) {
      list.push({
        label: "Category",
        from: categoryById.get(initialForm.categoryId) || "Unassigned",
        to: categoryById.get(currentForm.categoryId) || "Unassigned",
      })
    }

    const initialSource = sourceById.get(initialForm.sourceId) || initialForm.sourceTitle || "None"
    const currentSource = sourceById.get(currentForm.sourceId) || currentForm.sourceTitle || "None"
    if (initialSource !== currentSource) {
      list.push({ label: "Source", from: initialSource, to: currentSource })
    }

    if (initialForm.language !== currentForm.language) {
      list.push({ label: "Language", from: initialForm.language, to: currentForm.language })
    }

    if (initialForm.attributionStatus !== currentForm.attributionStatus) {
      list.push({
        label: "Attribution",
        from: initialForm.attributionStatus,
        to: currentForm.attributionStatus,
      })
    }

    if (initialForm.isVerified !== currentForm.isVerified) {
      list.push({
        label: "Verified",
        from: initialForm.isVerified ? "Verified" : "Unverified",
        to: currentForm.isVerified ? "Verified" : "Unverified",
      })
    }

    if (initialForm.isFeatured !== currentForm.isFeatured) {
      list.push({
        label: "Featured",
        from: initialForm.isFeatured ? "Featured" : "Standard",
        to: currentForm.isFeatured ? "Featured" : "Standard",
      })
    }

    return list
  }, [initialForm, currentForm, authorById, categoryById, sourceById])

  // Compute tag differences
  const addedTagNames = useMemo(() => {
    const initialSet = new Set(initialForm.tagIds)
    return currentForm.tagIds
      .filter((id) => !initialSet.has(id))
      .map((id) => tagById.get(id) || id)
  }, [initialForm.tagIds, currentForm.tagIds, tagById])

  const removedTagNames = useMemo(() => {
    const currentSet = new Set(currentForm.tagIds)
    return initialForm.tagIds
      .filter((id) => !currentSet.has(id))
      .map((id) => tagById.get(id) || id)
  }, [initialForm.tagIds, currentForm.tagIds, tagById])

  const totalModifications =
    (isContentChanged ? 1 : 0) +
    (isMeaningChanged ? 1 : 0) +
    (isContextChanged ? 1 : 0) +
    (isRelevanceChanged ? 1 : 0) +
    metadataDiffs.length +
    (addedTagNames.length > 0 ? 1 : 0) +
    (removedTagNames.length > 0 ? 1 : 0)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-6 py-4 bg-stone-50/80">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-900 tracking-tight">
                Review Changes Before Saving
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-200/80 text-stone-700">
                {totalModifications} {totalModifications === 1 ? "modification" : "modifications"}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Comparing your in-progress modifications against the saved database version.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View style toggle */}
            <div className="inline-flex rounded-xl bg-stone-200/70 p-0.5 border border-stone-300/50 text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewStyle("unified")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  viewStyle === "unified"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Unified Inline
              </button>
              <button
                type="button"
                onClick={() => setViewStyle("split")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  viewStyle === "split"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Side-by-Side
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer ml-1"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {totalModifications === 0 ? (
            <div className="py-12 text-center space-y-2">
              <span className="text-2xl">✨</span>
              <p className="text-sm font-semibold text-stone-800">No modifications detected</p>
              <p className="text-xs text-stone-500">The current editor content is identical to the saved database record.</p>
            </div>
          ) : null}

          {/* Metadata & Tag Differences Section */}
          {(metadataDiffs.length > 0 || addedTagNames.length > 0 || removedTagNames.length > 0) && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Metadata & Attributes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {metadataDiffs.map((diff, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-stone-200/90 bg-stone-50/50 p-3 space-y-1 text-xs"
                  >
                    <span className="font-semibold text-stone-500 uppercase text-[10px] tracking-wider block">
                      {diff.label}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 line-through truncate max-w-[140px]">
                        {diff.from}
                      </span>
                      <span className="text-stone-400">→</span>
                      <span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold truncate max-w-[140px]">
                        {diff.to}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Tag changes */}
                {(addedTagNames.length > 0 || removedTagNames.length > 0) && (
                  <div className="rounded-xl border border-stone-200/90 bg-stone-50/50 p-3 space-y-2 text-xs sm:col-span-2">
                    <span className="font-semibold text-stone-500 uppercase text-[10px] tracking-wider block">
                      Taxonomy & Tags
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {removedTagNames.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 line-through text-[11px]"
                        >
                          -{tag}
                        </span>
                      ))}
                      {addedTagNames.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-[11px]"
                        >
                          +{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Primary Quote Content Diff */}
          {isContentChanged && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Quote Content
                </h3>
                <span className="text-[11px] font-mono text-stone-400">Primary passage text</span>
              </div>

              {viewStyle === "unified" ? (
                <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-4 font-serif text-base text-stone-900 leading-relaxed">
                  {renderDiffParts(contentDiff, "unified")}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 font-serif text-sm leading-relaxed space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-rose-700 block">
                      Saved Version
                    </span>
                    <div>{renderDiffParts(contentDiff, "old")}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 font-serif text-sm leading-relaxed space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
                      Current Edits
                    </span>
                    <div>{renderDiffParts(contentDiff, "new")}</div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Meaning / Analysis Diff */}
          {isMeaningChanged && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Meaning & Deep Dive
                </h3>
              </div>

              {viewStyle === "unified" ? (
                <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-4 text-xs text-stone-900 leading-relaxed font-sans">
                  {renderDiffParts(meaningDiff, "unified")}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 text-xs leading-relaxed space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-rose-700 block">
                      Saved Version
                    </span>
                    <div>{renderDiffParts(meaningDiff, "old")}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 text-xs leading-relaxed space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
                      Current Edits
                    </span>
                    <div>{renderDiffParts(meaningDiff, "new")}</div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Historical Context Diff */}
          {isContextChanged && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Historical Context
                </h3>
              </div>

              {viewStyle === "unified" ? (
                <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-4 text-xs text-stone-900 leading-relaxed font-sans">
                  {renderDiffParts(contextDiff, "unified")}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 text-xs leading-relaxed space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-rose-700 block">
                      Saved Version
                    </span>
                    <div>{renderDiffParts(contextDiff, "old")}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 text-xs leading-relaxed space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
                      Current Edits
                    </span>
                    <div>{renderDiffParts(contextDiff, "new")}</div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Modern Relevance Diff */}
          {isRelevanceChanged && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Modern Relevance
                </h3>
              </div>

              {viewStyle === "unified" ? (
                <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-4 text-xs text-stone-900 leading-relaxed font-sans">
                  {renderDiffParts(relevanceDiff, "unified")}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 text-xs leading-relaxed space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-rose-700 block">
                      Saved Version
                    </span>
                    <div>{renderDiffParts(relevanceDiff, "old")}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 text-xs leading-relaxed space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
                      Current Edits
                    </span>
                    <div>{renderDiffParts(relevanceDiff, "new")}</div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-200 px-6 py-4 bg-stone-50">
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-200 border border-emerald-400" />
              Added content
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-200 border border-rose-400" />
              Removed content
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
              Keep Editing
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onConfirmSave}
              isLoading={isSaving}
              disabled={isSaving}
            >
              Confirm & Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
