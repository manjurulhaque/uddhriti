import * as React from "react"
import Link from "next/link"
import { formatNumber } from "@/lib/formatters"

export interface TagBadgeProps {
  name: string
  type?: string
  quoteCount?: number
  href?: string
  variant?: "cream" | "dark" | "outline"
  className?: string
}

export function TagBadge({
  name,
  type,
  quoteCount,
  href,
  variant = "cream",
  className = "",
}: TagBadgeProps) {
  const variantStyles = {
    cream:
      "border-[var(--ink-900)]/10 bg-[var(--page-cream)] text-[var(--ink-800)] hover:bg-[var(--accent-sand)]/25 hover:border-[var(--ink-900)]/20",
    dark:
      "border-white/12 bg-white/8 text-white/90 hover:bg-white/15 hover:border-white/25",
    outline:
      "border-[var(--ink-900)]/15 bg-transparent text-[var(--ink-700)] hover:bg-[var(--page-cream)] hover:text-[var(--ink-900)]",
  }[variant]

  const content = (
    <span
      className={`inline-flex min-h-[44px] sm:min-h-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-150 ${variantStyles} ${className}`}
    >
      <span>{name}</span>
      {type && (
        <>
          <span className="opacity-40">/</span>
          <span className="opacity-70 font-normal">{type}</span>
        </>
      )}
      {quoteCount !== undefined && (
        <>
          <span className="opacity-40">/</span>
          <span className="font-bold">{formatNumber(quoteCount)}</span>
        </>
      )}
    </span>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="inline-block transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-rust)] rounded-full"
      >
        {content}
      </Link>
    )
  }

  return content
}
