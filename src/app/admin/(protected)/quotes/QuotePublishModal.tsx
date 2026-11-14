"use client"

import React, { useState, useEffect, useId } from "react"
import { Button, Badge } from "@/components/ui"
import { CloseIcon, CheckIcon } from "@/components/ui/icons"
import { formatDateTimeLocalInAppTimeZone } from "@/lib/datetime"
import type {
  PublicationReadiness,
  SocialPostCopy,
  ScheduleRecommendation,
  CuratorialPublishingRecommendation,
} from "@/lib/quotes/publishing-engine"

export interface QuotePublishModalProps {
  isOpen: boolean
  onClose: () => void
  quote: {
    id: string
    content: string
    authorName: string | null
    sourceTitle?: string | null
    categoryName?: string | null
    tags?: Array<{ id: string; name: string; slug?: string } | { id: string; name: string; [key: string]: unknown }>
    meaning?: string | null
    historicalContext?: string | null
    modernRelevance?: string | null
    isVerified?: boolean
    attributionStatus?: string | null
    isFeatured?: boolean
    status?: string | null
    publishedAt?: string | null
  } | null
  onSaveSuccess: (updated: {
    id: string
    status: string
    publishedAt: string | null
    isFeatured: boolean
  }) => void
}

type SocialChannel = "twitter" | "linkedin" | "instagram" | "quoteOfTheDay"

