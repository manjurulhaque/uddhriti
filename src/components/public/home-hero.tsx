import Link from "next/link"
import { StatTile } from "./stat-tile"
import { QuoteCard } from "./quote-card"
import { Empty } from "../ui/empty-state"
import { HeroSearch, HeroSavedBadge } from "./hero-search"
import { formatSourceYearLabel } from "@/lib/sourceYear"

export interface HomeHeroQuote {
  id?: string
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
  views?: number
}

export interface HomeHeroProps {
  totalPublishedQuotes: number
  totalAuthors: number
  quotesLast7Days: number
  heroQuote?: HomeHeroQuote | null
}

export function HomeHero({
  totalPublishedQuotes,
  totalAuthors,
  quotesLast7Days,
  heroQuote,
}: HomeHeroProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-[var(--ink-900)]/10 bg-[var(--ink-900)] text-[var(--page-cream)] shadow-[0_24px_80px_rgba(33,37,41,0.18)]">
      <div className="relative isolate">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(244,162,97,0.35),_transparent_28%),radial-gradient(circle_at_75%_20%,_rgba(233,196,106,0.24),_transparent_22%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(48,65,86,0.94))]" />
        <div className="absolute -left-20 top-16 h-56 w-56 rounded-full border border-white/10 bg-white/5 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/4 rounded-full bg-[rgba(244,162,97,0.18)] blur-3xl" />

        <div className="relative grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.35fr_0.85fr] lg:px-12 lg:py-12">
          <div className="animate-rise space-y-7">
            {/* Top Reader Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">
                Quotations Archive
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)]" />
                Curated voices
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/quotes/random"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/15 px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-gold)] transition hover:bg-[var(--accent-gold)]/25 hover:border-[var(--accent-gold)]/60 hover:scale-[1.02] active:scale-[0.98] shadow-xs"
                  title="Discover a random quotation from the archive"
                >
                  <span className="text-sm">🎲</span>
                  <span>Surprise Me</span>
                </Link>

                <HeroSavedBadge />
              </div>
            </div>

            {/* Headline and Lead */}
            <div className="max-w-4xl space-y-4">
              <p className="text-sm uppercase tracking-[0.26em] text-[var(--accent-sand)]/90">
                Ideas worth keeping
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold leading-[0.98] sm:text-5xl lg:text-6xl xl:text-7xl">
                Build a living library of lines that stay with people.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
                A warm, searchable home for memorable quotations from books, speeches,
                interviews, scripture, and everything that keeps language alive.
              </p>
            </div>

            {/* Prominent Quick-Search Bar */}
            <div className="pt-1">
              <HeroSearch totalQuotes={totalPublishedQuotes} />
            </div>

            {/* Quick Section Anchors */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-white/60">
              <span className="text-white/40">Jump to:</span>
              <a
                href="#trending"
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:border-white/25 hover:bg-white/10 hover:text-white transition-colors"
              >
                <span>🔥 Trending Now</span>
              </a>
              <a
                href="#highlights"
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:border-white/25 hover:bg-white/10 hover:text-white transition-colors"
              >
                <span>🏛️ Curated Voices</span>
              </a>
              <a
                href="#latest"
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:border-white/25 hover:bg-white/10 hover:text-white transition-colors"
              >
                <span>✨ Fresh Additions</span>
              </a>
            </div>

            {/* Stats Row */}
            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              <StatTile label="Published Quotes" value={totalPublishedQuotes} tone="light" />
              <StatTile label="Authors" value={totalAuthors} tone="light" />
              <StatTile label="Added This Week" value={quotesLast7Days} tone="light" />
            </div>
          </div>

          <div className="animate-rise-delayed flex items-stretch">
            {heroQuote ? (
              <QuoteCard
                id={heroQuote.id}
                slug={heroQuote.slug}
                content={heroQuote.content}
                authorName={heroQuote.author?.name || heroQuote.authorName}
                authorSlug={heroQuote.author?.slug}
                category={heroQuote.category?.name}
                categorySlug={heroQuote.category?.slug}
                sourceTitle={heroQuote.source?.title}
                year={formatSourceYearLabel(heroQuote.source)}
                tags={heroQuote.tags.map((entry) => entry.tag.name)}
                views={heroQuote.views}
                variant="featured"
                className="w-full"
              />
            ) : (
              <div className="w-full rounded-[1.6rem] border border-white/12 bg-white/9 p-5 backdrop-blur-md">
                <Empty message="Publish a featured quote to make this space sing." variant="dark" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
