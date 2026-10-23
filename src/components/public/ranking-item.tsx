import * as React from "react"
import Link from "next/link"
import { formatNumber } from "@/lib/formatters"

export interface RankingItemProps {
  rank?: number
  title: string
  count: number
  countLabel?: string
  href?: string
  badgeTone?: "default" | "rust" | "gold"
  className?: string
}

export function RankingItem({
  rank,
  title,
  count,
  countLabel,
  href,
  badgeTone = "default",
  className = "",
}: RankingItemProps) {
  const badgeClasses = {
    default: "bg-[var(--ink-900)] text-white",
    rust: "bg-[var(--accent-rust)] text-white",
    gold: "bg-[var(--accent-gold)] text-stone-900",
  }[badgeTone]

  const content = (
    <div
      className={`flex items-center justify-between rounded-2xl border border-[var(--ink-900)]/8 bg-white/80 px-4 py-3 text-sm shadow-[0_2px_8px_rgba(33,37,41,0.02)] transition-all duration-200 hover:bg-white hover:border-[var(--ink-900)]/15 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {rank !== undefined ? (
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-rust)]/12 text-xs font-bold text-[var(--accent-rust)]">
            {rank}
          </span>
        ) : null}
        <span className="font-medium text-[var(--ink-900)] truncate">{title}</span>
      </div>

      <div className="shrink-0 ml-3">
        {countLabel ? (
          <span className="text-xs text-[var(--ink-700)]/70">
            {formatNumber(count)} {countLabel}
          </span>
        ) : (
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider uppercase ${badgeClasses}`}
          >
            {formatNumber(count)}
          </span>
        )}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block group">
        {content}
      </Link>
    )
  }

  return content
}
