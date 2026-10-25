import * as React from "react"
import { QuoteMeta } from "./quote-meta"
import { formatScore, formatCountWithNoun } from "@/lib/formatters"

export interface QuoteCardProps {
  id?: string
  content: string
  authorName?: string | null
  category?: string | null
  sourceTitle?: string | null
  year?: string | null
  tags?: string[]
  views?: number
  trendingRank?: number
  trendingScore?: number
  variant?: "paper" | "dark" | "featured"
  className?: string
  style?: React.CSSProperties
}

export function QuoteCard({
  content,
  authorName,
  category,
  sourceTitle,
  year,
  tags = [],
  views,
  trendingRank,
  trendingScore,
  variant = "paper",
  className = "",
  style,
}: QuoteCardProps) {
  const isDark = variant === "dark"
  const isFeatured = variant === "featured"

  if (isFeatured) {
    return (
      <article
        className={`group relative overflow-hidden rounded-[1.6rem] border border-white/12 bg-white/9 p-6 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-white/20 hover:bg-white/12 ${className}`}
        style={style}
      >
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-sand)]">
          <span>Featured Voice</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)]" />
        </div>

        <blockquote className="mt-4 text-xl sm:text-2xl leading-relaxed sm:leading-relaxed font-serif text-white">
          &ldquo;{content}&rdquo;
        </blockquote>

        <QuoteMeta
          authorName={authorName}
          category={category}
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
        {(trendingRank !== undefined || trendingScore !== undefined) && (
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
            {trendingRank !== undefined ? (
              <span className="inline-flex items-center gap-1.5 text-[var(--accent-sand)]">
                Rank #{trendingRank}
              </span>
            ) : null}
            {trendingScore !== undefined ? (
              <span>Score {formatScore(trendingScore)}</span>
            ) : null}
          </div>
        )}

        <blockquote className="mt-4 line-clamp-4 text-base leading-7 font-serif text-white/90">
          &ldquo;{content}&rdquo;
        </blockquote>

        <QuoteMeta
          authorName={authorName}
          category={category}
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
      className={`group rounded-[1.6rem] border border-[var(--ink-900)]/8 bg-white p-5 shadow-[0_14px_36px_rgba(33,37,41,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(33,37,41,0.12)] ${className}`}
      style={style}
    >
      <div className="rounded-[1.2rem] bg-[linear-gradient(180deg,rgba(244,162,97,0.08),rgba(255,255,255,0))] p-1">
        <blockquote className="line-clamp-5 text-sm leading-7 font-serif text-[var(--ink-800)]">
          &ldquo;{content}&rdquo;
        </blockquote>

        <QuoteMeta
          authorName={authorName}
          category={category}
          sourceTitle={sourceTitle}
          year={year}
          tags={tags}
          className="mt-4"
          variant="light"
        />
      </div>
    </article>
  )
}
