import * as React from "react"
import Link from "next/link"
import { Panel } from "../ui/card"
import { Empty } from "../ui/empty-state"
import { formatNumber, formatLifespan, getAuthorInitials } from "@/lib/formatters"
import { CuratorFolioTabs } from "./curator-folio-tabs"

export interface RankedCategoryItem {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  quoteCount: number
}

export interface RankedAuthorItem {
  id: string
  name: string
  slug?: string | null
  birthYear?: number | null
  deathYear?: number | null
  profession?: string | null
  nationality?: string | null
  quoteCount: number
}

export interface HomeHighlightsProps {
  topCategories: RankedCategoryItem[]
  recentAuthors: RankedAuthorItem[]
  quotesLast7Days: number
  errorMessage?: string | null
}

export function HomeHighlights({
  topCategories,
  recentAuthors,
  quotesLast7Days,
  errorMessage,
}: HomeHighlightsProps) {
  // Find max category count for relative progress bars
  const maxCategoryCount = Math.max(...topCategories.map((c) => c.quoteCount), 1)

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" aria-label="Curator Highlights">
      {errorMessage ? (
        <div className="lg:col-span-2 rounded-[1.4rem] border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-[0_10px_30px_rgba(120,53,15,0.08)]">
          {errorMessage}
        </div>
      ) : null}

      {/* Left: The Literary Sanctuary Parchment */}
      <section className="animate-rise relative isolate flex flex-col justify-start gap-6 overflow-hidden rounded-[2rem] border border-amber-900/10 bg-gradient-to-br from-white via-[#faf6f0] to-[#f4ede2] p-6 sm:p-8 lg:p-10 shadow-[0_20px_60px_rgba(33,37,41,0.08)]">
        {/* Subtle Watermark Seal */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full border-[12px] border-amber-800/5 bg-radial from-amber-600/5 to-transparent blur-xs select-none"
          aria-hidden="true"
        />

        {/* Header & Pillar Badge */}
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-800/15 bg-amber-800/6 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-rust)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-rust)] animate-pulse" />
            The Curator’s Parchment
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--ink-900)] leading-tight">
            Where ancient reflections meet living contemplations.
          </h2>
          <p className="text-sm leading-relaxed text-[var(--ink-700)]">
            Uddhriti is a quiet sanctuary dedicated to the enduring resonance of language.
            Here, passages are gathered with scholarly care—treated not as disposable internet
            snippets, but as living cultural monuments.
          </p>
        </div>

        {/* Interactive Folio Switcher & Cards */}
        <CuratorFolioTabs quotesLast7Days={quotesLast7Days} />

        {/* Illuminated Curatorial Inscription & Sanctuary Matrix */}
        <div className="rounded-2xl border border-amber-900/12 bg-white/80 p-5 shadow-2xs backdrop-blur-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/8 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">📜</span>
              <span className="text-xs font-serif font-bold uppercase tracking-[0.16em] text-[var(--ink-900)]">
                The Curatorial Charter &amp; Textual Oath
              </span>
            </div>
            <span className="rounded-full bg-amber-800/8 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--accent-rust)] uppercase tracking-wider">
              Scholarly Rigor
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-[var(--ink-700)]/90 font-serif italic">
            “We reject the ephemeral speed and algorithmic noise of modern feeds. Every quotation in this archive is cross-checked against primary texts, preserved in full historical context, and made freely available for unhurried contemplation.”
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-stone-200/70 bg-white/90 p-3 shadow-2xs">
              <div className="text-base" aria-hidden="true">🏛️</div>
              <div className="mt-1 text-xs font-bold text-stone-900">Textual Fidelity</div>
              <div className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 leading-snug">Primary editions &amp; verified manuscripts</div>
            </div>
            <div className="rounded-xl border border-stone-200/70 bg-white/90 p-3 shadow-2xs">
              <div className="text-base" aria-hidden="true">🕯️</div>
              <div className="mt-1 text-xs font-bold text-stone-900">Historical Setting</div>
              <div className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 leading-snug">Era, thinker lifespan, and context noted</div>
            </div>
            <div className="rounded-xl border border-stone-200/70 bg-white/90 p-3 shadow-2xs">
              <div className="text-base" aria-hidden="true">🌿</div>
              <div className="mt-1 text-xs font-bold text-stone-900">Pure Sanctuary</div>
              <div className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 leading-snug">Zero ads, no tracking, quiet focus</div>
            </div>
            <div className="rounded-xl border border-stone-200/70 bg-white/90 p-3 shadow-2xs">
              <div className="text-base" aria-hidden="true">💾</div>
              <div className="mt-1 text-xs font-bold text-stone-900">Private Notebook</div>
              <div className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 leading-snug">Offline-first personal storage</div>
            </div>
          </div>
        </div>

        {/* Footer Marginalia Callout */}
        <div className="rounded-2xl border border-amber-900/10 bg-amber-800/4 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-800/10 text-amber-900 text-lg" aria-hidden="true">
              ✒️
            </span>
            <p className="font-serif italic text-xs sm:text-sm text-stone-800">
              “Words outlive the hands that wrote them and the stone temples that housed them.”
            </p>
          </div>

          <Link
            href="/quotes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--accent-rust)] hover:underline"
          >
            <span>Explore Complete Archive</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </section>

      {/* Right: Thematic Pillars & Revered Thinkers */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
        {/* Leading Themes Panel */}
        <Panel
          title="Leading Themes"
          subtitle="Explore the collection’s deepest intellectual clusters."
          tone="sand"
        >
          {topCategories.length === 0 ? (
            <Empty message="Categories with published quotes will appear here." />
          ) : (
            <div className="space-y-3">
              {topCategories.slice(0, 4).map((category, index) => {
                const percentage = Math.max(15, Math.round((category.quoteCount / maxCategoryCount) * 100))
                return (
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug || category.id}`}
                    className="group block rounded-2xl border border-stone-200/80 bg-white/90 p-3.5 shadow-2xs transition-all duration-200 hover:border-amber-800/30 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-rust)]/12 text-[11px] font-bold text-[var(--accent-rust)]">
                          {index + 1}
                        </span>
                        <span className="font-medium text-stone-900 group-hover:text-[var(--accent-rust)] transition-colors truncate">
                          {category.name}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
                        {formatNumber(category.quoteCount)}
                      </span>
                    </div>

                    {/* Collection Depth Indicator Bar */}
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-rust)] transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </Link>
                )
              })}

              <div className="pt-1 text-right">
                <Link
                  href="/categories"
                  className="text-xs font-semibold text-[var(--accent-rust)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Browse all themes</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          )}
        </Panel>

        {/* Revered Thinkers Panel */}
        <Panel
          title="Revered Thinkers"
          subtitle="Voices whose words have outlived their centuries."
          tone="mist"
        >
          {recentAuthors.length === 0 ? (
            <Empty message="Authors with published quotes will appear here." />
          ) : (
            <div className="space-y-3">
              {recentAuthors.slice(0, 4).map((author) => {
                const lifespan = formatLifespan(author)
                const initials = getAuthorInitials(author.name)
                const subtitle = [author.profession, author.nationality, lifespan]
                  .filter(Boolean)
                  .join(" • ")

                return (
                  <Link
                    key={author.id}
                    href={`/authors/${author.slug || author.id}`}
                    className="group block rounded-2xl border border-stone-200/80 bg-white/90 p-3.5 shadow-2xs transition-all duration-200 hover:border-amber-800/30 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Elegant Author Monogram Seal */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--ink-900)] to-[#3a4454] font-serif text-xs font-bold text-[var(--accent-gold)] shadow-2xs group-hover:from-[var(--accent-rust)] group-hover:to-[#8a3e1b] transition-all">
                          {initials}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-serif font-bold text-sm text-stone-900 group-hover:text-[var(--accent-rust)] transition-colors truncate">
                            {author.name}
                          </h4>
                          {subtitle && (
                            <p className="text-[11px] text-stone-500 truncate mt-0.5">
                              {subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
                          {formatNumber(author.quoteCount)}
                        </span>
                        <svg
                          className="h-3.5 w-3.5 text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent-rust)]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                )
              })}

              <div className="pt-1 text-right">
                <Link
                  href="/authors"
                  className="text-xs font-semibold text-[var(--accent-rust)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Explore all thinkers</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          )}
        </Panel>
      </section>
    </section>
  )
}
