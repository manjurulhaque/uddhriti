import * as React from "react"
import { QuoteEditorFormState, ATTRIBUTION_STATUSES } from "./types"

interface QuoteAttributionSectionProps {
  form: QuoteEditorFormState
  updateForm: <K extends keyof QuoteEditorFormState>(key: K, value: QuoteEditorFormState[K]) => void
  derivedVerificationConfidence: string
  derivedAdminSortKey: string
}

export function QuoteAttributionSection({
  form,
  updateForm,
  derivedVerificationConfidence,
  derivedAdminSortKey,
}: QuoteAttributionSectionProps) {
  return (
    <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
      <div className="border-b border-stone-100 pb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
          Publication, Attribution &amp; Verification
        </h2>
        <p className="text-xs text-stone-500">
          Verify literary authenticity, configure curated featuring, and manage schedule timestamps.
        </p>
      </div>

      {/* Featured & Verified Toggles */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label
          className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
            form.isFeatured
              ? "border-[var(--accent-gold)] bg-amber-50/40 text-stone-900"
              : "border-stone-200 bg-white hover:bg-stone-50/50"
          }`}
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
            checked={form.isFeatured}
            onChange={(e) => updateForm("isFeatured", e.target.checked)}
          />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-900 block">
              Featured Quotation
            </span>
            <span className="text-[11px] text-stone-500 block">
              Elevates this quote on the public home hero and trending sections
            </span>
          </div>
        </label>

        <label
          className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
            form.isVerified
              ? "border-emerald-300 bg-emerald-50/40 text-stone-900"
              : "border-stone-200 bg-white hover:bg-stone-50/50"
          }`}
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
            checked={form.isVerified}
            onChange={(e) => updateForm("isVerified", e.target.checked)}
          />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-900 block">
              Verified Authenticity
            </span>
            <span className="text-[11px] text-stone-500 block">
              Indicates scholarly source cross-check or primary citation
            </span>
          </div>
        </label>
      </div>

      {/* Attribution Status & Derived Confidence */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
            Attribution Status
          </label>
          <select
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all font-medium"
            value={form.attributionStatus}
            onChange={(e) =>
              updateForm(
                "attributionStatus",
                e.target.value as (typeof ATTRIBUTION_STATUSES)[number]
              )
            }
          >
            {ATTRIBUTION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
            Derived Verification Confidence
          </label>
          <div className="flex h-[38px] items-center justify-between rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 text-xs font-mono font-bold text-stone-800">
            <span>Score: {derivedVerificationConfidence}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] uppercase font-sans tracking-wider ${
                Number(derivedVerificationConfidence) >= 0.8
                  ? "bg-emerald-100 text-emerald-800"
                  : Number(derivedVerificationConfidence) >= 0.5
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {Number(derivedVerificationConfidence) >= 0.8
                ? "High Confidence"
                : Number(derivedVerificationConfidence) >= 0.5
                ? "Moderate"
                : "Low / Disputed"}
            </span>
          </div>
        </div>
      </div>

      {/* Published At & Sort Key */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
            Published Timestamp (IST)
          </label>
          <input
            type="datetime-local"
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all font-mono"
            value={form.publishedAt}
            onChange={(e) => updateForm("publishedAt", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
            Derived Admin Sort Priority Key
          </label>
          <div className="flex h-[38px] items-center justify-between rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 text-xs font-mono font-bold text-stone-800">
            <span>Priority: {derivedAdminSortKey}</span>
            <span className="text-[10px] text-stone-500 font-sans">
              Weighted by status &amp; flags
            </span>
          </div>
        </div>
      </div>

      {/* Verification Notes */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
          Verification Notes &amp; Curatorial Rationale
        </label>
        <textarea
          className="w-full min-h-[90px] rounded-xl border border-stone-300 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition-all leading-relaxed"
          value={form.verificationNote}
          onChange={(e) => updateForm("verificationNote", e.target.value)}
          placeholder="Citations, volume/page references, or justification notes..."
        />
      </div>
    </section>
  )
}
