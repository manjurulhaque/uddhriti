import * as React from "react"

export interface InsightCardProps {
  eyebrow: string
  title: string
  description: string
  className?: string
}

export function InsightCard({
  eyebrow,
  title,
  description,
  className = "",
}: InsightCardProps) {
  return (
    <article
      className={`rounded-[1.4rem] border border-[var(--ink-900)]/8 bg-[var(--page-cream)] p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-rust)]">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-lg font-semibold text-[var(--ink-900)] leading-snug">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-7 text-[var(--ink-700)]/80">
        {description}
      </p>
    </article>
  )
}
