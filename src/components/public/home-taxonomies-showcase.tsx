import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  formatEpoch,
  formatLifespan,
  cleanProfession,
  getAuthorInitials,
  getCategoryMeta,
} from "@/lib/formatters"
import { TaxonomiesTabs } from "./taxonomies-tabs"

// Re-export formatters for backward compatibility
export { formatEpoch, formatLifespan, cleanProfession, getCategoryMeta }

export interface SpotlightAuthorItem {
  id: string
  name: string
  slug: string
  profession?: string | null
  nationality?: string | null
  birthYear?: number | null
  deathYear?: number | null
  imageUrl?: string | null
  quoteCount?: number
  topQuote?: {
    content: string
    slug?: string | null
  } | null
}

export interface SpotlightCategoryItem {
  id: string
  name: string
  slug: string
  description?: string | null
  quoteCount?: number
  topQuote?: {
    content: string
    authorName?: string | null
  } | null
}

export interface HomeTaxonomiesShowcaseProps {
  spotlightAuthors: SpotlightAuthorItem[]
  spotlightCategories: SpotlightCategoryItem[]
  totalAuthors?: number
}

export function HomeTaxonomiesShowcase({
  spotlightAuthors,
  spotlightCategories,
}: HomeTaxonomiesShowcaseProps) {
  const headerLeft = (
    <div className="space-y-2 max-w-2xl">
      <div className="inline-flex items-center gap-2 rounded-full border border-amber-800/15 bg-amber-800/8 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-rust)]">
        <span aria-hidden="true">🏛️</span>
        <span>Living Taxonomies</span>
      </div>
      <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink-900)]">
        Thinkers &amp; Thematic Horizons
      </h2>
      <p className="text-xs sm:text-sm text-stone-600 font-serif leading-relaxed">
        Encounter the visionary minds whose thoughts outlived empires, and explore the enduring
        questions that unite human contemplation across eras.
      </p>
    </div>
  )

  const thinkersSlot = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {spotlightAuthors.map((author) => {
          const epoch = formatEpoch(author.birthYear)
          const lifespan = formatLifespan(author.birthYear, author.deathYear)
          const cleanProf = cleanProfession(author.profession)
          const initials = getAuthorInitials(author.name)

          return (
            <Link
              key={author.id}
              href={`/authors/${author.slug}`}
              className="group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-amber-900/10 bg-white/95 p-5 shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-amber-800/30 hover:shadow-lg active:scale-[0.99] h-full"
            >
              {/* Subtle Top Gradient Accent */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent-rust)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                aria-hidden="true"
              />

              <div className="space-y-4">
                {/* Header: Portrait / Monogram Seal + Meta */}
                <div className="flex items-start gap-3.5">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-2xs group-hover:border-[var(--accent-rust)]/40 transition-colors">
                    {author.imageUrl ? (
                      <Image
                        src={author.imageUrl}
                        alt={author.name}
                        fill
                        sizes="56px"
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-serif text-lg font-bold text-[var(--accent-rust)] bg-gradient-to-br from-amber-50 to-[#faf3e8]">
                        {initials}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-lg font-bold tracking-tight text-stone-900 group-hover:text-[var(--accent-rust)] transition-colors truncate">
                      {author.name}
                    </h3>

                    {lifespan && (
                      <p className="text-xs font-mono font-medium text-stone-500 mt-0.5">
                        {lifespan}
                      </p>
                    )}

                    {epoch && (
                      <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-600 mt-1">
                        {epoch}
                      </span>
                    )}
                  </div>
                </div>

                {/* Nationality & Profession Pill */}
                {(author.nationality || cleanProf) && (
                  <div className="text-xs text-stone-600 font-sans line-clamp-1 border-t border-stone-100 pt-2.5">
                    <span className="font-semibold text-stone-800">{author.nationality}</span>
                    {author.nationality && cleanProf && <span> · </span>}
                    <span>{cleanProf}</span>
                  </div>
                )}

                {/* Signature Excerpt Quote Preview */}
                {author.topQuote?.content ? (
                  <div className="rounded-xl border border-amber-900/10 bg-[#faf6f0]/70 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-rust)] block">
                      Notable Excerpt
                    </span>
                    <blockquote className="font-serif italic text-xs text-stone-800 line-clamp-3 leading-relaxed">
                      &ldquo;{author.topQuote.content}&rdquo;
                    </blockquote>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/60 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      Curated Thinker
                    </span>
                    <p className="font-serif italic text-xs text-stone-500 line-clamp-3 leading-relaxed">
                      Discover preserved fragments, treatises, and philosophical discourses.
                    </p>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs">
                <span className="font-serif italic text-xs text-stone-500">
                  Curated Folio
                </span>

                <span className="inline-flex items-center gap-1 font-bold text-[var(--accent-rust)] group-hover:translate-x-1 transition-transform">
                  <span>Explore</span>
                  <span>&rarr;</span>
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Directory Link Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-stone-200/90 bg-white p-4 sm:px-6 shadow-2xs">
        <p className="text-xs sm:text-sm text-stone-700 font-serif">
          Discover philosophers, poets, novelists, and historical statesmen from antiquity to modern times in our comprehensive catalog.
        </p>
        <Link
          href="/authors"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--ink-900)] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-black hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <span>Explore All Thinkers</span>
          <span>&rarr;</span>
        </Link>
      </div>
    </div>
  )

  const themesSlot = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {spotlightCategories.map((category) => {
          const meta = getCategoryMeta(category.name)

          return (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border bg-gradient-to-b ${meta.gradient} bg-white p-5 shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-[0.99] h-full ${meta.border}`}
            >
              <div className="space-y-3.5">
                {/* Header: Icon + Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-2xl transition-transform duration-300 group-hover:scale-110">
                    {meta.icon}
                  </span>

                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.badge}`}>
                    Living Theme
                  </span>
                </div>

                <div>
                  <h3 className="font-serif text-xl font-bold tracking-tight text-stone-900 group-hover:text-[var(--accent-rust)] transition-colors">
                    {category.name}
                  </h3>

                  {category.description ? (
                    <p className="text-xs text-stone-600 leading-relaxed mt-1 line-clamp-2">
                      {category.description}
                    </p>
                  ) : (
                    <p className="text-xs text-stone-500 italic mt-1">
                      Curated philosophical reflections and memorable passages on {category.name.toLowerCase()}.
                    </p>
                  )}
                </div>

                {/* Featured Excerpt */}
                <div className="rounded-xl border border-stone-200/80 bg-white/90 p-3 space-y-1 mt-2 shadow-2xs">
                  <blockquote className="font-serif italic text-xs text-stone-800 line-clamp-2 leading-relaxed">
                    {category.topQuote?.content
                      ? `“${category.topQuote.content}”`
                      : `Explore philosophical reflections and preserved quotations on ${category.name.toLowerCase()}.`}
                  </blockquote>
                  {category.topQuote?.authorName && (
                    <p className="text-[10px] font-sans text-stone-500 text-right">
                      — {category.topQuote.authorName}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-rust)]">
                  View Collection
                </span>

                <span className="font-bold text-[var(--accent-rust)] group-hover:translate-x-1 transition-transform">
                  &rarr;
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Directory Link Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-stone-200/90 bg-white p-4 sm:px-6 shadow-2xs">
        <p className="text-xs sm:text-sm text-stone-700 font-serif">
          Explore all thematic realms—from courage and wisdom to science, friendship, and grief.
        </p>
        <Link
          href="/categories"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-rust)] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#b55d32] hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <span>Explore All Themes</span>
          <span>&rarr;</span>
        </Link>
      </div>
    </div>
  )

  return (
    <section
      id="taxonomies"
      className="scroll-mt-20 space-y-6"
      aria-label="Master Thinkers and Thematic Horizons"
    >
      <TaxonomiesTabs
        thinkersCount={spotlightAuthors.length}
        themesCount={spotlightCategories.length}
        headerLeft={headerLeft}
        thinkersSlot={thinkersSlot}
        themesSlot={themesSlot}
      />
    </section>
  )
}
