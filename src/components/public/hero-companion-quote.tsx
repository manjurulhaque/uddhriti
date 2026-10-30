"use client"

import * as React from "react"
import Link from "next/link"
import { BookmarkIcon } from "@/components/ui"
import { useSavedQuotes } from "@/lib/saved-quotes"
import { formatSourceYearLabel } from "@/lib/sourceYear"
import { useCopyToClipboard } from "@/hooks"

export interface CompanionQuoteItem {
  id?: string
  slug?: string
  content: string
  authorName?: string | null
  author?: {
    name?: string | null
    slug?: string | null
  } | null
  category?: { name: string; slug?: string } | null
  source?: {
    title: string
    year: number | null
    yearLabel?: string | null
    yearApproximate?: boolean | null
  } | null
  tags?: Array<{ tag: { id: string; name: string } }> | string[]
  views?: number
}

export interface HeroCompanionQuoteProps {
  quotes: CompanionQuoteItem[]
}

export function HeroCompanionQuote({ quotes }: HeroCompanionQuoteProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const { copied, copyQuote } = useCopyToClipboard()

  const { isSaved, toggleSave } = useSavedQuotes()

  if (!quotes || quotes.length === 0) return null

  const currentQuote = quotes[currentIndex % quotes.length]
  const authorDisplayName = currentQuote.author?.name || currentQuote.authorName || "Unknown Author"
  const authorSlug = currentQuote.author?.slug
  const sourceTitle = currentQuote.source?.title
  const sourceYear = formatSourceYearLabel(currentQuote.source)
  const categoryName = currentQuote.category?.name
  const categorySlug = currentQuote.category?.slug
  const quoteKey = currentQuote.id || currentQuote.slug || currentQuote.content
  const saved = isSaved(quoteKey)

  function handleShuffle() {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % quotes.length)
      setIsTransitioning(false)
    }, 180)
  }

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    copyQuote({
      content: currentQuote.content,
      author: authorDisplayName,
      source: sourceTitle,
    })
  }

  function handleBookmark(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const normalizedTags = (currentQuote.tags || []).map((t) =>
      typeof t === "string" ? t : t.tag?.name
    ).filter(Boolean) as string[]

    toggleSave({
      id: quoteKey,
      slug: currentQuote.slug,
      content: currentQuote.content,
      authorName: authorDisplayName,
      authorSlug: authorSlug || undefined,
      category: categoryName,
      categorySlug: categorySlug || undefined,
      sourceTitle: sourceTitle || undefined,
      year: sourceYear || undefined,
      tags: normalizedTags,
    })
  }

  const quoteHref = currentQuote.slug ? `/quotes/${currentQuote.slug}` : undefined

  return (
    <article className="group relative flex flex-col justify-between rounded-[1.4rem] border border-white/12 bg-white/6 p-5 backdrop-blur-md shadow-lg transition-all duration-300 hover:border-white/20 hover:bg-white/9">
      {/* Top Header Row */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-gold)]/20 text-xs">
            🎲
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent-sand)]">
            Serendipity Reflection
          </span>
        </div>

        <button
          type="button"
          onClick={handleShuffle}
          className="group/btn inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-white/85 transition hover:border-[var(--accent-gold)]/50 hover:bg-white/15 hover:text-white cursor-pointer"
          title="Shuffle to another memorable thought"
        >
          <span className="text-xs transition-transform duration-300 group-hover/btn:rotate-180">
            🔄
          </span>
          <span>Surprise Me</span>
        </button>
      </div>

      {/* Quote Body with transition */}
      <div
        className={`my-3.5 space-y-2.5 transition-all duration-200 ${
          isTransitioning ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"
        }`}
      >
        {quoteHref ? (
          <Link href={quoteHref} className="block group/link">
            <blockquote className="font-serif text-sm sm:text-base leading-relaxed text-white/95 group-hover/link:text-[var(--accent-sand)] transition-colors line-clamp-3">
              &ldquo;{currentQuote.content}&rdquo;
            </blockquote>
          </Link>
        ) : (
          <blockquote className="font-serif text-sm sm:text-base leading-relaxed text-white/95 line-clamp-3">
            &ldquo;{currentQuote.content}&rdquo;
          </blockquote>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {authorSlug ? (
            <Link
              href={`/authors/${authorSlug}`}
              className="font-bold text-[var(--accent-gold)] hover:underline hover:text-white transition-colors"
            >
              — {authorDisplayName}
            </Link>
          ) : (
            <span className="font-bold text-[var(--accent-gold)]">— {authorDisplayName}</span>
          )}

          {sourceTitle && (
            <span className="text-white/60 text-[11px]">
              Source: <span className="text-white/80 italic">{sourceTitle}</span>
            </span>
          )}

          {sourceYear && (
            <span className="font-mono text-[10px] text-white/50">
              ({sourceYear})
            </span>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
        {categoryName && categorySlug ? (
          <Link
            href={`/categories/${categorySlug}`}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-white/70 hover:border-white/20 hover:text-white transition-colors"
          >
            <span>Theme: {categoryName}</span>
          </Link>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-1.5">
          {/* Bookmark Button */}
          <button
            type="button"
            onClick={handleBookmark}
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              saved
                ? "text-[var(--accent-gold)] bg-white/15"
                : "text-white/50 hover:text-white hover:bg-white/10"
            }`}
            title={saved ? "Saved in notebook" : "Save reflection"}
            aria-label="Bookmark quote"
          >
            <BookmarkIcon
              filled={saved}
              className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`}
            />
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Copy quote citation"
            aria-label="Copy citation"
          >
            {copied ? (
              <span className="text-[10px] font-bold text-emerald-400">✓</span>
            ) : (
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>

          {quoteHref && (
            <Link
              href={quoteHref}
              className="inline-flex items-center gap-1 font-semibold text-[11px] text-[var(--accent-sand)] hover:underline ml-1"
            >
              <span>Read</span>
              <span>&rarr;</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
