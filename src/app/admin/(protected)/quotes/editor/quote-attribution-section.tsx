import * as React from "react"
import { QuoteEditorFormState, ATTRIBUTION_STATUSES } from "./types"

interface QuoteAttributionSectionProps {
  form: QuoteEditorFormState
  updateForm: <K extends keyof QuoteEditorFormState>(key: K, value: QuoteEditorFormState[K]) => void
  derivedVerificationConfidence: string
  derivedAdminSortKey: string
  authorName?: string
  quoteId?: string
}

export function QuoteAttributionSection({
  form,
  updateForm,
  derivedVerificationConfidence,
  derivedAdminSortKey,
  authorName,
  quoteId,
}: QuoteAttributionSectionProps) {
  const [isVerifying, setIsVerifying] = React.useState(false)
  const [verificationError, setVerificationError] = React.useState<string | null>(null)
  const [aiReport, setAiReport] = React.useState<{
    provider: string
    attributionStatus: string
    confidence: number
    verificationNote: string
    primarySourceTitle?: string | null
    explanation: string
  } | null>(null)

  async function handleAIVerify() {
    if (!form.content.trim()) return
    setIsVerifying(true)
    setVerificationError(null)

    try {
      const res = await fetch("/api/admin/quotes/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId,
          content: form.content,
          authorName,
          sourceTitle: form.sourceTitle,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Verification analysis failed")
      }

      const result = await res.json()
      const assessment = result.assessment
      const provider =
        result.provider === "gemini" ? "Google Gemini AI" : "Curatorial Scholarly Knowledge Base"

      // Automatically apply recommendations to form
      updateForm("isVerified", assessment.isVerified)
      updateForm(
        "attributionStatus",
        assessment.attributionStatus as (typeof ATTRIBUTION_STATUSES)[number]
      )
      updateForm("verificationNote", assessment.verificationNote)

      setAiReport({
        provider,
        attributionStatus: assessment.attributionStatus,
        confidence: assessment.confidence,
        verificationNote: assessment.verificationNote,
        primarySourceTitle: assessment.primarySourceTitle,
        explanation: assessment.explanation,
      })
    } catch (err: unknown) {
      setVerificationError(err instanceof Error ? err.message : "Failed to run AI verification")
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <section className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
            Publication, Attribution &amp; Verification
          </h2>
          <p className="text-xs text-stone-500">
            Verify literary authenticity, configure curated featuring, and manage schedule timestamps.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAIVerify}
          disabled={isVerifying || !form.content.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer disabled:opacity-50 shadow-2xs"
          title="Run AI literary fact-check and primary source verification"
        >
          {isVerifying ? (
            <>
              <span className="animate-spin text-xs">⟳</span>
              <span>Fact-checking...</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>AI Verify Attribution</span>
            </>
          )}
        </button>
      </div>

      {verificationError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {verificationError}
        </div>
      )}

      {/* AI Assessment Result Banner */}
      {aiReport && (
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
              <span>✨</span> AI Authenticity Verification ({aiReport.provider})
            </span>
            <button
              type="button"
              onClick={() => setAiReport(null)}
              className="text-stone-400 hover:text-stone-700 font-bold"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-stone-800">
              Status: <span className="text-indigo-700">{aiReport.attributionStatus}</span>
            </span>
            <span className="text-stone-300">•</span>
            <span className="font-mono text-stone-700">
              Confidence: {Math.round(aiReport.confidence * 100)}%
            </span>
            {aiReport.primarySourceTitle && (
              <>
                <span className="text-stone-300">•</span>
                <span className="text-stone-700 italic">Work: {aiReport.primarySourceTitle}</span>
              </>
            )}
          </div>
          <p className="text-stone-600 leading-relaxed pt-1">{aiReport.explanation}</p>
        </div>
      )}

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
