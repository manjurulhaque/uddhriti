import Link from "next/link"
import { QuoteCard } from "./quote-card"
import { Empty } from "../ui/empty-state"
import { HeroSearch } from "./hero-search"
import { HeroCompanionQuote } from "./hero-companion-quote"
import { formatSourceYearLabel } from "@/lib/sourceYear"
import { HERO_JUMP_LINKS } from "@/data/home-hero"

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
  tags?: Array<{ tag: { id: string; name: string } }>
  views?: number
  isVerified?: boolean
}

export interface HomeHeroProps {
  totalPublishedQuotes?: number
  heroQuote?: HomeHeroQuote | null
  companionQuotes?: HomeHeroQuote[]
}

export function HomeHero({
  heroQuote,
  companionQuotes = [],
}: HomeHeroProps) {
  return (
    <section className="overflow-hidden [contain:paint] rounded-[2rem] border border-[var(--ink-900)]/10 bg-[var(--ink-900)] text-[var(--page-cream)] shadow-[0_24px_80px_rgba(33,37,41,0.18)] w-full max-w-full">
      <div className="relative isolate w-full max-w-full">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(244,162,97,0.35),_transparent_28%),radial-gradient(circle_at_75%_20%,_rgba(233,196,106,0.24),_transparent_22%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(48,65,86,0.94))]" />
        <div className="pointer-events-none absolute -left-20 top-16 h-56 w-56 rounded-full border border-white/10 bg-white/5 blur-3xl select-none" />
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/4 rounded-full bg-[rgba(244,162,97,0.18)] blur-3xl select-none" />

        <div className="relative grid gap-6 sm:gap-8 px-3.5 py-5 sm:px-8 sm:py-8 lg:grid-cols-[1.35fr_0.85fr] lg:px-12 lg:py-12 w-full max-w-full min-w-0">
          <div className="animate-rise space-y-6 sm:space-y-7 min-w-0">
            {/* Top Reader Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
              <div className="inline-flex items-center gap-2 sm:gap-3 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] sm:tracking-[0.28em] text-white/80 max-w-full">
                <span>Quotations Archive</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)] shrink-0" />
                <span className="truncate">Curated voices</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/quotes/random"
                  prefetch={false}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/15 px-3 py-1.5 sm:px-3.5 sm:py-1.5 text-xs font-semibold text-[var(--accent-gold)] transition hover:bg-[var(--accent-gold)]/25 hover:border-[var(--accent-gold)]/60 hover:scale-[1.02] active:scale-[0.98] shadow-xs"
                  title="Discover a random quotation from the archive"
                >
                  <span className="text-sm">🎲</span>
                  <span>Random Quote</span>
                </Link>
              </div>
            </div>

            {/* Headline and Lead */}
            <div className="max-w-4xl space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm uppercase tracking-[0.18em] sm:tracking-[0.26em] text-[var(--accent-sand)]/90">
                Ideas worth keeping
              </p>
              <h1 className="max-w-4xl text-2xl sm:text-4xl lg:text-6xl xl:text-7xl font-semibold leading-tight sm:leading-[0.98] break-words">
                Build a living library of lines that stay with people.
              </h1>
              <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-white/75 sm:text-base break-words">
                A warm, searchable home for memorable quotations from books, speeches,
                interviews, scripture, and everything that keeps language alive.
              </p>
            </div>

            {/* Prominent Quick-Search Bar */}
            <div className="pt-1">
              <HeroSearch />
            </div>

            {/* Quick Section Anchors */}
            <nav aria-label="Quick section jumps" className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 text-[11px] sm:text-xs text-white/60">
              <span className="text-white/40">Jump to:</span>
              {HERO_JUMP_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 py-1 sm:px-3 sm:py-1 transition-all ${
                    link.featured
                      ? "border border-[var(--accent-gold)]/25 bg-[var(--accent-gold)]/10 text-[var(--accent-sand)] hover:border-[var(--accent-gold)]/40 hover:bg-[var(--accent-gold)]/20 hover:text-white"
                      : "border border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span aria-hidden="true">{link.icon}</span>
                  <span>{link.label}</span>
                </a>
              ))}
            </nav>
          </div>

          <div className="animate-rise-delayed flex flex-col justify-between gap-4 h-full min-w-0">
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
                tags={heroQuote.tags?.map((entry) => entry.tag.name) || []}
                variant="featured"
                badgeLabel="Curator’s Choice"
                className="w-full shadow-lg"
                isVerified={heroQuote.isVerified}
              />
            ) : (
              <div className="w-full rounded-[1.6rem] border border-white/12 bg-white/9 p-4 sm:p-5 backdrop-blur-md">
                <Empty message="Discover timeless quotations from thinkers across eras." variant="dark" />
              </div>
            )}

            {companionQuotes && companionQuotes.length > 0 && (
              <HeroCompanionQuote quotes={companionQuotes} />
            )}

            {/* Sanctuary Reading Quick Strip */}
            <div className="rounded-[1.4rem] border border-white/12 bg-white/6 p-3 sm:p-4 backdrop-blur-md shadow-md transition-all hover:border-white/20 hover:bg-white/9 min-w-0 max-w-full">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-gold)]/20 text-sm" aria-hidden="true">
                    🕊️
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white/90 truncate">Sanctuary Reading Room</p>
                    <p className="text-[11px] text-white/60 truncate">Distraction-free • Offline notebook • Primary sources</p>
                  </div>
                </div>
                <a
                  href="#daily-quote"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 sm:px-3.5 sm:py-1.5 text-xs font-semibold text-[var(--accent-sand)] transition hover:border-[var(--accent-gold)]/50 hover:bg-white/20 hover:text-white ml-auto sm:ml-0"
                  title="Jump to today's contemplative quotation"
                >
                  <span>Today’s Line</span>
                  <span aria-hidden="true">&darr;</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