export function QuotePublishModal({
  isOpen,
  onClose,
  quote,
  onSaveSuccess,
}: QuotePublishModalProps) {
  // Form State
  const [status, setStatus] = useState<"PUBLISHED" | "REVIEW" | "DRAFT">("PUBLISHED")
  const [isFeatured, setIsFeatured] = useState(false)
  const [publishedAt, setPublishedAt] = useState<string>("")
  const [activeChannel, setActiveChannel] = useState<SocialChannel>("twitter")

  // Copy Feedback State
  const [copiedChannel, setCopiedChannel] = useState<string | null>(null)

  // AI Assist State
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [generationProvider, setGenerationProvider] = useState<string | null>(null)

  const [readiness, setReadiness] = useState<PublicationReadiness | null>(null)
  const [socialCopy, setSocialCopy] = useState<SocialPostCopy | null>(null)
  const [schedule, setSchedule] = useState<ScheduleRecommendation | null>(null)
  const [curatorial, setCuratorial] = useState<CuratorialPublishingRecommendation | null>(null)

  const statusSelectId = useId()
  const publishTimeId = useId()

  useEffect(() => {
    if (quote) {
      setStatus(
        quote.status === "PUBLISHED" || quote.status === "REVIEW" || quote.status === "DRAFT"
          ? quote.status
          : "PUBLISHED"
      )
      setIsFeatured(Boolean(quote.isFeatured))
      setPublishedAt(
        quote.publishedAt
          ? formatDateTimeLocalInAppTimeZone(quote.publishedAt)
          : formatDateTimeLocalInAppTimeZone(new Date())
      )
      setError(null)
      setSuccessMessage(null)
      setGenerationProvider(null)
      setReadiness(null)
      setSocialCopy(null)
      setSchedule(null)
      setCuratorial(null)
      setCopiedChannel(null)
    }
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

  // Automatically run publishing assist on modal open if not already loaded
  useEffect(() => {
    if (isOpen && quote && !readiness && !isAnalyzing) {
      void runPublishAssist()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quote])

  if (!isOpen || !quote) return null

  async function runPublishAssist() {
    if (!quote) return
    setIsAnalyzing(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/quotes/publish-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          content: quote.content,
          authorName: quote.authorName,
          categoryName: quote.categoryName,
          sourceTitle: quote.sourceTitle,
          tags: quote.tags?.map((t) => t.name),
          meaning: quote.meaning,
          historicalContext: quote.historicalContext,
          modernRelevance: quote.modernRelevance,
          isVerified: quote.isVerified,
          attributionStatus: quote.attributionStatus,
          isFeatured: quote.isFeatured,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to analyze publication readiness")
      }

      const result = await res.json()
      const assist = result.assist

      setReadiness(assist.readiness)
      setSocialCopy(assist.socialCopy)
      setSchedule(assist.schedule)
      setCuratorial(assist.curatorial)
      setGenerationProvider(
        result.provider === "gemini" ? "Google Gemini AI" : "Curator Publication Engine"
      )

      if (assist.curatorial?.suggestFeatured !== undefined && !quote.isFeatured) {
        setIsFeatured(assist.curatorial.suggestFeatured)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run publishing assist")
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function handlePublishSubmit(overrideStatus?: "PUBLISHED" | "DRAFT") {
    if (!quote) return
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    const finalStatus = overrideStatus || status
    const finalPublishedAt =
      finalStatus === "PUBLISHED"
        ? publishedAt || formatDateTimeLocalInAppTimeZone(new Date())
        : null

    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: finalStatus,
          publishedAt: finalPublishedAt,
          isFeatured,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to update publication status")
      }

      const result = await res.json()
      setSuccessMessage(
        finalStatus === "PUBLISHED"
          ? "Quotation successfully published & surfaces revalidated!"
          : "Quotation moved to draft."
      )

      onSaveSuccess({
        id: quote.id,
        status: result.quote.status,
        publishedAt: result.quote.publishedAt,
        isFeatured: result.quote.isFeatured,
      })

      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to execute publish action")
    } finally {
      setIsSaving(false)
    }
  }

  function handleCopyText(text: string, channelKey: string) {
    if (!navigator.clipboard) return
    navigator.clipboard.writeText(text).then(() => {
      setCopiedChannel(channelKey)
      setTimeout(() => setCopiedChannel(null), 2500)
    })
  }

  function handleApplyRecommendedSchedule() {
    if (schedule?.suggestedDateTimeLocal) {
      setPublishedAt(schedule.suggestedDateTimeLocal)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-modal-title"
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
                    Editorial Publishing
                  </Badge>
                  <h2
                    id="publish-modal-title"
                    className="text-lg font-bold tracking-tight text-stone-900"
                  >
                    AI Publishing &amp; Social Posting
                  </h2>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  Readiness audit, multi-channel post generation, and scheduled publication.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="xs"
                  onClick={runPublishAssist}
                  disabled={isSaving || isAnalyzing}
                  isLoading={isAnalyzing}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs cursor-pointer shadow-xs"
                  title="Re-run AI publication readiness and social copy generation"
                >
                  ✨ AI Assist
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
              <blockquote className="text-xs font-serif italic text-stone-800 line-clamp-2">
                “{quote.content}”
              </blockquote>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                <span className="font-semibold text-stone-900">
                  — {quote.authorName || "Unknown Author"}
                </span>
                {quote.categoryName && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="text-stone-500">{quote.categoryName}</span>
                  </>
                )}
                {quote.isVerified && (
                  <span className="rounded-md bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-bold">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>

            {/* Provider and Status Indicator */}
            {generationProvider && (
              <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                <span>
                  Generated via <strong className="text-stone-800">{generationProvider}</strong>
                </span>
                {curatorial?.recommendedCardTheme && (
                  <span>
                    Card Theme: <strong className="text-stone-800 capitalize">{curatorial.recommendedCardTheme}</strong>
                  </span>
                )}
              </div>
            )}
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

            {/* 1. Publication Readiness Audit Card */}
            {readiness && (
              <div className="rounded-2xl border border-stone-200/90 bg-stone-50/60 p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      Publication Readiness Audit
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-lg font-extrabold text-stone-900 font-mono">
                        {readiness.score}/100
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          readiness.level === "EXCELLENT"
                            ? "bg-emerald-100 text-emerald-800"
                            : readiness.level === "GOOD"
                            ? "bg-blue-100 text-blue-800"
                            : readiness.level === "NEEDS_ATTENTION"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {readiness.level.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-stone-600">
                    {readiness.isReadyToPublish ? "✓ Ready to Publish" : "⚠️ Curatorial Review Advised"}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      readiness.score >= 85
                        ? "bg-emerald-500"
                        : readiness.score >= 65
                        ? "bg-blue-500"
                        : readiness.score >= 40
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${readiness.score}%` }}
                  />
                </div>

                {/* Warnings if any */}
                {readiness.warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 space-y-1 text-xs text-amber-900 font-medium">
                    {readiness.warnings.map((w, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">⚠️</span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Checklist Badges */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  {readiness.checks.map((chk) => (
                    <div
                      key={chk.id}
                      className={`flex items-start gap-2 rounded-xl p-2.5 border ${
                        chk.passed
                          ? "border-emerald-200 bg-emerald-50/40 text-stone-800"
                          : "border-stone-200 bg-white text-stone-500"
                      }`}
                    >
                      <span className={`text-xs ${chk.passed ? "text-emerald-600 font-bold" : "text-stone-300"}`}>
                        {chk.passed ? "✓" : "○"}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-[11px] block text-stone-900 truncate">
                          {chk.label}
                        </span>
                        <span className="text-[10px] text-stone-500 block truncate">
                          {chk.details}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Publishing & Scheduling Controls */}
            <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-4">
              <div className="border-b border-stone-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                  Publication Schedule &amp; Curation
                </h3>
                <p className="text-[11px] text-stone-500">
                  Configure visibility status, timestamps, and hero placement.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Status Selector */}
                <div className="space-y-1.5">
                  <label
                    htmlFor={statusSelectId}
                    className="text-xs font-bold uppercase tracking-wider text-stone-700"
                  >
                    Publication Status
                  </label>
                  <select
                    id={statusSelectId}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition font-medium"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "PUBLISHED" | "REVIEW" | "DRAFT")
                    }
                  >
                    <option value="PUBLISHED">PUBLISHED — Live on website &amp; feeds</option>
                    <option value="REVIEW">REVIEW — Editorial staging review</option>
                    <option value="DRAFT">DRAFT — Unlisted draft entry</option>
                  </select>
                </div>

                {/* Published Timestamp */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={publishTimeId}
                      className="text-xs font-bold uppercase tracking-wider text-stone-700"
                    >
                      Publish Timestamp (IST)
                    </label>
                    {schedule && (
                      <button
                        type="button"
                        onClick={handleApplyRecommendedSchedule}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        title="Set schedule to AI-recommended optimal engagement window"
                      >
                        ⚡ Use AI Slot
                      </button>
                    )}
                  </div>
                  <input
                    id={publishTimeId}
                    type="datetime-local"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-800 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 transition font-mono"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                  />
                </div>
              </div>

              {/* Recommended schedule reasoning pill */}
              {schedule && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 text-xs text-indigo-900 flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">✨</span>
                  <div>
                    <span className="font-semibold block">{schedule.slotLabel}</span>
                    <span className="text-[11px] text-stone-600 block">{schedule.reasoning}</span>
                  </div>
                </div>
              )}

              {/* Featured Quotation Switch */}
              <label
                className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition ${
                  isFeatured
                    ? "border-[var(--accent-gold)] bg-amber-50/50 text-stone-900"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                <div>
                  <span className="text-xs font-bold text-stone-900 block flex items-center gap-1.5">
                    <span>★ Featured Hero Quotation</span>
                    {curatorial?.suggestFeatured && (
                      <span className="rounded-md bg-amber-200 text-amber-900 px-1.5 py-0.2 text-[9px] font-extrabold uppercase">
                        AI Recommended
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    {curatorial?.featuredReason ||
                      "Elevates this quotation on public homepage hero, editorial features, and trending widgets."}
                  </span>
                </div>
              </label>
            </div>

            {/* 3. Multi-Channel Social Media Copy Generator */}
            {socialCopy && (
              <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-4">
                <div className="border-b border-stone-100 pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                      Multi-Channel Social Post Drafts
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Optimized for engagement, hashtags, character limits, and thought leadership.
                    </p>
                  </div>
                </div>

                {/* Channel Switcher Tabs */}
                <div className="flex border-b border-stone-200 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveChannel("twitter")}
                    className={`pb-2 text-xs font-semibold px-2 transition border-b-2 cursor-pointer ${
                      activeChannel === "twitter"
                        ? "border-stone-900 text-stone-900"
                        : "border-transparent text-stone-400 hover:text-stone-700"
                    }`}
                  >
                    X (Twitter)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChannel("linkedin")}
                    className={`pb-2 text-xs font-semibold px-2 transition border-b-2 cursor-pointer ${
                      activeChannel === "linkedin"
                        ? "border-stone-900 text-stone-900"
                        : "border-transparent text-stone-400 hover:text-stone-700"
                    }`}
                  >
                    LinkedIn
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChannel("instagram")}
                    className={`pb-2 text-xs font-semibold px-2 transition border-b-2 cursor-pointer ${
                      activeChannel === "instagram"
                        ? "border-stone-900 text-stone-900"
                        : "border-transparent text-stone-400 hover:text-stone-700"
                    }`}
                  >
                    Instagram
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChannel("quoteOfTheDay")}
                    className={`pb-2 text-xs font-semibold px-2 transition border-b-2 cursor-pointer ${
                      activeChannel === "quoteOfTheDay"
                        ? "border-stone-900 text-stone-900"
                        : "border-transparent text-stone-400 hover:text-stone-700"
                    }`}
                  >
                    Daily Quote / Email
                  </button>
                </div>

                {/* Tab 1: X (Twitter) */}
                {activeChannel === "twitter" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-700">Short-form Post Draft</span>
                      <span
                        className={`font-mono text-[11px] font-bold ${
                          socialCopy.twitter.charCount <= 280
                            ? "text-emerald-700"
                            : "text-red-600"
                        }`}
                      >
                        {socialCopy.twitter.charCount}/280 characters
                      </span>
                    </div>

                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs text-stone-800 whitespace-pre-wrap leading-relaxed font-sans">
                      {socialCopy.twitter.text}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-wrap gap-1">
                        {socialCopy.twitter.hashtags.map((h, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-stone-200/80 px-1.5 py-0.5 text-[10px] font-mono text-stone-700"
                          >
                            {h}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                            socialCopy.twitter.text
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition shadow-2xs"
                        >
                          Open in X ↗
                        </a>
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() => handleCopyText(socialCopy.twitter.text, "twitter")}
                        >
                          {copiedChannel === "twitter" ? "✓ Copied!" : "Copy Post"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: LinkedIn */}
                {activeChannel === "linkedin" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-700">
                        {socialCopy.linkedin.headline}
                      </span>
                    </div>

                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs text-stone-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-sans">
                      {socialCopy.linkedin.text}
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        onClick={() => handleCopyText(socialCopy.linkedin.text, "linkedin")}
                      >
                        {copiedChannel === "linkedin" ? "✓ Copied!" : "Copy LinkedIn Post"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tab 3: Instagram */}
                {activeChannel === "instagram" && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs text-stone-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-sans">
                      {socialCopy.instagram.caption}
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        onClick={() => handleCopyText(socialCopy.instagram.caption, "instagram")}
                      >
                        {copiedChannel === "instagram" ? "✓ Copied!" : "Copy Caption"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tab 4: Quote of the Day / Newsletter */}
                {activeChannel === "quoteOfTheDay" && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-2 text-xs text-stone-800">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                          Suggested Subject Line
                        </span>
                        <span className="font-semibold text-stone-900 block mt-0.5">
                          {socialCopy.quoteOfTheDay.subjectLine}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-stone-200">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                          Curatorial Newsletter Intro Hook
                        </span>
                        <p className="mt-0.5 leading-relaxed text-stone-700">
                          {socialCopy.quoteOfTheDay.editorialHook}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-stone-200 font-serif italic text-stone-900">
                        {socialCopy.quoteOfTheDay.formattedQuote}
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        onClick={() =>
                          handleCopyText(
                            `${socialCopy.quoteOfTheDay.subjectLine}\n\n${socialCopy.quoteOfTheDay.editorialHook}\n\n${socialCopy.quoteOfTheDay.formattedQuote}`,
                            "quoteOfTheDay"
                          )
                        }
                      >
                        {copiedChannel === "quoteOfTheDay" ? "✓ Copied!" : "Copy Hook & Quote"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
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

            <div className="flex items-center gap-2">
              {quote.status === "PUBLISHED" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePublishSubmit("DRAFT")}
                  disabled={isSaving || isAnalyzing}
                  className="text-amber-800 hover:bg-amber-50 border-amber-300"
                >
                  Unpublish to Draft
                </Button>
              ) : null}

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handlePublishSubmit()}
                disabled={isSaving || isAnalyzing}
                isLoading={isSaving}
                className="bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs cursor-pointer"
              >
                {status === "PUBLISHED"
                  ? quote.status === "PUBLISHED"
                    ? "Update Publication"
                    : "Publish Immediately"
                  : "Save Status"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
