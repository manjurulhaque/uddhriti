import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PublicLayout, QuoteCard, Breadcrumb, AuthorAvatar } from "@/components/public"
import { Pagination } from "@/components/ui/pagination"
import {
  cleanProfession,
  formatCountWithNoun,
  formatDateOfRecord,
  formatEpoch,
  formatLifespan,
  formatWorkType,
  getCategoryMeta,
  normalizeWikimediaThumbnailUrl,
} from "@/lib/formatters"
import { getSiteUrl } from "@/lib/site"
import { parseSafePageNumber, sanitizeSlug } from "@/lib/security/input"

const QUOTES_PER_PAGE = 12

interface AuthorDetailPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export const revalidate = 300

export async function generateStaticParams() {
  try {
    const topAuthors = await prisma.author.findMany({
      where: { quoteCount: { gt: 0 } },
      orderBy: { quoteCount: "desc" },
      take: 30,
      select: { slug: true },
    })
    return topAuthors.map((a) => ({ slug: a.slug }))
  } catch (error) {
    console.error("Failed to generate static params for authors:", error)
    return []
  }
}

const getAuthorBySlug = React.cache(async (slug: string) => {
  return prisma.author.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      profession: true,
      nationality: true,
      birthYear: true,
      deathYear: true,
      dateOfBirth: true,
      dateOfDeath: true,
      bio: true,
      imageUrl: true,
      quoteCount: true,
      wikipediaUrl: true,
      wikidataId: true,
      sources: {
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          year: true,
          yearLabel: true,
          publisher: true,
          quoteCount: true,
          externalUrl: true,
        },
        take: 6,
        orderBy: [{ quoteCount: "desc" }, { id: "asc" }],
      },
    },
  })
})

