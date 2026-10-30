import Link from "next/link"
import { QuoteCard } from "./quote-card"
import { Empty } from "../ui/empty-state"
import { formatSourceYearLabel } from "@/lib/sourceYear"

export interface LatestQuote {
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
}

export interface HomeLatestQuotesProps {
  quotes: LatestQuote[]
}

export function HomeLatestQuotes({ quotes }: HomeLatestQuotesProps) {
  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-rust)]">
            Fresh additions
          </p>
          <h2 className="mt-2 text-2xl font-serif font-bold text-[var(--ink-900)] sm:text-3xl">Latest Quotes</h2>
        </div>
        <Link
          href="/quotes"
          className="rounded-full border border-stone-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-stone-700 shadow-2xs hover:border-[var(--accent-rust)] hover:text-[var(--accent-rust)] transition-colors inline-flex items-center gap-1.5"
        >
          <span>Explore All Additions</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {quotes.length === 0 ? (
        <Empty message="New quotes will appear here when published." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quotes.map((quote, index) => (
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
              variant="paper"
              style={{ animationDelay: `${index * 70}ms` }}
            />
          ))}
        </div>
      )}
    </section>
  )
}
