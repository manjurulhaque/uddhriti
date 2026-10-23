import { InsightCard } from "./insight-card"
import { RankingItem } from "./ranking-item"
import { Panel } from "../ui/card"
import { Empty } from "../ui/empty-state"
import { formatNumber } from "@/lib/formatters"

export interface RankedItem {
  id: string
  name: string
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
    <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      {errorMessage ? (
        <div className="lg:col-span-2 rounded-[1.4rem] border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-[0_10px_30px_rgba(120,53,15,0.08)]">
          {errorMessage}
        </div>
      ) : null}

      <section className="animate-rise rounded-[1.75rem] border border-[var(--ink-900)]/10 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(33,37,41,0.08)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-rust)]">
              Why this collection matters
            </p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
              Editorial structure without losing the feeling of discovery.
            </h2>
          </div>
          {standoutCategory ? (
            <div className="rounded-2xl border border-[var(--accent-gold)]/35 bg-[var(--accent-gold)]/14 px-4 py-3 text-sm text-[var(--ink-800)]">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--ink-700)]/70">
                Largest category
              </div>
              <div className="mt-1 font-semibold">{standoutCategory.name}</div>
              <div className="text-xs text-[var(--ink-700)]/70">
                {formatNumber(standoutCategory.quoteCount)} published quotes
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <InsightCard
            eyebrow="Depth"
            title="Source-aware curation"
            description="Every quote can carry category, source, year, and tags so the collection feels researched, not random."
          />
          <InsightCard
            eyebrow="Rhythm"
            title="Fresh additions weekly"
            description={`${formatNumber(quotesLast7Days)} published entries landed in the last seven days, keeping the archive active.`}
          />
          <InsightCard
            eyebrow="Range"
            title="Voices across formats"
            description="Books, speeches, interviews, and religious texts can all live in the same system with a consistent editorial frame."
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Panel title="Top Categories" tone="sand">
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
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Top Authors" tone="mist">
          {recentAuthors.length === 0 ? (
            <Empty message="Authors with published quotes will appear here." />
          ) : (
            <div className="space-y-2.5">
              {recentAuthors.map((author) => (
                <RankingItem
                  key={author.id}
                  title={author.name}
                  count={author.quoteCount}
                  badgeTone="default"
                />
              ))}
            </div>
          )}
        </Panel>
      </section>
    </section>
  )
}
