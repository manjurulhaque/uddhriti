"use client"

import * as React from "react"
import Link from "next/link"
import { Panel } from "../ui/card"
import { Empty } from "../ui/empty-state"
import { formatNumber } from "@/lib/formatters"

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
  standoutCategory?: RankedCategoryItem | null
  errorMessage?: string | null
}

type FolioTab = "pillars" | "standards" | "sanctuary"

function formatAuthorLifespan(author: RankedAuthorItem): string | null {
  if (author.birthYear && author.deathYear) {
    const b = author.birthYear < 0 ? `${Math.abs(author.birthYear)} BC` : `${author.birthYear}`
    const d = author.deathYear < 0 ? `${Math.abs(author.deathYear)} BC` : `${author.deathYear}`
    return `${b}–${d}`
  }
  if (author.birthYear) {
    return author.birthYear < 0 ? `b. ${Math.abs(author.birthYear)} BC` : `b. ${author.birthYear}`
  }
  return null
}

function getAuthorInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function HomeHighlights({
  topCategories,
  recentAuthors,
  quotesLast7Days,
  standoutCategory = topCategories[0] ?? null,
  errorMessage,
}: HomeHighlightsProps) {
  const [activeTab, setActiveTab] = React.useState<FolioTab>("pillars")

  // Find max category count for relative progress bars
  const maxCategoryCount = Math.max(...topCategories.map((c) => c.quoteCount), 1)

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" aria-label="Curator Highlights">
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl space-y-2">
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

          {/* Standout Category Feature Pill */}
          {standoutCategory ? (
            <Link
              href={`/categories/${standoutCategory.slug || standoutCategory.id}`}
              className="group relative overflow-hidden rounded-2xl border border-[var(--accent-gold)]/45 bg-white/90 p-4 text-sm text-[var(--ink-800)] shadow-xs transition-all duration-200 hover:border-[var(--accent-gold)]/80 hover:bg-white hover:scale-[1.02] hover:shadow-md active:scale-[0.98] shrink-0 self-start sm:self-auto"
              title={`Explore ${standoutCategory.name}`}
            >
              <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
                <span>Foundational Theme</span>
                <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
              </div>
              <div className="mt-1 font-serif text-lg font-bold text-[var(--ink-900)] group-hover:text-[var(--accent-rust)] transition-colors">
                {standoutCategory.name}
              </div>
              <div className="text-xs text-[var(--ink-700)]/75 mt-0.5">
                {formatNumber(standoutCategory.quoteCount)} curated reflections
              </div>
            </Link>
          ) : null}
        </div>

        {/* Interactive Folio Switcher & Cards */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-amber-900/10 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 mr-1">
              Folios:
            </span>
            <button
              type="button"
              onClick={() => setActiveTab("pillars")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                activeTab === "pillars"
                  ? "bg-[var(--ink-900)] text-white shadow-xs"
                  : "bg-white/70 text-stone-700 hover:bg-white hover:text-stone-900 border border-stone-200/80"
              }`}
            >
              📜 Curatorial Pillars
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("standards")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                activeTab === "standards"
                  ? "bg-[var(--ink-900)] text-white shadow-xs"
                  : "bg-white/70 text-stone-700 hover:bg-white hover:text-stone-900 border border-stone-200/80"
              }`}
            >
              ✒️ Editorial Standards
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sanctuary")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                activeTab === "sanctuary"
                  ? "bg-[var(--ink-900)] text-white shadow-xs"
                  : "bg-white/70 text-stone-700 hover:bg-white hover:text-stone-900 border border-stone-200/80"
              }`}
            >
              🕊️ The Sanctuary Vision
            </button>
          </div>

          {/* Active Folio Cards Display */}
          <div className="grid gap-4 sm:grid-cols-3">
            {activeTab === "pillars" && (
              <>
                <article className="group rounded-2xl border border-stone-200/90 bg-white/95 p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-700/30 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🏛️</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
                      Authenticity
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold text-[var(--ink-900)]">
                    Anchored to original texts
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--ink-700)]/85">
                    Every excerpt is verified against historical manuscripts, published treatises, or
                    recorded speeches—free from apocryphal modern misattributions.
                  </p>
                </article>

                <article className="group rounded-2xl border border-stone-200/90 bg-white/95 p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-700/30 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">📜</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
                      Continuity
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold text-[var(--ink-900)]">
                    A dialogue across eras
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--ink-700)]/85">
                    {quotesLast7Days > 0
                      ? `${formatNumber(quotesLast7Days)} new passages joined the archive this week`
                      : "New passages join the archive every week"}
                    , keeping ancient voices in quiet, ongoing conversation with our present moment.
                  </p>
                </article>

                <article className="group rounded-2xl border border-stone-200/90 bg-white/95 p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-700/30 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🌐</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
                      Universality
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold text-[var(--ink-900)]">
                    Voices across millennia
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--ink-700)]/85">
                    From Stoic emperors and Upanishadic sages to poets, scientists, and
                    reformers—human insight distilled across three thousand years of history.
                  </p>
                </article>
              </>
            )}

            {activeTab === "standards" && (
              <>
                <article className="group rounded-2xl border border-stone-200/90 bg-white/95 p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-700/30 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🔍</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
                      Provenance
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold text-[var(--ink-900)]">
                    Verifiable Citations
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--ink-700)]/85">
                    Citations detail title, publication or composition year, and translation context so
                    readers can explore the parent work with confidence.
                  </p>
                </article>

                <article className="group rounded-2xl border border-stone-200/90 bg-white/95 p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-700/30 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">⏳</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
                      Endurance
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold text-[var(--ink-900)]">
                    Resonance Over Novelty
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--ink-700)]/85">
                    We select thoughts that transcend ephemeral news cycles—lines that illuminate human
                    courage, grief, beauty, and philosophical wonder across generations.
                  </p>
                </article>

                <article className="group rounded-2xl border border-stone-200/90 bg-white/95 p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-700/30 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🖋️</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
                      Lyrical Cadence
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold text-[var(--ink-900)]">
                    Craft &amp; Poetics
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--ink-700)]/85">
                    Thought matters, but so does cadence. We honor language crafted with precision,
                    musicality, and the arresting power of metaphor.
                  </p>
                </article>
              </>
            )}

            {activeTab === "sanctuary" && (
              <>
                <article className="group rounded-2xl border border-stone-200/90 bg-white/95 p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-700/30 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">📖</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
                      Sanctuary
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold text-[var(--ink-900)]">
                    Distraction-Free
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--ink-700)]/85">
                    No advertisements, invasive trackers, or algorithmic noise. A calm, warm paper space
                    crafted for contemplative reading and slow reflection.
                  </p>
                </article>

                <article className="group rounded-2xl border border-stone-200/90 bg-white/95 p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-700/30 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">💾</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
                      Portability
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold text-[var(--ink-900)]">
                    Personal Notebook
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--ink-700)]/85">
                    Save passages directly to your browser’s private notebook with full offline support.
                    Your curated reflections stay accessible anywhere.
                  </p>
                </article>

                <article className="group rounded-2xl border border-stone-200/90 bg-white/95 p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-700/30 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🎨</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
                      Sharing
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-base font-bold text-[var(--ink-900)]">
                    Editorial Card Art
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--ink-700)]/85">
                    Generate elegant typographical quote cards ready for print or sharing, spreading
                    memorable wisdom with visual honor.
                  </p>
                </article>
              </>
            )}
          </div>
        </div>

        {/* Illuminated Curatorial Inscription & Sanctuary Matrix */}
        <div className="rounded-2xl border border-amber-900/12 bg-white/80 p-5 shadow-2xs backdrop-blur-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/8 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📜</span>
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
              <div className="text-base">🏛️</div>
              <div className="mt-1 text-xs font-bold text-stone-900">Textual Fidelity</div>
              <div className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 leading-snug">Primary editions &amp; verified manuscripts</div>
            </div>
            <div className="rounded-xl border border-stone-200/70 bg-white/90 p-3 shadow-2xs">
              <div className="text-base">🕯️</div>
              <div className="mt-1 text-xs font-bold text-stone-900">Historical Setting</div>
              <div className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 leading-snug">Era, thinker lifespan, and context noted</div>
            </div>
            <div className="rounded-xl border border-stone-200/70 bg-white/90 p-3 shadow-2xs">
              <div className="text-base">🌿</div>
              <div className="mt-1 text-xs font-bold text-stone-900">Pure Sanctuary</div>
              <div className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 leading-snug">Zero ads, no tracking, quiet focus</div>
            </div>
            <div className="rounded-xl border border-stone-200/70 bg-white/90 p-3 shadow-2xs">
              <div className="text-base">💾</div>
              <div className="mt-1 text-xs font-bold text-stone-900">Private Notebook</div>
              <div className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 leading-snug">Offline-first personal storage</div>
            </div>
          </div>
        </div>

        {/* Footer Marginalia Callout */}
        <div className="rounded-2xl border border-amber-900/10 bg-amber-800/4 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-800/10 text-amber-900 text-lg">
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
                  <span>Browse all 30+ themes</span>
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
                const lifespan = formatAuthorLifespan(author)
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
