import * as React from "react"
import { Tag, QuoteEditorFormState, QuoteEditorMode } from "./types"
import { SuggestedTag } from "@/lib/tagSuggestions"

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
}: QuoteTagsSectionProps) {
  return (
    <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
              Thematic Tags
            </h2>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-mono text-stone-600">
              {form.tagIds.length} / 7
            </span>
          </div>
          <p className="text-xs text-stone-500">
            Categorize by theme, mood, philosophy, literary era, or usage context.
          </p>
        </div>

        {suggestedTags.length > 0 ? (
          <button
            type="button"
            onClick={addSuggestedTags}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-900/15 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-800 hover:bg-stone-900 hover:text-white transition-all"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add All Suggestions ({suggestedTags.length})
          </button>
        ) : null}
      </div>

      {/* Suggested Tags Area */}
      {suggestedTags.length > 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/60 p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[var(--accent-rust)] animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
              Suggested from quotation content
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
                  className={`group flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-left text-xs transition-all ${
                    selected
                      ? "border-stone-900 bg-stone-900 text-white shadow-2xs"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50"
                  }`}
                >
                  <span className="font-semibold">{tag.name}</span>
                  <span
                    className={`text-[10px] uppercase font-mono ${
                      selected ? "text-stone-300" : "text-stone-400"
                    }`}
                  >
                    {tag.type}
                  </span>
                  {selected ? (
                    <span className="text-[10px] ml-1">✓</span>
                  ) : (
                    <span className="text-[10px] opacity-60 ml-0.5">+</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-stone-400 italic">
          Suggested tags will automatically appear here as you {mode === "create" ? "type" : "edit"} quotation content.
        </p>
      )}

      {/* Tag Search Filter */}
      <input
        type="text"
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
        value={tagSearch}
        onChange={(e) => setTagSearch(e.target.value)}
        placeholder="Filter taxonomy tags by keyword or classification type..."
      />

      {/* Selected Tags Display */}
      <div className="rounded-xl border border-stone-200/80 bg-stone-50/30 p-3 min-h-[46px]">
        {selectedTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-white shadow-2xs hover:bg-red-700 transition-colors group"
                title="Click to remove tag"
              >
                <span>{tag.name}</span>
                <span className="text-[10px] font-mono text-stone-300 group-hover:text-white uppercase">
                  {tag.type}
                </span>
                <span className="text-stone-400 group-hover:text-white text-xs">✕</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-400 py-1">No tags selected yet. Pick from catalog below or accept suggestions.</p>
        )}
      </div>

      {/* Grouped Catalog Tags */}
      <div className="max-h-72 overflow-y-auto rounded-xl border border-stone-200/90 bg-white p-4 space-y-4">
        {groupedFilteredTags.length > 0 ? (
          groupedFilteredTags.map((group) => (
            <div key={group.type} className="space-y-2">
              <div className="sticky top-0 bg-white/95 backdrop-blur-xs py-0.5 text-[11px] font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100">
                {group.type}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {group.tags.map((tag) => {
                  const selected = form.tagIds.includes(tag.id)
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`rounded-lg border px-2.5 py-1 text-xs transition-all ${
                        selected
                          ? "border-stone-900 bg-stone-900 text-white font-medium shadow-2xs"
                          : "border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50"
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
          <p className="text-xs text-stone-400 py-2">No tags in catalog match &ldquo;{tagSearch}&rdquo;</p>
        )}
      </div>
    </section>
  )
}
