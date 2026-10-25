import * as React from "react"
import { QuoteEditorFormState } from "./types"

interface QuoteContentSectionProps {
  form: QuoteEditorFormState
  updateForm: <K extends keyof QuoteEditorFormState>(key: K, value: QuoteEditorFormState[K]) => void
  wordCount: number
  charCount: number
}

export function QuoteContentSection({
  form,
  updateForm,
  wordCount,
  charCount,
}: QuoteContentSectionProps) {
  return (
    <div className="space-y-6">
      {/* Primary Quote Content */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
              Quote Content
            </h2>
            <p className="text-xs text-stone-500">
              The primary text of the quotation exactly as spoken or written.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-mono text-stone-600">
              {wordCount} words
            </span>
            <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-mono text-stone-600">
              {charCount} chars
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <textarea
            className="w-full min-h-[160px] rounded-xl border border-stone-300 bg-stone-50/30 p-4 font-serif text-base text-stone-900 leading-relaxed placeholder:font-sans placeholder:text-sm placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all"
            value={form.content}
            onChange={(e) => updateForm("content", e.target.value)}
            placeholder="Type or paste the quotation text here..."
            required
            aria-label="Quote Content"
          />
        </div>
      </section>

      {/* Literary Interpretation & Context */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
            Interpretation &amp; Context
          </h2>
          <p className="text-xs text-stone-500">
            Enrich the quotation with meaning, historical provenance, and contemporary relevance.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Quote Meaning
            </label>
            <textarea
              className="w-full min-h-[130px] rounded-xl border border-stone-300 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all leading-relaxed"
              value={form.meaning}
              onChange={(e) => updateForm("meaning", e.target.value)}
              placeholder="Explain the central idea, moral lesson, or interpretation of this quote..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Historical Context
            </label>
            <textarea
              className="w-full min-h-[130px] rounded-xl border border-stone-300 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all leading-relaxed"
              value={form.historicalContext}
              onChange={(e) => updateForm("historicalContext", e.target.value)}
              placeholder="Background, era, audience, event, speech circumstance, or treaty..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Modern Relevance
            </label>
            <textarea
              className="w-full min-h-[130px] rounded-xl border border-stone-300 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all leading-relaxed"
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
