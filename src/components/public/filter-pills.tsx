import * as React from "react"
import Link from "next/link"

export interface FilterPillItem {
  id: string
  label: string
  href: string
  isActive: boolean
  count?: number
}

export interface FilterPillsProps {
  label?: string
  allLabel?: string
  allHref?: string
  isAllActive?: boolean
  items: FilterPillItem[]
  className?: string
}

export function FilterPills({
  label,
  allLabel = "All",
  allHref,
  isAllActive = false,
  items,
  className = "",
}: FilterPillsProps) {
  return (
    <div className={`flex w-full max-w-full min-w-0 flex-nowrap sm:flex-wrap items-center gap-1.5 py-1 overflow-x-auto scrollbar-none [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [-webkit-mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] sm:[mask-image:none] sm:[-webkit-mask-image:none] ${className}`}>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 mr-1 shrink-0">
          {label}
        </span>
      )}

      {allHref && (
        <Link
          href={allHref}
          className={`inline-flex shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 items-center rounded-full px-3.5 py-2 sm:px-3 sm:py-1 text-xs font-medium transition-all ${
            isAllActive
              ? "bg-stone-900 text-white shadow-2xs"
              : "bg-white border border-stone-200 text-stone-700 hover:border-stone-400"
          }`}
        >
          {allLabel}
        </Link>
      )}

      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`inline-flex shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 items-center gap-1.5 rounded-full px-3.5 py-2 sm:px-3 sm:py-1 text-xs font-medium transition-all ${
            item.isActive
              ? "bg-stone-900 text-white shadow-2xs"
              : "bg-white border border-stone-200/90 text-stone-700 hover:border-stone-400 hover:bg-stone-50"
          }`}
        >
          <span>{item.label}</span>
          {item.count !== undefined && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                item.isActive
                  ? "bg-stone-800 text-stone-300"
                  : "bg-stone-100 text-stone-500"
              }`}
            >
              {item.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}

