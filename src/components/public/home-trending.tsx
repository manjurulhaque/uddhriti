import Link from "next/link"
import { Panel } from "../ui/card"
import { Empty } from "../ui/empty-state"
import { QuoteCard } from "./quote-card"
import { TagBadge } from "./tag-badge"
import { formatSourceYearLabel } from "@/lib/sourceYear"

export interface TrendingQuote {
  id: string
  slug?: string
  content: string
  authorName?: string | null
  author?: {
    name?: string | null
    slug?: string | null
  } | null
  category?: { name: string; slug?: string } | null
  source?: {
    title: string
    year: number | null
    yearLabel?: string | null
    yearApproximate?: boolean | null
  } | null
  tags: Array<{ tag: { id: string; name: string } }>
  trendingScore?: number | null
}

export interface PopularTag {
  id: string
  name: string
  type: string
  quoteCount: number
}

export interface HomeTrendingSectionProps {
  trendingQuotes: TrendingQuote[]
  topTags: PopularTag[]
}

export function HomeTrendingSection({
  trendingQuotes,
  topTags,
}: HomeTrendingSectionProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <Panel
        title="Trending Now"
        subtitle="The quotes currently pulling the most attention."
        tone="ink"
      >
        {trendingQuotes.length === 0 ? (
          <Empty message="Trending content will appear here." variant="dark" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {trendingQuotes.map((quote, index) => (
              <QuoteCard
                key={quote.id}
                id={quote.id}
                slug={quote.slug}
                content={quote.content}
                authorName={quote.author?.name || quote.authorName}
                authorSlug={quote.author?.slug}
                category={quote.category?.name}
                categorySlug={quote.category?.slug}
                sourceTitle={quote.source?.title}
                year={formatSourceYearLabel(quote.source)}
                tags={quote.tags.map((entry) => entry.tag.name)}
                trendingRank={index + 1}
                trendingScore={quote.trendingScore ?? undefined}
                variant="dark"
              />
            ))}
          </div>
        )}
      </Panel>

      <section className="grid gap-4">
        <Panel
          title="Popular Tags"
          subtitle="Fast signals for what the archive is clustering around."
          tone="paper"
        >
          {topTags.length === 0 ? (
            <Empty message="Tags will appear when quote tagging grows." />
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {topTags.map((tag) => (
                <TagBadge
                  key={tag.id}
                  name={tag.name}
                  type={tag.type}
                  quoteCount={tag.quoteCount}
                />
              ))}
            </div>
          )}
        </Panel>

        {/* The Curator's Reading Compass */}
        <div className="rounded-[1.6rem] border border-amber-900/14 bg-gradient-to-br from-[#fffdfa] via-[#fbf6ec] to-[#f4ecd8] p-5 sm:p-6 shadow-[0_12px_36px_rgba(120,53,15,0.06)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-800/15 bg-amber-800/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-rust)]">
              <span>🧭</span>
              <span>Reading Compass</span>
            </div>
            <span className="text-[11px] font-serif italic text-stone-500">
              Curated pathways
            </span>
          </div>

          <div>
            <h3 className="font-serif text-lg font-bold text-[#2a241d]">
              How would you like to explore?
            </h3>
            <p className="mt-1 text-xs text-stone-600 leading-relaxed font-serif">
              Three mindful instruments to wander the living anthology beyond trending charts.
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <Link
              href="#daily-quote"
              className="group flex flex-col justify-between rounded-xl border border-amber-900/10 bg-white/75 p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-800/30 hover:bg-white hover:shadow-sm"
            >
              <div>
                <span className="text-xl">🎲</span>
                <h4 className="mt-2 text-xs font-serif font-bold text-stone-900 group-hover:text-[var(--accent-rust)] transition-colors">
                  Serendipity
                </h4>
                <p className="mt-1 text-[10px] text-stone-500 leading-snug">
                  Surprise reflection from the pool
                </p>
              </div>
              <span className="mt-2 text-[10px] font-semibold text-[var(--accent-rust)] group-hover:underline">
                Contemplate &rarr;
              </span>
            </Link>

            <Link
              href="/categories"
              className="group flex flex-col justify-between rounded-xl border border-amber-900/10 bg-white/75 p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-800/30 hover:bg-white hover:shadow-sm"
            >
              <div>
                <span className="text-xl">🏛️</span>
                <h4 className="mt-2 text-xs font-serif font-bold text-stone-900 group-hover:text-[var(--accent-rust)] transition-colors">
                  Theme Horizons
                </h4>
                <p className="mt-1 text-[10px] text-stone-500 leading-snug">
                  Browse by philosophical theme
                </p>
              </div>
              <span className="mt-2 text-[10px] font-semibold text-[var(--accent-rust)] group-hover:underline">
                Explore themes &rarr;
              </span>
            </Link>

            <Link
              href="/saved"
              className="group flex flex-col justify-between rounded-xl border border-amber-900/10 bg-white/75 p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-800/30 hover:bg-white hover:shadow-sm"
            >
              <div>
                <span className="text-xl">📓</span>
                <h4 className="mt-2 text-xs font-serif font-bold text-stone-900 group-hover:text-[var(--accent-rust)] transition-colors">
                  Saved Notebook
                </h4>
                <p className="mt-1 text-[10px] text-stone-500 leading-snug">
                  Private offline reading space
                </p>
              </div>
              <span className="mt-2 text-[10px] font-semibold text-[var(--accent-rust)] group-hover:underline">
                Open folio &rarr;
              </span>
            </Link>
          </div>

          <div className="border-t border-amber-900/10 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-serif italic text-stone-600 text-[11px]">
              “A word once spoken is sacred.”
            </span>
            <Link
              href="/quotes"
              className="font-semibold text-[var(--accent-rust)] hover:underline inline-flex items-center gap-1"
            >
              <span>Explore Complete Archive</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>
    </section>
  )
}
