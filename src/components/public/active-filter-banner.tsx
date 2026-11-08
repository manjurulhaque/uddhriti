import * as React from "react"
import Link from "next/link"

export interface ActiveFilterItem {
  label: string
  value: string
}

export interface ActiveFilterBannerProps {
  filters: ActiveFilterItem[]
  countNote?: string
  clearHref: string
  clearLabel?: string
  className?: string
}

export function ActiveFilterBanner({
  filters,
  countNote,
  clearHref,
  clearLabel = "Clear All Filters",
  className = "",
}: ActiveFilterBannerProps) {
  if (!filters || filters.length === 0) return null

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-xs text-amber-950 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Active Filter:</span>
        {filters.map((f, idx) => (
          <span
            key={idx}
            className="rounded-full bg-white px-2.5 py-0.5 border border-amber-300 font-bold text-stone-800"
          >
            {f.label}: {f.value}
          </span>
        ))}
        {countNote && <span className="text-stone-500 font-mono">({countNote})</span>}
      </div>

      <Link
        href={clearHref}
        className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 border border-amber-300 shadow-2xs transition-colors"
      >
        <span>{clearLabel}</span>
        <span aria-hidden="true">✕</span>
      </Link>
    </div>
  )
}