export async function generateMetadata({
  params,
}: AuthorDetailPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const author = await getAuthorBySlug(slug)

  if (!author) {
    return { title: "Author Not Found" }
  }

  const desc =
    author.bio?.slice(0, 160) ||
    `Read timeless quotes and philosophical thoughts by ${author.name}${
      author.profession ? `, ${author.profession}` : ""
    }.`
  const authorImageUrl = normalizeWikimediaThumbnailUrl(author.imageUrl)

  return {
    title: `${author.name} Quotes`,
    description: desc,
    alternates: {
      canonical: `/authors/${slug}`,
    },
    openGraph: {
      title: `${author.name} Quotes - Quotzen`,
      description: desc,
      images: authorImageUrl ? [{ url: authorImageUrl, alt: author.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${author.name} Quotes - Quotzen`,
      description: desc,
      images: authorImageUrl ? [authorImageUrl] : undefined,
    },
  }
}

export default async function AuthorDetailPage({
  params,
  searchParams,
}: AuthorDetailPageProps) {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const { page } = await searchParams
  const currentPage = parseSafePageNumber(page, 500)

  const author = await getAuthorBySlug(slug)

  if (!author) {
    notFound()
  }

  const [quotes, relatedAuthors] = await Promise.all([
    prisma.quote.findMany({
      where: {
        authorId: author.id,
        status: "PUBLISHED",
        deletedAt: null,
      },
      orderBy: [{ popularityScore: "desc" }, { id: "asc" }],
      skip: (currentPage - 1) * QUOTES_PER_PAGE,
      take: QUOTES_PER_PAGE,
      select: {
        id: true,
        slug: true,
        content: true,
        authorName: true,
        isVerified: true,
        views: true,
        category: { select: { id: true, name: true, slug: true } },
        source: { select: { title: true, year: true } },
        tags: {
          select: {
            tag: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    prisma.author.findMany({
      where: {
        id: { not: author.id },
        quoteCount: { gt: 0 },
        ...(author.nationality || author.profession
          ? {
              OR: [
                author.profession ? { profession: author.profession } : {},
                author.nationality ? { nationality: author.nationality } : {},
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        profession: true,
        nationality: true,
        birthYear: true,
        deathYear: true,
        imageUrl: true,
        quoteCount: true,
      },
      take: 4,
      orderBy: [{ quoteCount: "desc" }, { name: "asc" }],
    }),
  ])

  // Aggregate active thematic domains directly from quotes
  const categoryCountMap = new Map<string, { id: string; name: string; slug: string; quoteCount: number }>()
  for (const q of quotes) {
    if (q.category) {
      const existing = categoryCountMap.get(q.category.id)
      if (existing) {
        existing.quoteCount++
      } else {
        categoryCountMap.set(q.category.id, {
          id: q.category.id,
          name: q.category.name,
          slug: q.category.slug,
          quoteCount: 1,
        })
      }
    }
  }
  const topCategories = Array.from(categoryCountMap.values()).sort((a, b) => b.quoteCount - a.quoteCount)

  const totalQuotes = author.quoteCount
  const totalPages = Math.ceil(totalQuotes / QUOTES_PER_PAGE)

  const lifespan = formatLifespan(author)
  const epoch = formatEpoch(author.birthYear)
  const authorImageUrl = normalizeWikimediaThumbnailUrl(author.imageUrl)
  const cleanedProfession = cleanProfession(author.profession)
  const dateOfBirthFormatted = formatDateOfRecord(author.dateOfBirth)
  const dateOfDeathFormatted = formatDateOfRecord(author.dateOfDeath)

  const siteUrl = getSiteUrl()
  const authorUrl = `${siteUrl}/authors/${author.slug}`

  const sameAsList: string[] = []
  if (author.wikipediaUrl) sameAsList.push(author.wikipediaUrl)
  if (author.wikidataId) sameAsList.push(`https://www.wikidata.org/wiki/${author.wikidataId}`)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": authorUrl,
    url: authorUrl,
    name: author.name,
    ...(authorImageUrl ? { image: authorImageUrl } : {}),
    ...(author.bio ? { description: author.bio } : {}),
    ...(author.profession ? { jobTitle: author.profession } : {}),
    ...(author.nationality ? { nationality: author.nationality } : {}),
    ...(author.dateOfBirth
      ? { birthDate: author.dateOfBirth.toISOString().split("T")[0] }
      : author.birthYear
        ? { birthDate: String(author.birthYear) }
        : {}),
    ...(author.dateOfDeath
      ? { deathDate: author.dateOfDeath.toISOString().split("T")[0] }
      : author.deathYear
        ? { deathDate: String(author.deathYear) }
        : {}),
    ...(sameAsList.length > 0 ? { sameAs: sameAsList } : {}),
  }

  function buildHref(newPage: number) {
    return `/authors/${slug}${newPage > 1 ? `?page=${newPage}` : ""}`
  }

  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-10 font-sans">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Authors", href: "/authors" },
            { label: author.name },
          ]}
        />

        {/* Author Profile Hero Card */}
        <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden">
          {/* Subtle Ambient Decorative Tint */}
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber-500/10 via-[var(--accent-rust)]/5 to-transparent blur-3xl"
            aria-hidden="true"
          />

          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start relative z-10">
            {/* Portrait Frame or Regal Monogram Seal */}
            <AuthorAvatar
              name={author.name}
              imageUrl={authorImageUrl}
              size="xl"
              priority
              showBadge
              badgeLabel="Thinker"
              className="border-2 border-stone-200/90 shadow-md"
            />

            {/* Author Information */}
            <div className="space-y-4 flex-1">
              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                  {cleanedProfession && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-rust)]">
                      {cleanedProfession}
                    </span>
                  )}
                  {author.nationality && (
                    <span className="text-xs font-medium text-stone-500">
                      {cleanedProfession ? "• " : ""}{author.nationality}
                    </span>
                  )}
                  {lifespan && (
                    <span className="text-xs font-mono font-medium text-stone-500">
                      • {lifespan}
                    </span>
                  )}
                  {epoch && (
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                      {epoch}
                    </span>
                  )}
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
                  {author.name}
                </h1>

                {/* Exact Birth & Death Dates Chronology if Recorded */}
                {(dateOfBirthFormatted || dateOfDeathFormatted) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 font-mono mt-2 pt-1 border-t border-stone-100">
                    {dateOfBirthFormatted && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-stone-400 font-sans font-medium uppercase tracking-wider text-[10px]">Born:</span>
                        <span className="font-medium text-stone-800">{dateOfBirthFormatted}</span>
                      </span>
                    )}
                    {dateOfBirthFormatted && dateOfDeathFormatted && (
                      <span className="text-stone-300">•</span>
                    )}
                    {dateOfDeathFormatted && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-stone-400 font-sans font-medium uppercase tracking-wider text-[10px]">Died:</span>
                        <span className="font-medium text-stone-800">{dateOfDeathFormatted}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Biography */}
              {author.bio && (
                <div className="text-sm sm:text-base text-stone-700 leading-relaxed font-serif max-w-3xl border-l-2 border-[var(--accent-rust)]/40 pl-4 py-1 space-y-2">
                  {author.bio.split("\n\n").map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              )}

              {/* Authority & External Catalog Links */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3.5 py-1 text-xs font-semibold text-stone-800">
                  <span className="text-stone-500">Quotes:</span>
                  <span className="font-bold">{totalQuotes}</span>
                </span>

                {author.sources.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-xs font-semibold text-amber-900">
                    <span className="text-amber-700">Works:</span>
                    <span className="font-bold">{author.sources.length}</span>
                  </span>
                )}

                {author.wikipediaUrl && (
                  <a
                    href={author.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/90 bg-white px-3.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-all shadow-2xs"
                  >
                    <span>Wikipedia</span>
                    <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}

                {author.wikidataId && (
                  <a
                    href={`https://www.wikidata.org/wiki/${author.wikidataId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/90 bg-white px-3.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-all shadow-2xs"
                  >
                    <span>Wikidata ({author.wikidataId})</span>
                    <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Thematic Focus & Philosophical Domains */}
        {topCategories.length > 0 && (
          <section className="space-y-3" aria-labelledby="thematic-focus-heading">
            <div className="flex items-center justify-between border-b border-stone-900/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base" aria-hidden="true">🧭</span>
                <h2 id="thematic-focus-heading" className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[var(--ink-900)]">
                  Thematic Focus &amp; Philosophical Domains
                </h2>
              </div>
              <span className="text-xs text-stone-500 font-mono">
                Explore by category
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {topCategories.map((cat) => {
                const meta = getCategoryMeta(cat.name)
                return (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.slug}`}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-medium transition-all shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 ${meta.border} bg-white hover:bg-stone-50/80 text-stone-800`}
                  >
                    <span className="text-base leading-none" aria-hidden="true">{meta.icon}</span>
                    <span className="font-semibold text-stone-900">{cat.name}</span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-mono font-bold text-stone-600">
                      {cat.quoteCount}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Notable Works & Citations Shelf */}
        {author.sources.length > 0 && (
          <section className="space-y-4" aria-labelledby="notable-works-heading">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-stone-900/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">📖</span>
                <h2 id="notable-works-heading" className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink-900)]">
                  Notable Works &amp; Cited Sources
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                {formatCountWithNoun(author.sources.length, "work")} in library
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {author.sources.map((source) => (
                <div
                  key={source.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs hover:border-[var(--accent-rust)]/40 hover:shadow-sm transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 border border-amber-500/20">
                        {formatWorkType(source.type)}
                      </span>
                      {(source.year || source.yearLabel) && (
                        <span className="font-mono text-xs text-stone-500">
                          {source.yearLabel || (source.year && source.year < 0 ? `${Math.abs(source.year)} BC` : String(source.year))}
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 group-hover:text-[var(--accent-rust)] transition-colors leading-snug">
                      <em>{source.title}</em>
                    </h3>

                    {source.publisher && (
                      <p className="text-xs text-stone-500 line-clamp-1">
                        Pub: {source.publisher}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="font-mono text-stone-600 font-medium">
                      {formatCountWithNoun(source.quoteCount, "quote")}
                    </span>

                    {source.externalUrl && (
                      <a
                        href={source.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[var(--accent-rust)] hover:underline"
                        aria-label={`External reference for ${source.title}`}
                      >
                        <span>Reference</span>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quotes Section */}
        <div className="space-y-6">
          <div className="border-b border-stone-900/10 pb-4 flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--ink-900)]">
              Quotations &amp; Wisdom
            </h2>
            <span className="text-xs text-stone-500 font-mono">
              Showing {quotes.length} of {totalQuotes}
            </span>
          </div>

          {quotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  id={quote.id}
                  slug={quote.slug}
                  content={quote.content}
                  authorName={author.name}
                  authorSlug={author.slug}
                  category={quote.category.name}
                  categorySlug={quote.category.slug}
                  sourceTitle={quote.source?.title}
                  year={quote.source?.year ? String(quote.source.year) : undefined}
                  tags={quote.tags.map((t) => t.tag.name)}
                  views={quote.views}
                  variant="paper"
                  isVerified={quote.isVerified}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-500">
              No quotes published yet for this author.
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalQuotes}
            pageSize={QUOTES_PER_PAGE}
            buildHref={buildHref}
          />
        </div>

        {/* Related Thinkers & Contemporary Voices */}
        {relatedAuthors.length > 0 && (
          <section className="pt-6 border-t border-stone-200/80 space-y-4" aria-labelledby="related-thinkers-heading">
            <div className="flex items-center justify-between">
              <h3 id="related-thinkers-heading" className="font-serif text-xl font-bold text-stone-900">
                Related Thinkers &amp; Contemporary Voices
              </h3>
              <Link
                href="/authors"
                className="text-xs font-semibold text-[var(--accent-rust)] hover:underline"
              >
                Browse All Authors →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {relatedAuthors.map((item) => {
                const itemLifespan = formatLifespan(item)
                const itemCleanProf = cleanProfession(item.profession)

                return (
                  <Link
                    key={item.id}
                    href={`/authors/${item.slug}`}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:border-[var(--accent-rust)]/40 hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="space-y-3">
                      {/* Portrait Thumbnail / Monogram */}
                      <div className="flex items-center gap-3">
                        <AuthorAvatar name={item.name} imageUrl={item.imageUrl} size="sm" />

                        <div className="min-w-0 flex-1">
                          <p className="font-serif font-bold text-stone-900 text-sm group-hover:text-[var(--accent-rust)] transition-colors truncate">
                            {item.name}
                          </p>
                          {itemLifespan && (
                            <p className="text-[11px] font-mono text-stone-500 truncate">
                              {itemLifespan}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Profession & Nationality */}
                      {(item.nationality || itemCleanProf) && (
                        <p className="text-xs text-stone-600 truncate border-t border-stone-100 pt-2">
                          <span className="font-medium">{itemCleanProf ?? "Thinker"}</span>
                          {item.nationality && <span className="text-stone-400"> • {item.nationality}</span>}
                        </p>
                      )}
                    </div>

                    <div className="border-t border-stone-100 pt-2 flex items-center justify-between text-[11px] font-mono text-stone-500">
                      <span>{formatCountWithNoun(item.quoteCount, "quote")}</span>
                      <span className="text-[var(--accent-rust)] font-bold group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </PublicLayout>
  )
}
