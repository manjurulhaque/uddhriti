"use client"

import * as React from "react"
import { Tag, QuoteEditorFormState, QuoteEditorMode } from "./types"
import { SuggestedTag } from "@/lib/tagSuggestions"
import {
  MAX_SELECTED_TAGS,
  MAX_TOPIC_TAGS,
  MAX_PER_OTHER_TYPE,
  validateTagDistribution,
} from "@/lib/quotes/tag-selector"

interface QuoteTagsSectionProps {
  mode: QuoteEditorMode
  form: QuoteEditorFormState
  selectedTags: Tag[]
  suggestedTags: SuggestedTag<Tag>[]
  groupedFilteredTags: Array<{ type: string; tags: Tag[] }>
  tagSearch: string
  setTagSearch: (query: string) => void
  toggleTag: (tagId: string) => void
  addSuggestedTags: () => void
  onApplyAiTags?: (tagIds: string[]) => void
  onClearAllTags?: () => void
  quoteContent?: string
  quoteMeaning?: string
  authorName?: string
  categoryName?: string
}

export function QuoteTagsSection({
  mode,
  form,
  selectedTags,
  suggestedTags,
  groupedFilteredTags,
  tagSearch,
  setTagSearch,
  toggleTag,
  addSuggestedTags,
  onApplyAiTags,
  onClearAllTags,
  quoteContent = "",
  quoteMeaning = "",
  authorName = "",
  categoryName = "",
}: QuoteTagsSectionProps) {
  const [isAiSelecting, setIsAiSelecting] = React.useState(false)
  const [aiMessage, setAiMessage] = React.useState<{
    text: string
    type: "success" | "info" | "warning"
  } | null>(null)

  // Distribution counts
  const topicCount = React.useMemo(
    () => selectedTags.filter((t) => t.type.toUpperCase() === "TOPIC").length,
    [selectedTags]
  )
  const otherCount = React.useMemo(
    () => selectedTags.filter((t) => t.type.toUpperCase() !== "TOPIC").length,
    [selectedTags]
  )
  const isPerfectBalance = topicCount === MAX_TOPIC_TAGS && selectedTags.length === MAX_SELECTED_TAGS

  // Per-category counts map
  const countsByType = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const tag of selectedTags) {
      const type = tag.type.toUpperCase()
      map.set(type, (map.get(type) || 0) + 1)
    }
    return map
  }, [selectedTags])

  // AI 7-Tag Selector trigger
  const handleAiSelectTags = async () => {
    const trimmed = quoteContent.trim()
    if (!trimmed) {
      setAiMessage({
        text: "Please enter quotation content above first.",
        type: "warning",
      })
      return
    }

    setIsAiSelecting(true)
    setAiMessage(null)

    try {
      const res = await fetch("/api/admin/quotes/suggest-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          meaning: quoteMeaning.trim() || undefined,
          authorName: authorName.trim() || undefined,
          categoryName: categoryName.trim() || undefined,
        }),
      })

      if (!res.ok) throw new Error("Tag selection failed")

      const data = await res.json()
      if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
        const tagIds = data.tags.map((t: { id: string }) => t.id)
        if (onApplyAiTags) {
          onApplyAiTags(tagIds)
        }

        const topics = data.tags
          .filter((t: { type: string }) => t.type.toUpperCase() === "TOPIC")
          .map((t: { name: string }) => t.name)
        const others = data.tags
          .filter((t: { type: string }) => t.type.toUpperCase() !== "TOPIC")
          .map((t: { name: string; type: string }) => `${t.name} (${t.type})`)

        setAiMessage({
          text: `✨ Selected 7 balanced tags! Topics: ${topics.join(", ")} • Dimensions: ${others.join(", ")}${
            data.overview ? ` — ${data.overview}` : ""
          }`,
          type: "success",
        })
      } else {
        setAiMessage({
          text: "No matching tags could be selected automatically. Pick from catalog below.",
          type: "info",
        })
      }
    } catch {
      setAiMessage({
        text: "Could not complete AI tag selection. Please select tags manually.",
        type: "warning",
      })
    } finally {
      setIsAiSelecting(false)
    }
  }

  // Tag type color badge helper
  const getTagTypeBadgeClass = (type: string, isSelected: boolean) => {
    if (isSelected) {
      return "bg-stone-900 text-white border-stone-800"
    }
    const norm = type.toUpperCase()
    switch (norm) {
      case "TOPIC":
        return "bg-amber-50 text-amber-900 border-amber-200"
      case "EMOTION":
        return "bg-rose-50 text-rose-900 border-rose-200"
      case "ACTION":
        return "bg-blue-50 text-blue-900 border-blue-200"
      case "VALUE":
        return "bg-purple-50 text-purple-900 border-purple-200"
      case "VIRTUE":
        return "bg-emerald-50 text-emerald-900 border-emerald-200"
      case "STATE":
        return "bg-cyan-50 text-cyan-900 border-cyan-200"
      case "TIME":
        return "bg-orange-50 text-orange-900 border-orange-200"
      default:
        return "bg-stone-50 text-stone-800 border-stone-200"
    }
  }

  return (
    <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Header with Title, Distribution Badges, and AI Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
              Thematic Tags
            </h2>

            {/* Total count badge */}
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold ${
                selectedTags.length >= MAX_SELECTED_TAGS
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-700"
              }`}
            >
              {selectedTags.length} / {MAX_SELECTED_TAGS} max
            </span>

            {/* Distribution metrics */}
            <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-900">
              Topic: {topicCount} / {MAX_TOPIC_TAGS}
            </span>

            <span className="rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-medium text-sky-900">
              Other categories: {otherCount} / 5
            </span>

            {isPerfectBalance && (
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                ✓ Balanced 7
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Rule: Maximum 7 tags total &bull; up to 2 Topic tags &bull; 1 tag each from other categories.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* ✨ AI 7-Tag Selector Button */}
          <button
            type="button"
            onClick={handleAiSelectTags}
            disabled={isAiSelecting || !quoteContent.trim()}
            title={
              quoteContent.trim()
                ? "Automatically select 7 balanced tags (2 Topic + 5 distinct categories) using AI"
                : "Enter quote text first to enable AI tag selection"
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shadow-2xs ${
              quoteContent.trim()
                ? "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 active:scale-95 cursor-pointer"
                : "bg-stone-50 text-stone-400 border border-stone-200 cursor-not-allowed opacity-60"
            }`}
          >
            {isAiSelecting ? (
              <>
                <svg
                  className="animate-spin h-3.5 w-3.5 text-amber-700"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Selecting 7 balanced tags...</span>
              </>
            ) : (
              <>
                <span className="text-amber-600 font-bold">✨</span>
                <span>AI Select 7 Tags</span>
              </>
            )}
          </button>

          {suggestedTags.length > 0 && (
            <button
              type="button"
              onClick={addSuggestedTags}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-all cursor-pointer"
            >
              Add Suggestions ({suggestedTags.length})
            </button>
          )}

          {selectedTags.length > 0 && onClearAllTags && (
            <button
              type="button"
              onClick={onClearAllTags}
              className="text-[11px] text-stone-500 hover:text-stone-800 underline underline-offset-2 px-1"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* AI Notification Message Banner */}
      {aiMessage && (
        <div
          className={`flex items-start justify-between p-3 rounded-xl text-xs transition-all ${
            aiMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : aiMessage.type === "warning"
              ? "bg-amber-50 text-amber-900 border border-amber-200"
              : "bg-stone-100 text-stone-800 border border-stone-200"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="shrink-0">{aiMessage.type === "success" ? "✓" : "ℹ"}</span>
            <span className="truncate">{aiMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setAiMessage(null)}
            className="text-stone-400 hover:text-stone-700 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Selected Tags Display */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600">
          <span>Active Quotation Tags ({selectedTags.length} / 7):</span>
          {selectedTags.length < MAX_SELECTED_TAGS ? (
            <span className="text-stone-400">
              {MAX_SELECTED_TAGS - selectedTags.length} slot{MAX_SELECTED_TAGS - selectedTags.length === 1 ? "" : "s"} open
            </span>
          ) : (
            <span className="text-amber-700 font-bold">Max 7 reached</span>
          )}
        </div>

        <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-3 min-h-[48px]">
          {selectedTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <button
                  type="button"
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-medium text-white shadow-2xs hover:bg-red-700 transition-colors group cursor-pointer"
                  title="Click to remove tag"
                >
                  <span className="font-semibold">{tag.name}</span>
                  <span className="text-[9px] font-mono uppercase bg-white/20 px-1 py-0.5 rounded text-stone-200 group-hover:text-white">
                    {tag.type}
                  </span>
                  <span className="text-stone-400 group-hover:text-white text-xs">✕</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400 py-1 italic">
              No tags selected yet. Click &ldquo;✨ AI Select 7 Tags&rdquo; above or pick from suggestions/catalog below.
            </p>
          )}
        </div>
      </div>

      {/* Suggested Tags Area */}
      {suggestedTags.length > 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[var(--accent-rust)] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
                Contextual Suggestions
              </span>
            </div>
            <span className="text-[10px] text-stone-500">
              Balanced: max 2 Topic, 1 per other type
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag) => {
              const selected = form.tagIds.includes(tag.id)
              return (
                <button
                  type="button"
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-left text-xs transition-all cursor-pointer ${
                    selected
                      ? "border-stone-900 bg-stone-900 text-white shadow-2xs"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50"
                  }`}
                >
                  <span className="font-semibold">{tag.name}</span>
                  <span
                    className={`text-[9px] uppercase font-mono px-1 py-0.5 rounded ${
                      selected ? "bg-white/20 text-stone-200" : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {tag.type}
                  </span>
                  {selected ? (
                    <span className="text-[10px] text-emerald-400 font-bold">✓</span>
                  ) : (
                    <span className="text-[10px] opacity-60">+</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Search Input for Catalog */}
      <div className="relative">
        <input
          type="text"
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
          placeholder="Search all 318 taxonomy tags (or type category name like 'EMOTION', 'ACTION', 'VIRTUE')..."
        />
        {tagSearch && (
          <button
            type="button"
            onClick={() => setTagSearch("")}
            className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Grouped Catalog Tags */}
      <div className="max-h-72 overflow-y-auto rounded-xl border border-stone-200/90 bg-white p-4 space-y-4">
        {groupedFilteredTags.length > 0 ? (
          groupedFilteredTags.map((group) => {
            const normType = group.type.toUpperCase()
            const currentCount = countsByType.get(normType) || 0
            const maxForThisType = normType === "TOPIC" ? MAX_TOPIC_TAGS : MAX_PER_OTHER_TYPE
            const isCategoryFull = currentCount >= maxForThisType

            return (
              <div key={group.type} className="space-y-2">
                <div className="sticky top-0 bg-white/95 backdrop-blur-xs py-1 text-[11px] font-bold uppercase tracking-wider text-stone-700 border-b border-stone-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{group.type}</span>
                    <span className="text-[10px] font-normal text-stone-400 font-mono">
                      ({group.tags.length} tags)
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                      isCategoryFull
                        ? "bg-amber-100 text-amber-900"
                        : currentCount > 0
                        ? "bg-stone-100 text-stone-700"
                        : "text-stone-400"
                    }`}
                  >
                    {currentCount} / {maxForThisType} {isCategoryFull ? "• Full" : ""}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {group.tags.map((tag) => {
                    const selected = form.tagIds.includes(tag.id)
                    return (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`rounded-lg border px-2.5 py-1 text-xs transition-all cursor-pointer ${
                          selected
                            ? "border-stone-900 bg-stone-900 text-white font-semibold shadow-2xs"
                            : isCategoryFull && !selected
                            ? "border-stone-200 bg-stone-50/60 text-stone-400 hover:border-stone-300"
                            : "border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50"
                        }`}
                        title={
                          selected
                            ? "Click to remove"
                            : isCategoryFull
                            ? `Category ${tag.type} has reached its limit (${maxForThisType}). Remove the selected ${tag.type} tag to pick this one.`
                            : tag.description || undefined
                        }
                      >
                        <span>{tag.name}</span>
                        {selected && <span className="ml-1 text-[10px] text-emerald-400 font-bold">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-xs text-stone-400 py-2">No tags in catalog match &ldquo;{tagSearch}&rdquo;</p>
        )}
      </div>
    </section>
  )
}
