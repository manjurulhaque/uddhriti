import * as React from "react"
import { Author, Category, Source, QuoteEditorFormState, STATUSES } from "./types"
import { AIAuthorSelect } from "./AIAuthorSelect"
import { AISourceFinder } from "./AISourceFinder"

interface QuoteMetadataSectionProps {
  form: QuoteEditorFormState
  updateForm: <K extends keyof QuoteEditorFormState>(key: K, value: QuoteEditorFormState[K]) => void
  categories: Category[]
  filteredAuthors: Author[]
  filteredSources: Source[]
  authors?: Author[]
  sources?: Source[]
  authorName?: string
}

export function QuoteMetadataSection({
  form,
  updateForm,
  categories,
  filteredAuthors,
  filteredSources,
  authors,
  sources,
  authorName,
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

      {/* Literary Source & Primary Locator Section */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs">
        <AISourceFinder
          sources={sources && sources.length > 0 ? sources : filteredSources}
          selectedSourceId={form.sourceId}
          sourceTitle={form.sourceTitle}
          sourceType={form.sourceType}
          onSelectSource={(sourceId) => updateForm("sourceId", sourceId)}
          onUpdateSourceTitle={(title) => updateForm("sourceTitle", title)}
          onUpdateSourceType={(type) => updateForm("sourceType", type)}
          onUpdateVerificationNote={(note) => updateForm("verificationNote", note)}
          currentVerificationNote={form.verificationNote}
          quoteContent={form.content}
          authorName={authorName}
          authorId={form.authorId}
          categoryName={categories.find((c) => c.id === form.categoryId)?.name}
        />
      </section>
    </div>
  )
}
