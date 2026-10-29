"use client"

import * as React from "react"
import Link from "next/link"
import { BookmarkIcon } from "@/components/ui"
import { QuoteMeta } from "./quote-meta"
import { formatScore, formatCountWithNoun } from "@/lib/formatters"
import { useSavedQuotes } from "@/lib/saved-quotes"

export interface QuoteCardProps {
  id?: string
  slug?: string
  content: string
  authorName?: string | null
  authorSlug?: string | null
  category?: string | null
  categorySlug?: string | null
  sourceTitle?: string | null
  year?: string | null
  tags?: string[]
  views?: number
  trendingRank?: number
  trendingScore?: number
  variant?: "paper" | "dark" | "featured"
  badgeLabel?: string
  className?: string
  style?: React.CSSProperties
}

export function QuoteCard({
  id,
  slug,
  content,
  authorName,
  authorSlug,
  category,
  categorySlug,
  sourceTitle,
  year,
  tags = [],
  views,
  trendingRank,
  trendingScore,
  variant = "paper",
  badgeLabel,
  className = "",
  style,
}: QuoteCardProps) {
  const isDark = variant === "dark"
  const isFeatured = variant === "featured"
  const quoteHref = slug ? `/quotes/${slug}` : id ? `/quotes/${id}` : undefined

  const { isSaved, toggleSave } = useSavedQuotes()
  const quoteKey = id || slug || content
  const saved = isSaved(quoteKey)

  function handleBookmark(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    toggleSave({
      id: quoteKey,
      slug,
      content,
      authorName,
      authorSlug,
      category,
      categorySlug,
      sourceTitle,
      year,
      tags,
    })
  }

  const bookmarkButton = (
    <button
      type="button"
      onClick={handleBookmark}
      aria-label={saved ? "Remove from saved quotes" : "Save quote for offline reading"}
      className={`p-1.5 rounded-full transition-all cursor-pointer ${
        saved
          ? isDark || isFeatured
            ? "text-[var(--accent-gold)] bg-white/15"
            : "text-[var(--accent-rust)] bg-[#c76b3e]/15 shadow-2xs"
          : isDark || isFeatured
          ? "text-white/40 hover:text-white hover:bg-white/10"
          : "text-amber-800/35 hover:text-amber-900 hover:bg-amber-800/10"
      }`}
    >
      <BookmarkIcon
        filled={saved}
        className="h-4 w-4 transition-transform active:scale-125"
      />
    </button>
  )

  if (isFeatured) {
    return (
      <article
        className={`group relative overflow-hidden rounded-[1.6rem] border border-white/12 bg-white/9 p-6 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-white/20 hover:bg-white/12 ${className}`}
        style={style}
      >
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-sand)]">
          <div className="flex items-center gap-2">
            <span>{badgeLabel || "Quote of the Day"}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)]" />
          </div>
          {bookmarkButton}
        </div>

        {quoteHref ? (
          <Link href={quoteHref} className="block group/link">
            <blockquote className="mt-4 text-xl sm:text-2xl leading-relaxed sm:leading-relaxed font-serif text-white group-hover/link:text-[var(--accent-sand)] transition-colors">
              &ldquo;{content}&rdquo;
            </blockquote>
          </Link>
        ) : (
          <blockquote className="mt-4 text-xl sm:text-2xl leading-relaxed sm:leading-relaxed font-serif text-white">
            &ldquo;{content}&rdquo;
          </blockquote>
        )}

        <QuoteMeta
          authorName={authorName}
          authorSlug={authorSlug}
          category={category}
          categorySlug={categorySlug}
          sourceTitle={sourceTitle}
          year={year}
          tags={tags}
          className="mt-5"
          variant="dark"
        />

        {views !== undefined ? (
          <div className="mt-5 flex items-center justify-between border-t border-white/12 pt-4 text-xs uppercase tracking-[0.16em] text-white/60">
            <span>{formatCountWithNoun(views, "view")}</span>
            <span>{formatCountWithNoun(tags.length, "linked tag")}</span>
          </div>
        ) : null}
      </article>
    )
  }

  if (isDark) {
    return (
      <article
        className={`group relative rounded-[1.4rem] border border-white/10 bg-white/6 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/9 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] ${className}`}
        style={style}
      >
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
          {trendingRank !== undefined ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--accent-sand)]">
              Rank #{trendingRank}
            </span>
          ) : trendingScore !== undefined ? (
            <span>Score {formatScore(trendingScore)}</span>
          ) : (
            <span />
          )}
          {bookmarkButton}
        </div>

        {quoteHref ? (
          <Link href={quoteHref} className="block group/link">
            <blockquote className="mt-3 line-clamp-4 text-base leading-7 font-serif text-white/90 group-hover/link:text-white transition-colors">
              &ldquo;{content}&rdquo;
            </blockquote>
          </Link>
        ) : (
          <blockquote className="mt-3 line-clamp-4 text-base leading-7 font-serif text-white/90">
            &ldquo;{content}&rdquo;
          </blockquote>
        )}

        <QuoteMeta
          authorName={authorName}
          authorSlug={authorSlug}
          category={category}
          categorySlug={categorySlug}
          sourceTitle={sourceTitle}
          year={year}
          tags={tags}
          className="mt-4"
          variant="dark"
        />
      </article>
    )
  }

  return (
    <article
      className={`group relative overflow-hidden rounded-[1.6rem] border border-amber-900/14 bg-gradient-to-br from-[#fffdfa] via-[#fbf6ec] to-[#f4ecd8] p-1.5 shadow-[0_12px_32px_rgba(120,53,15,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-800/28 hover:shadow-[0_22px_45px_rgba(120,53,15,0.12)] ${className}`}
      style={style}
    >
      {/* Inner Parchment Folio Frame */}
      <div className="relative rounded-[1.25rem] border border-amber-900/8 bg-white/45 p-4 sm:p-5 backdrop-blur-[1px] transition-colors group-hover:bg-white/60">
        {/* Subtle Antique Watermark Quote Mark */}
        <span
          className="pointer-events-none absolute -left-1 -top-3 select-none font-serif text-6xl text-amber-900/8 leading-none transition-colors group-hover:text-amber-900/14"
          aria-hidden="true"
        >
          “
        </span>

        <div className="relative z-1 flex items-start justify-between gap-3">
          {quoteHref ? (
            <Link href={quoteHref} className="block group/link flex-1">
              <blockquote className="line-clamp-5 text-sm sm:text-base leading-relaxed font-serif text-[#2a241d] group-hover/link:text-[var(--accent-rust)] transition-colors">
                &ldquo;{content}&rdquo;
              </blockquote>
            </Link>
          ) : (
            <blockquote className="line-clamp-5 text-sm sm:text-base leading-relaxed font-serif text-[#2a241d] flex-1">
              &ldquo;{content}&rdquo;
            </blockquote>
          )}
          <div className="shrink-0 -mt-0.5 -mr-0.5">{bookmarkButton}</div>
        </div>

        <QuoteMeta
          authorName={authorName}
          authorSlug={authorSlug}
          category={category}
          categorySlug={categorySlug}
          sourceTitle={sourceTitle}
          year={year}
          tags={tags}
          className="relative z-1 mt-4"
          variant="light"
        />

        {views !== undefined ? (
          <div className="relative z-1 mt-4 flex items-center justify-between border-t border-amber-900/10 pt-3 text-[11px] uppercase tracking-[0.16em] text-stone-500">
            <span>{formatCountWithNoun(views, "view")}</span>
            {tags.length > 0 && <span>{formatCountWithNoun(tags.length, "tag")}</span>}
          </div>
        ) : null}
      </div>
    </article>
  )
}
