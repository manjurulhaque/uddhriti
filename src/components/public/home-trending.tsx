import { Panel } from "../ui/card"
import { Empty } from "../ui/empty-state"
import { QuoteCard } from "./quote-card"
import { TagBadge } from "./tag-badge"
import { StatTile } from "./stat-tile"
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
  latestCount: number
  tagCount: number
  categoryCount: number
}

export function HomeTrendingSection({
  trendingQuotes,
  topTags,
  latestCount,
  tagCount,
  categoryCount,
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

        <section className="rounded-[1.6rem] border border-[var(--ink-900)]/10 bg-[linear-gradient(135deg,rgba(233,196,106,0.18),rgba(244,162,97,0.08),rgba(255,255,255,0.9))] p-6 shadow-[0_18px_50px_rgba(33,37,41,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-rust)]">
            Collection Snapshot
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatTile label="Visible Now" value={latestCount} tone="warm" />
            <StatTile label="Tag Clusters" value={tagCount} tone="warm" />
            <StatTile label="Lead Categories" value={categoryCount} tone="warm" />
          </div>
        </section>
      </section>
    </section>
  )
}
