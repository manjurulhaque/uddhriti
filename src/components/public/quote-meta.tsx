import * as React from "react"
import Link from "next/link"
import { slugify } from "@/lib/slug"

export interface QuoteMetaProps {
  authorName?: string | null
  authorSlug?: string | null
  category?: string | null
  categorySlug?: string | null
  sourceTitle?: string | null
  year?: string | null
  tags?: string[]
  className?: string
  variant?: "light" | "dark"
}

export function QuoteMeta({
  authorName,
  authorSlug,
  category,
  categorySlug,
  sourceTitle,
  year,
  tags = [],
  className = "",
  variant = "light",
}: QuoteMetaProps) {
  const nameClass = variant === "dark" ? "text-white/90" : "font-serif text-[#2a241d]"
  const metaClass = variant === "dark" ? "text-white/60" : "text-stone-600/85"
  const tagClass =
    variant === "dark"
      ? "bg-white/10 text-white/80 border-white/10 hover:bg-white/20"
      : "bg-amber-800/6 text-stone-700 border-amber-900/10 hover:bg-amber-800/14 hover:border-amber-900/20 hover:text-stone-900"

  return (
    <div className={`space-y-1 min-w-0 max-w-full break-words ${className}`}>
      <p className={`text-sm font-semibold tracking-wide ${nameClass}`}>
        {authorName ? (
          authorSlug ? (
            <Link href={`/authors/${authorSlug}`} className="hover:text-[var(--accent-rust)] transition-colors">
              — {authorName}
            </Link>
          ) : (
            `— ${authorName}`
          )
        ) : (
          "— Unknown author"
        )}
      </p>

      <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${metaClass}`}>
        {category && (
          categorySlug ? (
            <Link href={`/categories/${categorySlug}`} className="hover:text-[var(--accent-rust)] hover:underline transition-colors font-medium">
              Theme: {category}
            </Link>
          ) : (
            <span>Theme: {category}</span>
          )
        )}
        {category && (sourceTitle || year) && <span aria-hidden="true">·</span>}
        {sourceTitle && <span>Source: {sourceTitle}</span>}
        {sourceTitle && year && <span aria-hidden="true">·</span>}
        {year && <span className="font-mono">{year}</span>}
      </div>

      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`text-[11px] font-medium tracking-wide ${variant === "dark" ? "text-white/50" : "text-stone-500"}`}>
            Topics:
          </span>
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${slugify(tag)}`}
              className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors ${tagClass}`}
            >
              #{tag}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
