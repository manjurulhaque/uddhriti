import * as React from "react"
import Link from "next/link"
import { AuthorAvatar } from "./author-avatar"
import { cleanProfession, formatCountWithNoun, formatLifespan } from "@/lib/formatters"

export interface ThinkerItem {
  id: string
  name: string
  slug: string
  profession?: string | null
  nationality?: string | null
  birthYear?: number | null
  deathYear?: number | null
  imageUrl?: string | null
  tagQuoteCount?: number
  quoteCount?: number
}

export interface ThinkerCardProps {
  thinker: ThinkerItem
  isActive?: boolean
  filterHref: string
  profileHref?: string
  contextLabel?: string
  className?: string
}

export function ThinkerCard({
  thinker,
  isActive = false,
  filterHref,
  profileHref = `/authors/${thinker.slug}`,
  contextLabel,
  className = "",
}: ThinkerCardProps) {
  const authorLifespan = formatLifespan(thinker)
  const authorCleanProf = cleanProfession(thinker.profession)
  const count = thinker.tagQuoteCount ?? thinker.quoteCount ?? 0

  return (
    <div
      className={`group relative flex items-center justify-between overflow-hidden rounded-2xl border p-4 transition-all ${
        isActive
          ? "border-amber-600 bg-amber-50/70 shadow-xs ring-2 ring-amber-500/20"
          : "border-stone-200/90 bg-white hover:border-[var(--accent-rust)]/40 hover:shadow-xs"
      } ${className}`}
    >
      <Link
        href={filterHref}
        className="flex items-center gap-3.5 min-w-0 flex-1"
        title={isActive ? "Remove thinker filter" : `Filter quotes by ${thinker.name}`}
      >
        <AuthorAvatar name={thinker.name} imageUrl={thinker.imageUrl} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-serif font-bold text-stone-900 text-sm group-hover:text-[var(--accent-rust)] transition-colors truncate">
              {thinker.name}
            </p>
            {isActive && (
              <span className="rounded-full bg-amber-200 px-1.5 py-0.2 text-[9px] font-bold text-amber-900">
                ACTIVE
              </span>
            )}
          </div>

          <p className="text-[11px] text-stone-500 truncate">
            {authorCleanProf ?? "Thinker"}
            {authorLifespan && ` • ${authorLifespan}`}
          </p>

          <p className="text-[11px] font-mono font-semibold text-[var(--accent-rust)] mt-0.5 truncate">
            {formatCountWithNoun(count, "quote")}
            {contextLabel ? ` ${contextLabel}` : ""}
          </p>
        </div>
      </Link>

      {/* View Author Profile */}
      <Link
        href={profileHref}
        className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-900 transition-colors"
        title={`View full profile of ${thinker.name}`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </Link>
    </div>
  )
}

export interface ThinkerShelfProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  thinkers: ThinkerItem[]
  selectedAuthorId?: string | null
  getFilterHref: (author: ThinkerItem, isCurrentFilter: boolean) => string
  contextLabel?: string
  className?: string
}

export function ThinkerShelf({
  title,
  subtitle = "Click any thinker to filter quotes below",
  icon = "🏛️",
  thinkers,
  selectedAuthorId,
  getFilterHref,
  contextLabel,
  className = "",
}: ThinkerShelfProps) {
  if (!thinkers || thinkers.length === 0) return null

  return (
    <section className={`space-y-4 ${className}`} aria-label={title}>
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-stone-900/10 pb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-lg" aria-hidden="true">
              {icon}
            </span>
          )}
          <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink-900)]">
            {title}
          </h2>
        </div>
        {subtitle && <span className="text-xs font-mono text-stone-500">{subtitle}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {thinkers.map((thinker) => {
          const isCurrentFilter = selectedAuthorId === thinker.id
          return (
            <ThinkerCard
              key={thinker.id}
              thinker={thinker}
              isActive={isCurrentFilter}
              filterHref={getFilterHref(thinker, isCurrentFilter)}
              contextLabel={contextLabel}
            />
          )
        })}
      </div>
    </section>
  )
}

