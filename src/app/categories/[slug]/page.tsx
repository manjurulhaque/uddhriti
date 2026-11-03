import * as React from "react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PublicLayout, QuoteCard } from "@/components/public"
import { Pagination } from "@/components/ui/pagination"
import {
  cleanProfession,
  formatCountWithNoun,
  formatLifespan,
  getAuthorInitials,
  getCategoryMeta,
} from "@/lib/formatters"
import { getSiteUrl } from "@/lib/site"
import { parseSafePageNumber, sanitizeSlug } from "@/lib/security/input"

const QUOTES_PER_PAGE = 12

type SortKey = "popular" | "newest" | "views" | "verified"

const VALID_SORT_KEYS: readonly SortKey[] = ["popular", "newest", "views", "verified"]

interface CategoryDetailPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    page?: string
    sort?: string
    author?: string
  }>
}

export const revalidate = 300

export async function generateStaticParams() {
  try {
    const categories = await prisma.category.findMany({
      where: { quoteCount: { gt: 0 } },
      select: { slug: true },
    })
    return categories.map((c) => ({ slug: c.slug }))
  } catch (error) {
    console.error("Failed to generate static params for categories:", error)
    return []
  }
}

export async function generateMetadata({
  params,
}: CategoryDetailPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { name: true, description: true, metaTitle: true, metaDescription: true, quoteCount: true },
  })

  if (!category) {
    return { title: "Category Not Found" }
  }

  const title = category.metaTitle || `${category.name} Quotes - Timeless Wisdom & Insights`
  const description =
    category.metaDescription ||
    category.description ||
    `Explore memorable quotations, philosophical passages, and aphorisms about ${category.name.toLowerCase()}.`

  return {
    title,
    description,
    alternates: {
      canonical: `/categories/${slug}`,
    },
    openGraph: {
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: CategoryDetailPageProps) {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const resolvedSearchParams = await searchParams
  const currentPage = parseSafePageNumber(resolvedSearchParams.page, 500)

  const rawSort = resolvedSearchParams.sort?.toLowerCase() as SortKey | undefined
  const currentSort: SortKey = rawSort && VALID_SORT_KEYS.includes(rawSort) ? rawSort : "popular"

  const selectedAuthorSlug = resolvedSearchParams.author
    ? sanitizeSlug(resolvedSearchParams.author, 150)
    : null

  const category = await prisma.category.findUnique({
    where: { slug },
  })

  if (!category) {
    notFound()
  }

  // If author filter is active, fetch author details for display
  const selectedAuthor = selectedAuthorSlug
    ? await prisma.author.findUnique({
        where: { slug: selectedAuthorSlug },
        select: { id: true, name: true, slug: true, profession: true },
      })
    : null

  // Build filter where clause
  const whereClause: {
    categoryId: string
    status: "PUBLISHED"
    deletedAt: null
    isVerified?: boolean
    authorId?: string
  } = {
    categoryId: category.id,
    status: "PUBLISHED",
    deletedAt: null,
  }

  if (currentSort === "verified") {
    whereClause.isVerified = true
  }

  if (selectedAuthor) {
    whereClause.authorId = selectedAuthor.id
  }

  // Build order clause
  let orderByClause: Record<string, "desc" | "asc"> = { popularityScore: "desc" }
  if (currentSort === "newest") {
    orderByClause = { createdAt: "desc" }
  } else if (currentSort === "views") {
    orderByClause = { views: "desc" }
  }

  const [totalQuotes, quotes, authorGroups, tagGroups, siblingCategories] = await Promise.all([
    prisma.quote.count({ where: whereClause }),
    prisma.quote.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip: (currentPage - 1) * QUOTES_PER_PAGE,
      take: QUOTES_PER_PAGE,
      include: {
        author: { select: { name: true, slug: true } },
        source: { select: { title: true, year: true } },
        tags: {
          select: {
            tag: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    prisma.quote.groupBy({
      by: ["authorId"],
      where: {
        categoryId: category.id,
        status: "PUBLISHED",
        deletedAt: null,
        authorId: { not: null },
      },
      _count: { authorId: true },
      orderBy: { _count: { authorId: "desc" } },
      take: 6,
    }),
    prisma.quoteTag.groupBy({
      by: ["tagId"],
      where: {
        quote: {
          categoryId: category.id,
          status: "PUBLISHED",
          deletedAt: null,
        },
      },
      _count: { tagId: true },
      orderBy: { _count: { tagId: "desc" } },
      take: 10,
    }),
    prisma.category.findMany({
      where: {
        id: { not: category.id },
        quoteCount: { gt: 0 },
      },
      select: { id: true, name: true, slug: true, quoteCount: true },
      take: 6,
      orderBy: { quoteCount: "desc" },
    }),
  ])

  // Resolve author metadata for top authors in this theme
  const authorIds = authorGroups
    .map((g) => g.authorId)
    .filter((id): id is string => Boolean(id))

  const authorRecords =
    authorIds.length > 0
      ? await prisma.author.findMany({
          where: { id: { in: authorIds } },
          select: {
            id: true,
            name: true,
            slug: true,
            profession: true,
            nationality: true,
            birthYear: true,
            deathYear: true,
            imageUrl: true,
          },
        })
      : []

  const authorMap = new Map(authorRecords.map((a) => [a.id, a]))
  const topAuthors = authorGroups
    .map((g) => {
      if (!g.authorId) return null
      const author = authorMap.get(g.authorId)
      if (!author) return null
      return {
        ...author,
        categoryQuoteCount: g._count.authorId,
      }
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)

  // Resolve tag metadata for nuance topics
  const tagIds = tagGroups.map((g) => g.tagId)
  const tagRecords =
    tagIds.length > 0
      ? await prisma.tag.findMany({
          where: { id: { in: tagIds } },
          select: { id: true, name: true, slug: true },
        })
      : []

  const tagMap = new Map(tagRecords.map((t) => [t.id, t]))
  const topTags = tagGroups
    .map((g) => {
      const tag = tagMap.get(g.tagId)
      if (!tag) return null
      return {
        ...tag,
        quoteCount: g._count.tagId,
      }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)

  const totalPages = Math.ceil(totalQuotes / QUOTES_PER_PAGE)
  const meta = getCategoryMeta(category.name)

  const siteUrl = getSiteUrl()
  const categoryUrl = `${siteUrl}/categories/${category.slug}`

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": categoryUrl,
    url: categoryUrl,
    name: `${category.name} Quotes & Philosophical Wisdom`,
    description:
      category.description ||
      `Explore timeless quotations and reflections on ${category.name.toLowerCase()}.`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: totalQuotes,
      itemListElement: quotes.slice(0, 10).map((quote, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "Quotation",
          text: quote.content,
          creator: {
            "@type": "Person",
            name: quote.author?.name || quote.authorName,
          },
          url: `${siteUrl}/quotes/${quote.slug}`,
        },
      })),
    },
  }

  function buildHref(newPage: number, newSort?: SortKey, newAuthor?: string | null) {
    const query = new URLSearchParams()
    if (newPage > 1) query.set("page", String(newPage))
    const targetSort = newSort !== undefined ? newSort : currentSort
    if (targetSort && targetSort !== "popular") query.set("sort", targetSort)
    const targetAuthor = newAuthor !== undefined ? newAuthor : selectedAuthorSlug
    if (targetAuthor) query.set("author", targetAuthor)
    const qs = query.toString()
    return `/categories/${slug}${qs ? `?${qs}` : ""}`
  }

  const sortOptions: { key: SortKey; label: string; icon: string }[] = [
    { key: "popular", label: "Popular", icon: "🔥" },
    { key: "newest", label: "Newest", icon: "✨" },
    { key: "views", label: "Most Viewed", icon: "👁" },
    { key: "verified", label: "Verified Only", icon: "🛡️" },
  ]

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
        <nav aria-label="Breadcrumb" className="text-xs text-stone-500 flex items-center gap-2">
          <Link href="/" className="hover:text-stone-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/categories" className="hover:text-stone-900 transition-colors">
            Categories
          </Link>
          <span>/</span>
          <span className="font-semibold text-stone-900 truncate">{category.name}</span>
        </nav>

        {/* Thematic Category Hero Card */}
        <div
          className={`relative overflow-hidden rounded-3xl border ${meta.border} bg-white p-6 sm:p-8 lg:p-10 shadow-xs`}
        >
          {/* Ambient Archetype Gradient */}
          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${meta.gradient} opacity-80`}
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
            {/* Archetype Icon Emblem */}
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-white border border-stone-200/90 shadow-sm text-4xl sm:text-5xl">
              <span role="img" aria-label={category.name}>
                {meta.icon}
              </span>
            </div>

            <div className="space-y-4 flex-1">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-rust)]">
                    Philosophical Domain
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.badge}`}>
                    Thematic Hub
                  </span>
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
                  {category.name}
                </h1>
              </div>

              <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-serif max-w-3xl">
                {category.description ||
                  `A curated treasury of philosophical passages, timeless maxims, and contemplative insights exploring ${category.name.toLowerCase()}.`}
              </p>

              {/* Stat Ribbon */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-800">
                  <span className="text-stone-500">Archived:</span>
                  <span className="font-bold">{formatCountWithNoun(category.quoteCount, "quote")}</span>
                </span>

                {topAuthors.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-stone-200/80 px-3 py-1 text-xs font-semibold text-stone-700">
                    <span className="text-stone-400">Voices:</span>
                    <span>{topAuthors.length}+ leading thinkers</span>
                  </span>
                )}

                {topTags.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-stone-200/80 px-3 py-1 text-xs font-semibold text-stone-700">
                    <span className="text-stone-400">Subtopics:</span>
                    <span>{topTags.length} related topics</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Key Thinkers in this Theme */}
        {topAuthors.length > 0 && (
          <section className="space-y-4" aria-labelledby="key-thinkers-heading">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-stone-900/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">🏛️</span>
                <h2 id="key-thinkers-heading" className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink-900)]">
                  Leading Thinkers on {category.name}
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Click any thinker to filter quotes below
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topAuthors.map((author) => {
                const isCurrentFilter = selectedAuthor?.id === author.id
                const authorLifespan = formatLifespan(author)
                const authorCleanProf = cleanProfession(author.profession)
                const authorInitials = getAuthorInitials(author.name)

                return (
                  <div
                    key={author.id}
                    className={`group relative flex items-center justify-between overflow-hidden rounded-2xl border p-4 transition-all ${
                      isCurrentFilter
                        ? "border-amber-600 bg-amber-50/70 shadow-xs ring-2 ring-amber-500/20"
                        : "border-stone-200/90 bg-white hover:border-[var(--accent-rust)]/40 hover:shadow-xs"
                    }`}
                  >
                    <Link
                      href={buildHref(1, currentSort, isCurrentFilter ? null : author.slug)}
                      className="flex items-center gap-3.5 min-w-0 flex-1"
                      title={
                        isCurrentFilter
                          ? "Remove thinker filter"
                          : `Filter quotes by ${author.name}`
                      }
                    >
                      {/* Portrait or Initials Avatar */}
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-2xs">
                        {author.imageUrl ? (
                          <Image
                            src={author.imageUrl}
                            alt={author.name}
                            fill
                            sizes="48px"
                            unoptimized
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-serif text-sm font-bold text-[var(--accent-rust)] bg-gradient-to-br from-amber-50 to-[#faf3e8]">
                            {authorInitials}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-serif font-bold text-stone-900 text-sm group-hover:text-[var(--accent-rust)] transition-colors truncate">
                            {author.name}
                          </p>
                          {isCurrentFilter && (
                            <span className="rounded-full bg-amber-200 px-1.5 py-0.2 text-[9px] font-bold text-amber-900">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-stone-500 truncate">
                          {authorCleanProf ?? "Thinker"}
                          {authorLifespan && ` • ${authorLifespan}`}
                        </p>

                        <p className="text-[11px] font-mono font-semibold text-[var(--accent-rust)] mt-0.5">
                          {formatCountWithNoun(author.categoryQuoteCount, "quote")} on {category.name}
                        </p>
                      </div>
                    </Link>

                    {/* Link to Author Profile */}
                    <Link
                      href={`/authors/${author.slug}`}
                      className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                      title={`View full profile of ${author.name}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Nuance Subtopics & Co-occurring Tags */}
        {topTags.length > 0 && (
          <section className="space-y-3" aria-labelledby="subtopics-heading">
            <div className="flex items-center justify-between border-b border-stone-900/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base" aria-hidden="true">🏷️</span>
                <h2 id="subtopics-heading" className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[var(--ink-900)]">
                  Nuance Subtopics &amp; Themes
                </h2>
              </div>
              <span className="text-xs text-stone-500 font-mono">
                Explore related concepts
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {topTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tags/${tag.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/90 bg-white px-3 py-1 text-xs text-stone-800 hover:border-stone-400 hover:bg-stone-50 shadow-2xs transition-all"
                >
                  <span className="font-medium">{tag.name}</span>
                  <span className="text-[10px] font-mono text-stone-400 font-bold">
                    {tag.quoteCount}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Quotes Section with Toolbar */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-900/10 pb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--ink-900)]">
                Quotations &amp; Wisdom on {category.name}
              </h2>
              <span className="text-xs text-stone-500 font-mono">
                Showing {quotes.length} of {formatCountWithNoun(totalQuotes, "quote")}
                {selectedAuthor ? ` by ${selectedAuthor.name}` : ""}
              </span>
            </div>

            {/* Sort Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              {sortOptions.map((opt) => {
                const isActive = currentSort === opt.key
                return (
                  <Link
                    key={opt.key}
                    href={buildHref(1, opt.key)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-stone-900 text-white shadow-xs"
                        : "border border-stone-200/90 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Active Author Filter Pill Banner */}
          {selectedAuthor && (
            <div className="flex items-center justify-between rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Filtered by Thinker:</span>
                <span className="font-bold underline">{selectedAuthor.name}</span>
                <span className="text-stone-500">
                  ({totalQuotes} quotes found in {category.name})
                </span>
              </div>

              <Link
                href={buildHref(1, currentSort, null)}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 border border-amber-300 shadow-2xs transition-colors"
              >
                <span>Clear Filter</span>
                <span aria-hidden="true">✕</span>
              </Link>
            </div>
          )}

          {/* Quotations Grid */}
          {quotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  id={quote.id}
                  slug={quote.slug}
                  content={quote.content}
                  authorName={quote.author?.name || quote.authorName}
                  authorSlug={quote.author?.slug}
                  category={category.name}
                  categorySlug={category.slug}
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
            <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-500 space-y-3">
              <p className="font-serif text-lg font-bold text-stone-800">
                No quotations found matching this criteria.
              </p>
              {selectedAuthor && (
                <div>
                  <Link
                    href={buildHref(1, currentSort, null)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-rust)] hover:underline"
                  >
                    Clear thinker filter to see all quotes in {category.name} →
                  </Link>
                </div>
              )}
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

        {/* Sibling Categories Exploration */}
        {siblingCategories.length > 0 && (
          <section className="pt-6 border-t border-stone-200/80 space-y-4" aria-labelledby="sibling-categories-heading">
            <div className="flex items-center justify-between">
              <h3 id="sibling-categories-heading" className="font-serif text-xl font-bold text-stone-900">
                Explore More Thematic Domains
              </h3>
              <Link
                href="/categories"
                className="text-xs font-semibold text-[var(--accent-rust)] hover:underline"
              >
                Browse All Themes →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {siblingCategories.map((item) => {
                const sibMeta = getCategoryMeta(item.name)
                return (
                  <Link
                    key={item.id}
                    href={`/categories/${item.slug}`}
                    className={`group rounded-2xl border ${sibMeta.border} bg-white p-3.5 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all space-y-1.5 block text-center`}
                  >
                    <span className="text-xl block transition-transform group-hover:scale-110">
                      {sibMeta.icon}
                    </span>
                    <p className="font-serif font-bold text-stone-900 text-xs hover:text-[var(--accent-rust)] transition-colors line-clamp-1">
                      {item.name}
                    </p>
                    <p className="text-[10px] font-mono text-stone-400">
                      {formatCountWithNoun(item.quoteCount, "quote")}
                    </p>
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
