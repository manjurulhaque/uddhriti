import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { subtractDays } from "@/lib/datetime"
import { formatSourceYearLabel } from "@/lib/sourceYear"

export const dynamic = "force-dynamic"

const quoteCardSelect = {
  id: true,
  content: true,
  authorName: true,
  views: true,
  category: {
    select: {
      name: true,
    },
  },
  source: {
    select: {
      title: true,
      year: true,
      yearLabel: true,
      yearApproximate: true,
    },
  },
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    take: 4,
  },
} as const

export default async function HomePage() {
  const sevenDaysAgo = subtractDays(new Date(), 7)

  const {
    ok,
    featuredQuote,
    latestQuotes,
    trendingQuotes,
    topCategories,
    topTags,
    recentAuthors,
    totalPublishedQuotes,
    totalAuthors,
    quotesLast7Days,
    errorMessage,
  } = await loadHomePageData(sevenDaysAgo)

  const heroQuote = featuredQuote ?? latestQuotes[0] ?? null
  const standoutCategory = topCategories[0] ?? null

  return (
    <div className="min-h-screen bg-[var(--page-cream)] text-[var(--ink-900)]">
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--ink-900)]/10 bg-[var(--ink-900)] text-[var(--page-cream)] shadow-[0_24px_80px_rgba(33,37,41,0.18)]">
          <div className="relative isolate">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(244,162,97,0.35),_transparent_28%),radial-gradient(circle_at_75%_20%,_rgba(233,196,106,0.24),_transparent_22%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(48,65,86,0.94))]" />
            <div className="absolute -left-20 top-16 h-56 w-56 rounded-full border border-white/10 bg-white/5 blur-3xl" />
            <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/4 rounded-full bg-[rgba(244,162,97,0.18)] blur-3xl" />

            <div className="relative grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.35fr_0.85fr] lg:px-12 lg:py-12">
              <div className="animate-rise space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">
                    Quotations Archive
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)]" />
                    Curated voices
                  </div>

                  <Link
                    href="/admin/login"
                    className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/14"
                  >
                    Admin Login
                  </Link>
                </div>

                <div className="max-w-4xl space-y-5">
                  <p className="text-sm uppercase tracking-[0.26em] text-[var(--accent-sand)]/90">
                    Ideas worth keeping
                  </p>
                  <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] sm:text-5xl lg:text-7xl">
                    Build a living library of lines that stay with people.
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                    A warm, searchable home for memorable quotations from books, speeches,
                    interviews, scripture, and everything that keeps language alive.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <StatTile label="Published Quotes" value={totalPublishedQuotes} tone="light" />
                  <StatTile label="Authors" value={totalAuthors} tone="light" />
                  <StatTile label="Added This Week" value={quotesLast7Days} tone="light" />
                </div>
              </div>

              <div className="animate-rise-delayed flex items-stretch">
                <div className="w-full rounded-[1.6rem] border border-white/12 bg-white/9 p-5 backdrop-blur-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-sand)]">
                    Featured Voice
                  </p>
                  {heroQuote ? (
                    <div className="mt-4 space-y-4">
                      <blockquote className="text-xl leading-9 text-white sm:text-2xl sm:leading-10">
                        &quot;{heroQuote.content}&quot;
                      </blockquote>
                      <QuoteMeta
                        authorName={heroQuote.authorName}
                        category={heroQuote.category?.name}
                        sourceTitle={heroQuote.source?.title}
                        year={formatSourceYearLabel(heroQuote.source)}
                        tags={heroQuote.tags.map((entry) => entry.tag.name)}
                        variant="dark"
                      />
                      <div className="flex items-center justify-between border-t border-white/12 pt-4 text-xs uppercase tracking-[0.16em] text-white/62">
                        <span>{formatNumber(heroQuote.views)} views</span>
                        <span>{heroQuote.tags.length} linked tags</span>
                      </div>
                    </div>
                  ) : (
                    <Empty message="Publish a featured quote to make this space sing." variant="dark" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {!ok ? (
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
                    <div
                      key={category.id}
                      className="flex items-center justify-between rounded-2xl border border-[var(--ink-900)]/8 bg-white/80 px-4 py-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-rust)]/12 text-xs font-semibold text-[var(--accent-rust)]">
                          {index + 1}
                        </span>
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <span className="text-[var(--ink-700)]/70">{formatNumber(category.quoteCount)}</span>
                    </div>
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
                    <div
                      key={author.id}
                      className="flex items-center justify-between rounded-2xl border border-[var(--ink-900)]/8 bg-white/80 px-4 py-3 text-sm"
                    >
                      <span className="font-medium">{author.name}</span>
                      <span className="rounded-full bg-[var(--ink-900)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white">
                        {formatNumber(author.quoteCount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </section>
        </section>

        <section className="mt-8 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel title="Trending Now" subtitle="The quotes currently pulling the most attention." tone="ink">
            {trendingQuotes.length === 0 ? (
              <Empty message="Trending content will appear here." variant="dark" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {trendingQuotes.map((quote, index) => (
                  <article
                    key={quote.id}
                    className="rounded-[1.4rem] border border-white/10 bg-white/6 p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/9"
                  >
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/55">
                      <span>Rank {index + 1}</span>
                      <span>Score {quote.trendingScore.toFixed(2)}</span>
                    </div>
                    <p className="mt-4 line-clamp-4 text-base leading-8 text-white/88">
                      &quot;{quote.content}&quot;
                    </p>
                    <QuoteMeta
                      authorName={quote.authorName}
                      category={quote.category?.name}
                      sourceTitle={quote.source?.title}
                      year={formatSourceYearLabel(quote.source)}
                      tags={quote.tags.map((entry) => entry.tag.name)}
                      className="mt-4"
                      variant="dark"
                    />
                  </article>
                ))}
              </div>
            )}
          </Panel>

          <section className="grid gap-4">
            <Panel title="Popular Tags" subtitle="Fast signals for what the archive is clustering around." tone="paper">
              {topTags.length === 0 ? (
                <Empty message="Tags will appear when quote tagging grows." />
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {topTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-[var(--ink-900)]/10 bg-[var(--page-cream)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-800)]"
                    >
                      {tag.name} / {tag.type} / {formatNumber(tag.quoteCount)}
                    </span>
                  ))}
                </div>
              )}
            </Panel>

            <section className="rounded-[1.6rem] border border-[var(--ink-900)]/10 bg-[linear-gradient(135deg,rgba(233,196,106,0.18),rgba(244,162,97,0.08),rgba(255,255,255,0.9))] p-6 shadow-[0_18px_50px_rgba(33,37,41,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-rust)]">
                Collection Snapshot
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <StatTile label="Visible Now" value={latestQuotes.length} tone="warm" />
                <StatTile label="Tag Clusters" value={topTags.length} tone="warm" />
                <StatTile label="Lead Categories" value={topCategories.length} tone="warm" />
              </div>
            </section>
          </section>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-rust)]">
                Fresh additions
              </p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Latest Quotes</h2>
            </div>
            <p className="rounded-full border border-[var(--ink-900)]/10 bg-white px-4 py-2 text-sm text-[var(--ink-700)]/75">
              {latestQuotes.length} cards shown
            </p>
          </div>

          {latestQuotes.length === 0 ? (
            <Empty message="New quotes will appear here when published." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {latestQuotes.map((quote, index) => (
                <article
                  key={quote.id}
                  className="group rounded-[1.6rem] border border-[var(--ink-900)]/8 bg-white p-5 shadow-[0_14px_36px_rgba(33,37,41,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(33,37,41,0.12)]"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className="animate-rise rounded-[1.2rem] bg-[linear-gradient(180deg,rgba(244,162,97,0.08),rgba(255,255,255,0))] p-0">
                    <p className="line-clamp-5 text-sm leading-7 text-[var(--ink-800)]">
                      &quot;{quote.content}&quot;
                    </p>
                    <QuoteMeta
                      authorName={quote.authorName}
                      category={quote.category?.name}
                      sourceTitle={quote.source?.title}
                      year={formatSourceYearLabel(quote.source)}
                      tags={quote.tags.map((entry) => entry.tag.name)}
                      className="mt-4"
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "light" | "warm"
}) {
  const styles =
    tone === "light"
      ? "border-white/12 bg-white/8 text-white"
      : "border-[var(--ink-900)]/10 bg-white/70 text-[var(--ink-900)]"

  const labelStyles = tone === "light" ? "text-white/62" : "text-[var(--ink-700)]/72"

  return (
    <div className={`rounded-[1.3rem] border p-4 backdrop-blur-sm ${styles}`}>
      <p className={`text-[11px] uppercase tracking-[0.18em] ${labelStyles}`}>{label}</p>
      <p className="mt-2 text-3xl font-semibold">{formatNumber(value)}</p>
    </div>
  )
}

function InsightCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <article className="rounded-[1.4rem] border border-[var(--ink-900)]/8 bg-[var(--page-cream)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-rust)]">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-lg font-semibold text-[var(--ink-900)]">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-[var(--ink-700)]/78">{description}</p>
    </article>
  )
}

function Panel({
  title,
  subtitle,
  children,
  tone = "paper",
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  tone?: "paper" | "sand" | "mist" | "ink"
}) {
  const toneClasses =
    tone === "ink"
      ? "border-[var(--ink-900)]/10 bg-[linear-gradient(180deg,#1f2937,#27364a)] text-white shadow-[0_20px_60px_rgba(33,37,41,0.18)]"
      : tone === "sand"
      ? "border-[var(--ink-900)]/8 bg-[linear-gradient(180deg,#fffdf8,#f5ebd6)] text-[var(--ink-900)]"
      : tone === "mist"
      ? "border-[var(--ink-900)]/8 bg-[linear-gradient(180deg,#ffffff,#edf1f4)] text-[var(--ink-900)]"
      : "border-[var(--ink-900)]/8 bg-white text-[var(--ink-900)]"

  const subtitleClass = tone === "ink" ? "text-white/62" : "text-[var(--ink-700)]/72"

  return (
    <section className={`rounded-[1.75rem] border p-6 shadow-[0_16px_42px_rgba(33,37,41,0.07)] ${toneClasses}`}>
      <h3 className="text-xl font-semibold">{title}</h3>
      {subtitle ? <p className={`mt-2 text-sm leading-7 ${subtitleClass}`}>{subtitle}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Empty({
  message,
  variant = "light",
}: {
  message: string
  variant?: "light" | "dark"
}) {
  const classes =
    variant === "dark"
      ? "border-white/10 bg-white/6 text-white/72"
      : "border-[var(--ink-900)]/10 bg-white text-[var(--ink-700)]/78"

  return <div className={`rounded-[1.4rem] border border-dashed p-6 text-sm ${classes}`}>{message}</div>
}

function QuoteMeta({
  authorName,
  category,
  sourceTitle,
  year,
  tags,
  className = "",
  variant = "light",
}: {
  authorName?: string | null
  category?: string | null
  sourceTitle?: string | null
  year?: string | null
  tags: string[]
  className?: string
  variant?: "light" | "dark"
}) {
  const meta = [category || null, sourceTitle || null, year || null].filter(Boolean)
  const nameClass = variant === "dark" ? "text-white/88" : "text-[var(--ink-800)]"
  const metaClass = variant === "dark" ? "text-white/58" : "text-[var(--ink-700)]/72"
  const tagClass =
    variant === "dark"
      ? "bg-white/10 text-white/76"
      : "bg-[var(--page-cream)] text-[var(--ink-700)]"

  return (
    <div className={className}>
      <p className={`text-sm font-medium ${nameClass}`}>
        {authorName ? `- ${authorName}` : "- Unknown author"}
      </p>
      {meta.length > 0 ? <p className={`mt-1 text-xs ${metaClass}`}>{meta.join(" / ")}</p> : null}
      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tagClass}`}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

async function loadHomePageData(sevenDaysAgo: Date) {
  try {
    const [
      featuredQuote,
      latestQuotes,
      trendingQuotes,
      topCategories,
      topTags,
      recentAuthors,
      totalPublishedQuotes,
      totalAuthors,
      quotesLast7Days,
    ] = await Promise.all([
      prisma.quote.findFirst({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          isFeatured: true,
        },
        orderBy: [{ publishedAt: "desc" }],
        select: quoteCardSelect,
      }),
      prisma.quote.findMany({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
        },
        orderBy: [{ publishedAt: "desc" }],
        take: 8,
        select: quoteCardSelect,
      }),
      prisma.quote.findMany({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
        },
        orderBy: [{ trendingScore: "desc" }, { views: "desc" }],
        take: 4,
        select: {
          ...quoteCardSelect,
          trendingScore: true,
        },
      }),
      prisma.category.findMany({
        where: { quoteCount: { gt: 0 } },
        orderBy: [{ quoteCount: "desc" }, { name: "asc" }],
        take: 6,
        select: {
          id: true,
          name: true,
          quoteCount: true,
        },
      }),
      prisma.tag.findMany({
        where: { quoteCount: { gt: 0 } },
        orderBy: [{ quoteCount: "desc" }, { name: "asc" }],
        take: 8,
        select: {
          id: true,
          name: true,
          type: true,
          quoteCount: true,
        },
      }),
      prisma.author.findMany({
        where: { quoteCount: { gt: 0 } },
        orderBy: [{ quoteCount: "desc" }, { name: "asc" }],
        take: 5,
        select: {
          id: true,
          name: true,
          quoteCount: true,
        },
      }),
      prisma.quote.count({
        where: { status: "PUBLISHED", deletedAt: null },
      }),
      prisma.author.count(),
      prisma.quote.count({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ])

    return {
      ok: true,
      featuredQuote,
      latestQuotes,
      trendingQuotes,
      topCategories,
      topTags,
      recentAuthors,
      totalPublishedQuotes,
      totalAuthors,
      quotesLast7Days,
      errorMessage: null,
    }
  } catch (error) {
    console.error("Failed to load homepage metrics", error)

    return {
      ok: false,
      featuredQuote: null,
      latestQuotes: [],
      trendingQuotes: [],
      topCategories: [],
      topTags: [],
      recentAuthors: [],
      totalPublishedQuotes: 0,
      totalAuthors: 0,
      quotesLast7Days: 0,
      errorMessage: "Some homepage data is temporarily unavailable. The page is still online, but metrics and listings may be incomplete.",
    }
  }
}
