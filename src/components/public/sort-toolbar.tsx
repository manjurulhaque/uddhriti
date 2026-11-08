import * as React from "react"
import Link from "next/link"

export interface SortOptionItem {
  key: string
  label: string
  icon?: React.ReactNode
}

export interface SortToolbarProps {
  options: SortOptionItem[]
  currentSort: string
  buildSortHref: (key: string) => string
  className?: string
}

export function SortToolbar({
  options,
  currentSort,
  buildSortHref,
  className = "",
}: SortToolbarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {options.map((opt) => {
        const isActive = currentSort === opt.key
        return (
          <Link
            key={opt.key}
            href={buildSortHref(opt.key)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              isActive
                ? "bg-stone-900 text-white shadow-xs"
                : "border border-stone-200/90 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            }`}
          >
            {opt.icon && <span>{opt.icon}</span>}
            <span>{opt.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

