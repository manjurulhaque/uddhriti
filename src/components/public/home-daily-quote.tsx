"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { BookmarkIcon } from "@/components/ui"
import { useSavedQuotes } from "@/lib/saved-quotes"
import { formatSourceYearLabel } from "@/lib/sourceYear"
import { formatLifespan } from "@/lib/formatters"
import { useCopyToClipboard } from "@/hooks"

const QuoteShareModal = dynamic(
  () => import("./quote-share-modal").then((mod) => mod.QuoteShareModal),
  { ssr: false }
)

export interface DailyQuoteItem {
  id: string
  slug?: string | null
  content: string
  meaning?: string | null
  historicalContext?: string | null
  authorName?: string | null
  author?: {
    name?: string | null
    slug?: string | null
    profession?: string | null
    nationality?: string | null
    birthYear?: number | null
    deathYear?: number | null
  } | null
  category?: {
    name?: string | null
    slug?: string | null
  } | null
  source?: {
    title: string
    year: number | null
    yearLabel?: string | null
    yearApproximate?: boolean | null
  } | null
}

export interface HomeDailyQuoteProps {
  initialQuote: DailyQuoteItem
  serendipityPool?: DailyQuoteItem[]
}

export function HomeDailyQuote({ initialQuote, serendipityPool = [] }: HomeDailyQuoteProps) {
  // Combine initial quote with serendipity pool and deduplicate by ID if a pool is provided
  const allQuotes = React.useMemo(() => {
    const map = new Map<string, DailyQuoteItem>()
    if (initialQuote?.id) map.set(initialQuote.id, initialQuote)
    for (const q of serendipityPool) {
      if (q?.id && !map.has(q.id)) {
        map.set(q.id, q)
      }
    }
    return Array.from(map.values())
  }, [initialQuote, serendipityPool])

  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const [shareModalOpen, setShareModalOpen] = React.useState(false)
  const { copied, copyQuote } = useCopyToClipboard()

  const { isSaved, toggleSave } = useSavedQuotes()

  const currentQuote = allQuotes[currentIndex] || initialQuote
  const authorDisplayName = currentQuote.author?.name || currentQuote.authorName || "Unknown Author"
  const authorSlug = currentQuote.author?.slug
  const sourceTitle = currentQuote.source?.title
  const sourceYear = formatSourceYearLabel(currentQuote.source)
  const categoryName = currentQuote.category?.name
  const categorySlug = currentQuote.category?.slug
  const quoteKey = currentQuote.id || currentQuote.slug || currentQuote.content
  const saved = isSaved(quoteKey)

  const isDaily = currentIndex === 0
  const hasPool = allQuotes.length > 1

  // Format today's date
  const todayFormatted = React.useMemo(() => {
    const d = new Date()
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }, [])

  function handleShuffle() {
    if (!hasPool) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % allQuotes.length)
      setIsTransitioning(false)
    }, 200)
  }

  function handleCopy() {
    copyQuote({
      content: currentQuote.content,
      author: authorDisplayName,
      source: sourceTitle,
    })
  }

  function handleBookmark() {
    toggleSave({
      id: quoteKey,
      slug: currentQuote.slug || undefined,
      content: currentQuote.content,
      authorName: authorDisplayName,
      authorSlug: authorSlug || undefined,
      category: categoryName || undefined,
      categorySlug: categorySlug || undefined,
      sourceTitle: sourceTitle || undefined,
      year: sourceYear || undefined,
    })
  }

  const authorSubtitle = [
    currentQuote.author?.profession,
    currentQuote.author?.nationality,
    formatLifespan(currentQuote.author),
  ]
    .filter(Boolean)
    .join(" • ")

  return (
    <section
      id="daily-quote"
      className="scroll-mt-20 relative overflow-hidden rounded-[2.25rem] border-2 border-amber-900/15 bg-gradient-to-br from-[#fffefc] via-[#faf5ec] to-[#f3ebd9] p-6 sm:p-10 lg:p-12 text-stone-900 shadow-[0_24px_70px_rgba(120,53,15,0.08)]"
      aria-label="Quote of the Day and Daily Contemplation"
    >
      {/* Decorative Gold Header Filament */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent-rust)] to-transparent select-none opacity-80"
        aria-hidden="true"
      />

      <div className="relative isolate space-y-6">
        {/* Subtle Decorative Ambient Glows */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl select-none"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-orange-400/8 blur-3xl select-none"
          aria-hidden="true"
        />

        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/10 pb-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="inline-flex items-center gap-2 rounded-full border border-amber-800/20 bg-amber-800/8 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent-rust)] shadow-2xs">
              <span className="text-sm" aria-hidden="true">🌅</span>
              <span>{isDaily ? "Daily Contemplation" : "Serendipity Discovery"}</span>
            </h2>

            <span className="text-xs text-stone-400 hidden sm:inline" aria-hidden="true">•</span>

            <span className="text-xs font-semibold text-stone-600" suppressHydrationWarning>
              {isDaily ? todayFormatted : "Contemplative Reflection"}
            </span>
          </div>

          {/* Quick Shuffle Trigger (if pool present) or Random Link */}
          {hasPool ? (
            <button
              type="button"
              onClick={handleShuffle}
              className="group inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/95 px-4 py-1.5 text-xs font-semibold text-stone-800 shadow-2xs transition hover:border-[var(--accent-rust)] hover:bg-white hover:text-[var(--accent-rust)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="Reveal another reflection from the pool"
            >
              <span className="text-sm transition-transform duration-300 group-hover:rotate-180" aria-hidden="true">
                🔄
              </span>
              <span>Next Thought</span>
            </button>
          ) : (
            <Link
              href="/quotes/random"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-900/15 bg-white/90 px-3.5 py-1 text-xs font-semibold text-stone-700 hover:border-[var(--accent-rust)] hover:bg-white hover:text-[var(--accent-rust)] transition-colors shadow-2xs"
              title="Discover a random passage from the archive"
            >
              <span>🎲</span>
              <span>Random Discovery</span>
            </Link>
          )}
        </div>

        {/* Main Quotation Body with Smooth Transition */}
        <div
          className={`space-y-6 transition-all duration-200 ${
            isTransitioning ? "opacity-0 scale-[0.99] translate-y-2" : "opacity-100 scale-100 translate-y-0"
          }`}
        >
          {/* Editorial Quotation */}
          <div className="relative pt-1">
            <span
              className="pointer-events-none absolute -left-2 sm:-left-3 -top-5 font-serif text-5xl sm:text-6xl text-amber-800/15 select-none leading-none"
              aria-hidden="true"
            >
              “
            </span>
            <blockquote className="relative font-serif text-lg sm:text-xl md:text-2xl font-normal leading-relaxed sm:leading-relaxed text-[var(--ink-900)]">
              “{currentQuote.content}”
            </blockquote>
          </div>

          {/* Attribution & Provenance Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-amber-900/10">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-base sm:text-lg font-serif">
                {authorSlug ? (
                  <Link
                    href={`/authors/${authorSlug}`}
                    className="font-bold text-[var(--accent-rust)] hover:underline hover:text-[#9c421b] transition-colors"
                  >
                    — {authorDisplayName}
                  </Link>
                ) : (
                  <span className="font-bold text-[var(--accent-rust)]">— {authorDisplayName}</span>
                )}

                {sourceTitle && (
                  <span className="text-sm text-stone-700 font-sans italic">
                    in <span className="text-stone-900 font-medium">{sourceTitle}</span>
                  </span>
                )}

                {sourceYear && (
                  <span className="text-xs font-mono font-semibold text-stone-600 font-sans">
                    ({sourceYear})
                  </span>
                )}
              </div>

              {authorSubtitle && (
                <p className="text-xs font-medium text-stone-600 font-sans">
                  {authorSubtitle}
                </p>
              )}
            </div>

            {categoryName && categorySlug && (
              <Link
                href={`/categories/${categorySlug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-900/15 bg-white/90 px-3.5 py-1 text-xs font-medium text-stone-700 hover:border-[var(--accent-rust)] hover:bg-white hover:text-[var(--accent-rust)] transition-colors shadow-2xs"
              >
                <span>Theme:</span>
                <span className="text-[var(--accent-rust)] font-bold">{categoryName}</span>
              </Link>
            )}
          </div>

          {/* Editorial Context or Contemplative Prompt */}
          <div className="rounded-2xl border border-amber-800/15 bg-white/90 p-4 sm:p-5 shadow-2xs space-y-1.5 backdrop-blur-xs">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
              <span>💡</span>
              <span>
                {currentQuote.historicalContext
                  ? "Historical Context"
                  : currentQuote.meaning
                  ? "Philosophical Essence"
                  : "Daily Contemplation"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-serif">
              {currentQuote.historicalContext ||
                currentQuote.meaning ||
                "Take a quiet pause with this line today. Notice what thoughts or emotions arise, and let its perspective accompany you through the hours ahead."}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-amber-900/10">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Card Art Generator Button */}
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-rust)] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#b55d32] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                title="Generate and download an editorial typography card image"
              >
                <span className="text-sm">🎨</span>
                <span>Generate Card Image</span>
              </button>

              {/* Bookmark / Saved Button */}
              <button
                type="button"
                onClick={handleBookmark}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-medium transition cursor-pointer ${
                  saved
                    ? "border-[var(--accent-rust)] bg-[var(--accent-rust)] text-white font-bold shadow-xs"
                    : "border-stone-300 bg-white text-stone-800 hover:bg-stone-50 hover:border-stone-400 shadow-2xs"
                }`}
                title={saved ? "Saved in notebook" : "Save to notebook"}
              >
                <BookmarkIcon
                  filled={saved}
                  className={`h-4 w-4 ${saved ? "fill-white text-white" : "fill-none text-stone-600"}`}
                />
                <span>{saved ? "Saved" : "Save to Notebook"}</span>
              </button>

              {/* Copy Citation Button */}
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-stone-800 transition hover:bg-stone-50 hover:border-stone-400 shadow-2xs cursor-pointer"
                title="Copy citation to clipboard"
              >
                <svg
                  className="h-4 w-4 text-stone-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  {copied ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  )}
                </svg>
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            {/* Read Full Details Link */}
            {currentQuote.slug && (
              <Link
                href={`/quotes/${currentQuote.slug}`}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--accent-rust)] hover:underline hover:text-[#9c421b] transition-colors"
              >
                <span>Read Full Reflection</span>
                <span>&rarr;</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Editorial Card Art Share Modal */}
      <QuoteShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        content={currentQuote.content}
        authorName={authorDisplayName}
        sourceTitle={sourceTitle}
        quoteUrl={typeof window !== "undefined" && currentQuote.slug ? `${window.location.origin}/quotes/${currentQuote.slug}` : undefined}
      />
    </section>
  )
}
