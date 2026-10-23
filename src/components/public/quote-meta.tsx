import * as React from "react"

export interface QuoteMetaProps {
  authorName?: string | null
  category?: string | null
  sourceTitle?: string | null
  year?: string | null
  tags?: string[]
  className?: string
  variant?: "light" | "dark"
}

export function QuoteMeta({
  authorName,
  category,
  sourceTitle,
  year,
  tags = [],
  className = "",
  variant = "light",
}: QuoteMetaProps) {
  const meta = [category || null, sourceTitle || null, year || null].filter(Boolean)
  const nameClass = variant === "dark" ? "text-white/90" : "text-[var(--ink-800)]"
  const metaClass = variant === "dark" ? "text-white/60" : "text-[var(--ink-700)]/70"
  const tagClass =
    variant === "dark"
      ? "bg-white/10 text-white/80 border-white/10 hover:bg-white/15"
      : "bg-[var(--page-cream)] text-[var(--ink-700)] border-[var(--ink-900)]/8 hover:bg-[var(--accent-sand)]/20"

  return (
    <div className={`space-y-1 ${className}`}>
      <p className={`text-sm font-semibold tracking-wide ${nameClass}`}>
        {authorName ? `— ${authorName}` : "— Unknown author"}
      </p>

      {meta.length > 0 ? (
        <p className={`text-xs ${metaClass}`}>{meta.join(" · ")}</p>
      ) : null}

      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors ${tagClass}`}
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
