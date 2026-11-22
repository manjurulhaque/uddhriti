import * as React from "react"
import Link from "next/link"
import { ChevronRightIcon } from "../ui/icons"

export interface AdminEntityCardProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  href?: string
  onClick?: () => void
  badge?: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  avatar?: React.ReactNode
  selected?: boolean
  onSelect?: (selected: boolean) => void
  disabled?: boolean
  className?: string
  children?: React.ReactNode
  variant?: "row" | "grid"
}

export function AdminEntityCard({
  title,
  subtitle,
  href,
  onClick,
  badge,
  meta,
  actions,
  avatar,
  selected = false,
  onSelect,
  disabled = false,
  className = "",
  children,
  variant = "row",
}: AdminEntityCardProps) {
  const isClickable = Boolean(href || onClick)

  const cardBaseStyles = `group relative rounded-2xl border transition-all duration-150 ease-out ${
    selected
      ? "border-stone-900 bg-stone-50/70 shadow-2xs ring-1 ring-stone-900/10"
      : "border-stone-200/90 bg-white hover:border-stone-400/80 hover:shadow-xs"
  } ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${
    variant === "grid" ? "p-5 flex flex-col justify-between" : "p-4"
  } ${className}`

  const content = (
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-stone-900 group-hover:text-black tracking-tight text-sm sm:text-base truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs text-stone-500 mt-0.5 line-clamp-1">
              {subtitle}
            </div>
          )}
        </div>
        {variant === "row" && badge && <div className="shrink-0">{badge}</div>}
      </div>

      {children && <div className="mt-2 text-sm text-stone-600">{children}</div>}

      {meta && (
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-stone-500">
          {meta}
        </div>
      )}

      {variant === "grid" && badge && (
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          {badge}
        </div>
      )}
    </div>
  )

  return (
    <div className={cardBaseStyles}>
      <div className="flex items-start gap-3.5">
        {onSelect && (
          <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400 cursor-pointer"
            />
          </div>
        )}

        {avatar && <div className="shrink-0 pt-0.5">{avatar}</div>}

        {href ? (
          <Link
            href={href}
            className="flex-1 min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-lg"
          >
            {content}
          </Link>
        ) : onClick ? (
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex-1 min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-lg"
          >
            {content}
          </button>
        ) : (
          content
        )}

        {actions && (
          <div
            className="shrink-0 flex items-center gap-2 pt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}

        {isClickable && !actions && variant === "row" && (
          <div className="shrink-0 hidden sm:flex items-center self-center text-stone-400 group-hover:text-stone-700 transition-colors pl-1">
            <ChevronRightIcon className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
          </div>
        )}
      </div>
    </div>
  )
}

export function AdminEntityCountBadge({
  count,
  label = "Quotes",
}: {
  count: number | string
  label?: string
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
      <span>{label}:</span>
      <span className="font-bold text-stone-900">{count}</span>
    </span>
  )
}
