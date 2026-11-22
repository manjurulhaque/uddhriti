"use client"

import React, { useState, useEffect, useId } from "react"
import { Button, Badge } from "@/components/ui"
import { CloseIcon } from "@/components/ui/icons"

export interface QuoteVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  quote: {
    id: string
    content: string
    authorName: string | null
    sourceTitle?: string | null
    categoryName?: string | null
    isVerified?: boolean
    attributionStatus?: string | null
    verificationNote?: string | null
    verificationConfidence?: number | null
  } | null
  onSaveSuccess: (updated: {
    id: string
    isVerified: boolean
    attributionStatus: "CONFIRMED" | "DISPUTED" | "MISATTRIBUTED" | "UNKNOWN"
    verificationConfidence: number
    verificationNote: string | null
  }) => void
}

export function QuoteVerificationModal({
  isOpen,
  onClose,
  quote,
  onSaveSuccess,
}: QuoteVerificationModalProps) {
  const [isVerified, setIsVerified] = useState(false)
  const [attributionStatus, setAttributionStatus] = useState<
    "CONFIRMED" | "DISPUTED" | "MISATTRIBUTED" | "UNKNOWN"
  >("UNKNOWN")
  const [verificationNote, setVerificationNote] = useState("")

  // AI Verification Result State
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [generationProvider, setGenerationProvider] = useState<string | null>(null)
  const [aiAssessment, setAiAssessment] = useState<{
    attributionStatus: "CONFIRMED" | "DISPUTED" | "MISATTRIBUTED" | "UNKNOWN"
    isVerified: boolean
    confidence: number
    verificationNote: string
    primarySourceTitle?: string | null
    suggestedSourceYear?: number | null
    explanation: string
  } | null>(null)

  const noteId = useId()
  const statusSelectId = useId()

  useEffect(() => {
    if (!quote) return
    const frameId = window.requestAnimationFrame(() => {
      setIsVerified(Boolean(quote.isVerified))
      const status = (quote.attributionStatus || "UNKNOWN").toUpperCase()
      setAttributionStatus(
        ["CONFIRMED", "DISPUTED", "MISATTRIBUTED", "UNKNOWN"].includes(status)
          ? (status as "CONFIRMED" | "DISPUTED" | "MISATTRIBUTED" | "UNKNOWN")
          : "UNKNOWN"
      )
      setVerificationNote(quote.verificationNote || "")
      setError(null)
      setSuccessMessage(null)
      setGenerationProvider(null)
      setAiAssessment(null)
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [quote])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isSaving && !isAnalyzing) {
        onClose()
      }
    }

    if (isOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.body.style.overflow = "unset"
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, isSaving, isAnalyzing, onClose])

  if (!isOpen || !quote) return null

  // Compute live derived confidence based on current selections
  const computedConfidence = (() => {
    if (isVerified) {
      if (attributionStatus === "DISPUTED") return 0.65
      if (attributionStatus === "MISATTRIBUTED") return 0.05
      return 1.0
    }
    switch (attributionStatus) {
      case "CONFIRMED":
        return 0.85
      case "DISPUTED":
        return 0.35
      case "MISATTRIBUTED":
        return 0.05
      case "UNKNOWN":
      default:
        return 0.0
    }
  })()

  async function handleRunAIVerification() {
    if (!quote) return
    setIsAnalyzing(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const res = await fetch("/api/admin/quotes/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          content: quote.content,
          authorName: quote.authorName,
          sourceTitle: quote.sourceTitle,
          categoryName: quote.categoryName,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to analyze quote attribution")
      }

      const result = await res.json()
      const assessment = result.assessment
      const providerName =
        result.provider === "gemini" ? "Google Gemini AI" : "Curatorial Scholarly Knowledge Base"

      setAiAssessment(assessment)
      setGenerationProvider(providerName)

      // Auto-populate recommendation into form state
      setIsVerified(assessment.isVerified)
      setAttributionStatus(assessment.attributionStatus)
      setVerificationNote(assessment.verificationNote)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run AI verification")
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function handleSave() {
    if (!quote) return
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    const payload = {
      isVerified,
      attributionStatus,
      verificationNote: verificationNote.trim() || null,
      verificationConfidence: computedConfidence,
    }

    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}/verification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to save verification status")
      }

      const result = await res.json()
      setSuccessMessage("Verification updated successfully")

      onSaveSuccess({
        id: quote.id,
        isVerified: result.quote.isVerified,
        attributionStatus: result.quote.attributionStatus,
        verificationConfidence: Number(result.quote.verificationConfidence),
        verificationNote: result.quote.verificationNote,
      })

      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save verification")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-modal-title"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (!isSaving && !isAnalyzing) onClose()
        }}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl transform bg-white shadow-2xl transition ease-in-out duration-300 flex flex-col">
          {/* Header */}
          <div className="border-b border-stone-200 bg-stone-50/75 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral" size="xs">
                    Scholarly Fact-Check
                  </Badge>
                  <h2
                    id="verification-modal-title"
                    className="text-lg font-bold tracking-tight text-stone-900"
                  >
                    AI Quote Verification
                  </h2>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  Analyze canonical authenticity, detect misattributions, and verify primary citations.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="xs"
                  onClick={handleRunAIVerification}
                  disabled={isSaving || isAnalyzing}
                  isLoading={isAnalyzing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs cursor-pointer shadow-xs"
                  title="Run AI Fact-Check & Cross-Reference Citation"
                >
                  ✨ Run AI Verification
                </Button>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving || isAnalyzing}
                  className="rounded-full p-1.5 text-stone-400 hover:bg-stone-200/70 hover:text-stone-700 transition cursor-pointer"
                  aria-label="Close drawer"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Quote Snippet Callout */}
            <div className="mt-4 rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs">
              <blockquote className="text-xs font-serif italic text-stone-800 line-clamp-3">
                “{quote.content}”
              </blockquote>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                <span className="font-semibold text-stone-900">
                  — {quote.authorName || "Unknown Author"}
                </span>
                {quote.sourceTitle && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="italic text-stone-600">{quote.sourceTitle}</span>
                  </>
                )}
                {quote.categoryName && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="text-stone-500">{quote.categoryName}</span>
                  </>
                )}
              </div>
            </div>

            {/* Current State Badges */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    isVerified
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {isVerified ? "✓ Verified Authenticity" : "○ Unverified"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    attributionStatus === "CONFIRMED"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : attributionStatus === "DISPUTED"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : attributionStatus === "MISATTRIBUTED"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-stone-100 text-stone-600 border border-stone-200"
                  }`}
                >
                  Status: {attributionStatus}
                </span>
              </div>

              <span className="font-mono text-[11px] text-stone-500">
                Confidence: {Math.round(computedConfidence * 100)}%
              </span>
            </div>
          </div>

          {/* Form Content Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-medium">
                ✓ {successMessage}
              </div>
            )}

            {/* AI Assessment Result Card */}
            {aiAssessment && (
              <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 p-4 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">
                      ✨
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                      AI Fact-Check Findings
                    </span>
                  </div>
                  {generationProvider && (
                    <span className="rounded-full bg-indigo-100/90 px-2.5 py-0.5 text-[10px] font-medium text-indigo-800">
                      {generationProvider}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-stone-200 bg-white p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      Recommended Attribution
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          aiAssessment.attributionStatus === "CONFIRMED"
                            ? "bg-emerald-500"
                            : aiAssessment.attributionStatus === "DISPUTED"
                            ? "bg-amber-500"
                            : aiAssessment.attributionStatus === "MISATTRIBUTED"
                            ? "bg-rose-500"
                            : "bg-stone-400"
                        }`}
                      />
                      <span className="text-xs font-bold text-stone-900">
                        {aiAssessment.attributionStatus}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-stone-200 bg-white p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      Authenticity Confidence
                    </span>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900 font-mono">
                        {Math.round(aiAssessment.confidence * 100)}%
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider ${
                          aiAssessment.confidence >= 0.8
                            ? "text-emerald-700"
                            : aiAssessment.confidence >= 0.4
                            ? "text-amber-700"
                            : "text-rose-700"
                        }`}
                      >
                        {aiAssessment.confidence >= 0.8
                          ? "High"
                          : aiAssessment.confidence >= 0.4
                          ? "Moderate"
                          : "Low / Apocryphal"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Source Suggestion if detected */}
                {aiAssessment.primarySourceTitle && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-950">
                    <span className="font-bold text-[11px] block text-indigo-900">
                      Identified Primary Source:
                    </span>
                    <span className="font-medium">
                      “{aiAssessment.primarySourceTitle}”
                      {aiAssessment.suggestedSourceYear && ` (${aiAssessment.suggestedSourceYear})`}
                    </span>
                  </div>
                )}

                {/* Scholarly Explanation */}
                <div className="text-xs text-stone-700 leading-relaxed bg-white/80 rounded-xl p-3 border border-stone-200/80">
                  <span className="font-bold text-stone-900 block mb-1">Curatorial Rationale:</span>
                  <p>{aiAssessment.explanation}</p>
                </div>
              </div>
            )}

            {/* Human-in-the-Loop Verification Review & Controls */}
            <div className="space-y-4">
              <div className="border-b border-stone-200 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                  Curatorial Verification Configuration
                </h3>
                <p className="text-[11px] text-stone-500">
                  Review or adjust the verified flag, attribution status, and publication citations before saving.
                </p>
              </div>

              {/* Verified Authenticity Toggle */}
              <label
                className={`flex items-center gap-3.5 rounded-xl border p-3.5 cursor-pointer transition ${
                  isVerified
                    ? "border-emerald-300 bg-emerald-50/50 text-stone-900"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                />
                <div>
                  <span className="text-xs font-bold text-stone-900 block">
                    Mark as Verified Authenticity
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    Confirms that this quotation has been authenticated against primary literary texts.
                  </span>
                </div>
              </label>

              {/* Attribution Status Dropdown */}
              <div className="space-y-1.5">
                <label
                  htmlFor={statusSelectId}
                  className="text-xs font-bold uppercase tracking-wider text-stone-700"
                >
                  Attribution Status
                </label>
                <select
                  id={statusSelectId}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition font-medium"
                  value={attributionStatus}
                  onChange={(e) =>
                    setAttributionStatus(
                      e.target.value as "CONFIRMED" | "DISPUTED" | "MISATTRIBUTED" | "UNKNOWN"
                    )
                  }
                >
                  <option value="CONFIRMED">CONFIRMED — Authentic verbatim or accepted standard translation</option>
                  <option value="DISPUTED">DISPUTED — Debated by scholars; lacks verified contemporary source</option>
                  <option value="MISATTRIBUTED">MISATTRIBUTED — Apocryphal or falsely attributed to this author</option>
                  <option value="UNKNOWN">UNKNOWN — Unverified oral tradition or unconfirmed provenance</option>
                </select>
              </div>

              {/* Verification Notes & Citations */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor={noteId} className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Verification Notes & Primary Citation
                  </label>
                  <span className="text-[11px] text-stone-400">
                    {verificationNote.length}/2000
                  </span>
                </div>
                <textarea
                  id={noteId}
                  className="w-full min-h-[110px] rounded-xl border border-stone-300 bg-white p-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition leading-relaxed font-sans"
                  value={verificationNote}
                  onChange={(e) => setVerificationNote(e.target.value)}
                  placeholder="e.g., Meditations, Book IV, Section 3. Translated by George Long. Confirmed against primary Greek text..."
                />
              </div>

              {/* Derived Confidence Summary */}
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
                    Calculated Confidence Score
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Based on verified authenticity flag &amp; attribution status
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-stone-900">
                    {computedConfidence.toFixed(2)} ({Math.round(computedConfidence * 100)}%)
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider ${
                      computedConfidence >= 0.8
                        ? "bg-emerald-100 text-emerald-800"
                        : computedConfidence >= 0.5
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {computedConfidence >= 0.8
                      ? "High"
                      : computedConfidence >= 0.5
                      ? "Moderate"
                      : "Low"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-stone-200 bg-stone-50/80 px-6 py-4 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving || isAnalyzing}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isAnalyzing}
              isLoading={isSaving}
              className="bg-stone-900 text-white hover:bg-stone-800 shadow-xs"
            >
              Save &amp; Apply Verification
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

