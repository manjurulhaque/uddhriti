import * as React from "react"
import { Author, Category, Source, QuoteEditorFormState, STATUSES, SOURCE_TYPES } from "./types"
import { AIAuthorSelect } from "./AIAuthorSelect"

interface QuoteMetadataSectionProps {
  form: QuoteEditorFormState
  updateForm: <K extends keyof QuoteEditorFormState>(key: K, value: QuoteEditorFormState[K]) => void
  setForm: React.Dispatch<React.SetStateAction<QuoteEditorFormState>>
  categories: Category[]
  filteredAuthors: Author[]
  authorSearch: string
  setAuthorSearch: (search: string) => void
  filteredSources: Source[]
  sourceSearch: string
  setSourceSearch: (search: string) => void
  authors?: Author[]
}

export function QuoteMetadataSection({
  form,
  updateForm,
  setForm,
  categories,
  filteredAuthors,
  authorSearch,
  setAuthorSearch,
  filteredSources,
  sourceSearch,
  setSourceSearch,
  authors,
}: QuoteMetadataSectionProps) {
  return (
    <div className="space-y-6">
      {/* Basic Classification: Author, Category, Language, Status */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
            Basic Classification
          </h2>
          <p className="text-xs text-stone-500">
            Connect the quotation to its creator, primary topic, and editorial status.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* AI-Assisted Author Selection with 1-Click Identify and Smart Search */}
          <AIAuthorSelect
            authors={authors && authors.length > 0 ? authors : filteredAuthors}
            selectedAuthorId={form.authorId}
            onSelectAuthor={(id) => updateForm("authorId", id)}
            quoteContent={form.content}
            required
          />

          {/* Category Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                Category <span className="text-red-500">*</span>
              </label>
              {form.categoryId ? (
                <button
                  type="button"
                  onClick={() => updateForm("categoryId", "")}
                  className="text-[11px] text-stone-500 hover:text-stone-800 underline underline-offset-2"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <select
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
              value={form.categoryId}
              onChange={(e) => updateForm("categoryId", e.target.value)}
              required
            >
              <option value="">Select Primary Category...</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 pt-1">
          {/* Language Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
              Language Code
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all font-mono"
              value={form.language}
              onChange={(e) => updateForm("language", e.target.value)}
              placeholder="en"
            />
            <p className="text-[11px] text-stone-400">ISO code (e.g., en, es, bn, fr, de, sa)</p>
          </div>

          {/* Editorial Status */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
              Editorial Workflow Status
            </label>
            <select
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all font-medium"
              value={form.status}
              onChange={(e) => updateForm("status", e.target.value as (typeof STATUSES)[number])}
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-stone-400">Controls visibility on public portal</p>
          </div>
        </div>
      </section>

      {/* Literary Source Section */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
              Source Citation
            </h2>
            <p className="text-xs text-stone-500">
              Link this quote to an existing publication or create a new source record inline.
            </p>
          </div>
          {form.sourceId ? (
            <button
              type="button"
              onClick={() => updateForm("sourceId", "")}
              className="text-xs text-[var(--accent-rust)] hover:underline font-medium"
            >
              Clear source selection
            </button>
          ) : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Existing Source Selector */}
          <div className="space-y-2 rounded-xl border border-stone-200/80 bg-stone-50/40 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Select Existing Source
            </span>
            <input
              type="text"
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
              value={sourceSearch}
              onChange={(e) => setSourceSearch(e.target.value)}
              placeholder="Filter existing bibliography..."
            />
            <select
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
              value={form.sourceId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  sourceId: e.target.value,
                  sourceTitle: e.target.value ? "" : prev.sourceTitle,
                }))
              }
            >
              <option value="">No Source Linked</option>
              {filteredSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.title}
                </option>
              ))}
            </select>
          </div>

          {/* Inline New Source */}
          <div className="space-y-2 rounded-xl border border-stone-200/80 bg-stone-50/40 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Or Create Source Inline
            </span>
            <input
              type="text"
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all disabled:opacity-50 disabled:bg-stone-100"
              placeholder="Source title (e.g. Meditations, Republic)"
              value={form.sourceTitle}
              onChange={(e) => updateForm("sourceTitle", e.target.value)}
              disabled={Boolean(form.sourceId)}
            />
            <select
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all disabled:opacity-50 disabled:bg-stone-100 font-medium"
              value={form.sourceType}
              onChange={(e) => updateForm("sourceType", e.target.value as (typeof SOURCE_TYPES)[number])}
              disabled={Boolean(form.sourceId)}
            >
              {SOURCE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
    </div>
  )
}
