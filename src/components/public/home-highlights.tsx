import * as React from "react"
import Link from "next/link"
import { InsightCard } from "./insight-card"
import { RankingItem } from "./ranking-item"
import { Panel } from "../ui/card"
import { Empty } from "../ui/empty-state"
import { formatNumber } from "@/lib/formatters"

export interface RankedItem {
  id: string
  name: string
  slug?: string | null
  quoteCount: number
}

export interface HomeHighlightsProps {
  topCategories: RankedItem[]
  recentAuthors: RankedItem[]
  quotesLast7Days: number
  standoutCategory?: RankedItem | null
  errorMessage?: string | null
}

export function HomeHighlights({
  topCategories,
  recentAuthors,
  quotesLast7Days,
  standoutCategory = topCategories[0] ?? null,
  errorMessage,
}: HomeHighlightsProps) {
  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      {errorMessage ? (
        <div className="lg:col-span-2 rounded-[1.4rem] border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-[0_10px_30px_rgba(120,53,15,0.08)]">
          {errorMessage}
        </div>
      ) : null}

      {/* Left: The Literary Sanctuary Parchment */}
      <section className="animate-rise flex flex-col justify-between rounded-[2rem] border border-[var(--ink-900)]/10 bg-white p-6 sm:p-8 lg:p-10 shadow-[0_16px_50px_rgba(33,37,41,0.06)]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-rust)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-rust)]" />
                The Curator’s Parchment
              </div>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[var(--ink-900)] leading-tight">
                Where ancient reflections meet living contemplations.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--ink-700)]">
                Uddhriti is a quiet sanctuary dedicated to the enduring power of language. Every passage
                is collected as a living cultural artifact—treated with historical reverence rather than
                disposable internet trivia.
              </p>
            </div>

            {standoutCategory ? (
              <Link
                href={`/categories/${standoutCategory.slug || standoutCategory.id}`}
                className="group rounded-2xl border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/14 p-4 text-sm text-[var(--ink-800)] transition-all duration-200 hover:bg-[var(--accent-gold)]/22 hover:border-[var(--accent-gold)]/70 hover:scale-[1.02] active:scale-[0.98] shadow-xs shrink-0 self-start sm:self-auto"
                title={`Explore ${standoutCategory.name}`}
              >
                <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-rust)]">
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

          {/* Literary Substance Pillars */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <InsightCard
              eyebrow="Authenticity"
              title="Anchored to original sources"
              description="Every excerpt is cross-verified against historical manuscripts, published treatises, or recorded speeches—free from apocryphal misattributions."
            />
            <InsightCard
              eyebrow="Continuity"
              title="A conversation across eras"
              description={`${formatNumber(quotesLast7Days)} new passages joined the archive this week, keeping the centuries in quiet, perpetual dialogue with our modern moment.`}
            />
            <InsightCard
              eyebrow="Universality"
              title="Voices across millennia"
              description="From Stoic emperors and Upanishadic sages to poets, scientists, and reformers—human insight distilled across three thousand years of history."
            />
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-5 border-t border-stone-200/70 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
          <span className="italic">
            “To read is to fly; to take off into memories, centuries, and visions.”
          </span>
          <Link
            href="/quotes"
            className="font-semibold text-[var(--accent-rust)] hover:underline inline-flex items-center gap-1"
          >
            <span>Explore Complete Archive</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </section>

      {/* Right: Thematic Pillars & Revered Thinkers */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
        {/* Top Categories Panel */}
        <Panel
          title="Leading Themes"
          subtitle="Explore the library’s most comprehensive collections."
          tone="sand"
        >
          {topCategories.length === 0 ? (
            <Empty message="Categories with published quotes will appear here." />
          ) : (
            <div className="space-y-2.5">
              {topCategories.map((category, index) => (
                <RankingItem
                  key={category.id}
                  rank={index + 1}
                  title={category.name}
                  count={category.quoteCount}
                  countLabel="reflections"
                  href={`/categories/${category.slug || category.id}`}
                  badgeTone="rust"
                />
              ))}

              <div className="pt-2 text-right">
                <Link
                  href="/categories"
                  className="text-xs font-semibold text-[var(--accent-rust)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Browse all categories</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          )}
        </Panel>

        {/* Top Authors Panel */}
        <Panel
          title="Revered Thinkers"
          subtitle="Voices whose words have outlived their centuries."
          tone="mist"
        >
          {recentAuthors.length === 0 ? (
            <Empty message="Authors with published quotes will appear here." />
          ) : (
            <div className="space-y-2.5">
              {recentAuthors.map((author) => (
                <RankingItem
                  key={author.id}
                  title={author.name}
                  count={author.quoteCount}
                  countLabel="passages"
                  href={`/authors/${author.slug || author.id}`}
                  badgeTone="default"
                />
              ))}

              <div className="pt-2 text-right">
                <Link
                  href="/authors"
                  className="text-xs font-semibold text-[var(--accent-rust)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Explore all authors</span>
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
