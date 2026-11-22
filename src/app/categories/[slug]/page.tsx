import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import {
  PublicLayout,
  JsonLd,
  QuoteCard,
  Breadcrumb,
  TaxonomyHero,
  ThinkerShelf,
  SortToolbar,
  ActiveFilterBanner,
} from "@/components/public"
import { Pagination } from "@/components/ui/pagination"
import { formatCountWithNoun, getCategoryMeta } from "@/lib/formatters"
import { getSiteUrl } from "@/lib/site"
import { parseSafePageNumber, sanitizeSlug } from "@/lib/security/input"
import { BoundedMemoryCache } from "@/lib/cache/bounded-cache"
import { publicQuoteCardSelect, type PublicQuoteCardItem } from "@/lib/quotes/selects"

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
  if (process.env.NODE_ENV === "development") {
    return []
  }

  try {
    const categories = await prisma.category.findMany({
      where: { quoteCount: { gt: 0 } },
      select: { slug: true },
    })
    if (!Array.isArray(categories)) return []
    return categories
      .filter((c) => typeof c?.slug === "string" && c.slug.trim().length > 0)
      .map((c) => ({ slug: c.slug.trim() }))
  } catch (error) {
    console.error("Failed to generate static params for categories:", error)
    return []
  }
}

const getCategoryBySlug = React.cache(async (slug: string) => {
  return prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      metaTitle: true,
      metaDescription: true,
      quoteCount: true,
    },
  })
})

interface CategoryTaxonomyAuthor {
  id: string
  name: string
  slug: string
  profession: string | null
  nationality: string | null
  birthYear: number | null
  deathYear: number | null
  imageUrl: string | null
  categoryQuoteCount: number
}

interface CategoryTaxonomyTag {
  id: string
  name: string
  slug: string
  quoteCount: number
}

interface CategoryTaxonomySibling {
  id: string
  name: string
  slug: string
  quoteCount: number
}

interface CategoryTaxonomy {
  topAuthors: CategoryTaxonomyAuthor[]
  topTags: CategoryTaxonomyTag[]
  siblingCategories: CategoryTaxonomySibling[]
}

const TAXONOMY_TTL_MS = 15 * 60 * 1000 // 15 mins
const MAX_TAXONOMY_CACHE_ENTRIES = 80

const taxonomyCache = new BoundedMemoryCache<string, CategoryTaxonomy>({
  maxSize: MAX_TAXONOMY_CACHE_ENTRIES,
  ttlMs: TAXONOMY_TTL_MS,
})

const categoryPage1Cache = new BoundedMemoryCache<
  string,
  { quotes: PublicQuoteCardItem[]; totalQuotes: number }
>({
  maxSize: MAX_TAXONOMY_CACHE_ENTRIES,
  ttlMs: TAXONOMY_TTL_MS,
})

async function loadCategoryTaxonomy(categoryId: string): Promise<CategoryTaxonomy> {
  const cached = taxonomyCache.get(categoryId)
  if (cached) {
    return cached
  }

  const [authorGroups, tagGroups, siblingCategories] = await Promise.all([
    prisma.quote.groupBy({
      by: ["authorId"],
      where: {
        categoryId,
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
          categoryId,
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
        id: { not: categoryId },
        quoteCount: { gt: 0 },
      },
      select: { id: true, name: true, slug: true, quoteCount: true },
      take: 6,
      orderBy: [{ quoteCount: "desc" }, { name: "asc" }],
    }),
  ])

  const authorIds = authorGroups
    .map((g) => g.authorId)
    .filter((id): id is string => Boolean(id))

  const tagIds = tagGroups.map((g) => g.tagId)

  const [authorRecords, tagRecords] = await Promise.all([
    authorIds.length > 0
      ? prisma.author.findMany({
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
      : Promise.resolve([]),
    tagIds.length > 0
      ? prisma.tag.findMany({
          where: { id: { in: tagIds } },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
  ])

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

  const data: CategoryTaxonomy = {
    topAuthors,
    topTags,
    siblingCategories,
  }

  taxonomyCache.set(categoryId, data)
  return data
}

async function loadCategoryQuotesData({
  categoryId,
  categoryQuoteCount,
  selectedAuthorId,
  currentSort,
  currentPage,
  whereClause,
  orderByClause,
}: {
  categoryId: string
  categoryQuoteCount: number
  selectedAuthorId?: string
  currentSort: string
  currentPage: number
  whereClause: {
    categoryId: string
    status: "PUBLISHED"
    deletedAt: null
    isVerified?: boolean
    authorId?: string
  }
  orderByClause: Array<Record<string, "desc" | "asc">>
}): Promise<{
  totalQuotes: number
  quotes: PublicQuoteCardItem[]
  taxonomy: CategoryTaxonomy
}> {
  const isDefaultBrowse = !selectedAuthorId && currentSort === "popular" && currentPage === 1

  const cachedPage = isDefaultBrowse ? categoryPage1Cache.get(categoryId) : null
  if (cachedPage) {
    const taxonomy = await loadCategoryTaxonomy(categoryId)
    return {
      totalQuotes: cachedPage.totalQuotes,
      quotes: cachedPage.quotes,
      taxonomy,
    }
  }

  const isDefaultCount = !selectedAuthorId && currentSort !== "verified"

  const [fetchedTotal, fetchedQuotes, fetchedTaxonomy] = await Promise.all([
    isDefaultCount ? Promise.resolve(categoryQuoteCount) : prisma.quote.count({ where: whereClause }),
    prisma.quote.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip: (currentPage - 1) * QUOTES_PER_PAGE,
      take: QUOTES_PER_PAGE,
      select: publicQuoteCardSelect,
    }),
    loadCategoryTaxonomy(categoryId),
  ])

  if (isDefaultBrowse) {
    categoryPage1Cache.set(categoryId, {
      quotes: fetchedQuotes,
      totalQuotes: fetchedTotal,
    })
  }

  return {
    totalQuotes: fetchedTotal,
    quotes: fetchedQuotes,
    taxonomy: fetchedTaxonomy,
  }
}

export async function generateMetadata({
  params,
}: CategoryDetailPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const category = await getCategoryBySlug(slug)

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

  const category = await getCategoryBySlug(slug)

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

  let orderByClause: Array<Record<string, "desc" | "asc">> = [{ popularityScore: "desc" }, { id: "asc" }]
  if (currentSort === "newest") {
    orderByClause = [{ createdAt: "desc" }, { id: "asc" }]
  } else if (currentSort === "views") {
    orderByClause = [{ views: "desc" }, { id: "asc" }]
  }

  const { totalQuotes, quotes, taxonomy } = await loadCategoryQuotesData({
    categoryId: category.id,
    categoryQuoteCount: category.quoteCount,
    selectedAuthorId: selectedAuthor?.id,
    currentSort,
    currentPage,
    whereClause,
    orderByClause,
  })

  const { topAuthors, topTags, siblingCategories } = taxonomy

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
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-10 font-sans">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Categories", href: "/categories" },
            { label: category.name },
          ]}
        />

        {/* Thematic Category Hero */}
        <TaxonomyHero
          title={category.name}
          kicker="Philosophical Domain"
          badgeLabel="Thematic Hub"
          badgeClass={meta.badge}
          icon={meta.icon}
          gradient={meta.gradient}
          border={meta.border}
          action={
            <Link
              href="/quotes/random"
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-300/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-stone-400 hover:bg-white hover:text-stone-900 transition-all shadow-2xs"
              title="Discover a random quotation from the archive"
            >
              <span className="text-sm" aria-hidden="true">🎲</span>
              <span>Random Quote</span>
            </Link>
          }
          description={
            category.description ||
            `A curated treasury of philosophical passages, timeless maxims, and contemplative insights exploring ${category.name.toLowerCase()}.`
          }
          stats={[
            {
              label: "Archived",
              value: formatCountWithNoun(category.quoteCount, "quote"),
              isPrimary: true,
            },
            ...(topAuthors.length > 0
              ? [
                  {
                    label: "Voices",
                    value: `${topAuthors.length}+ leading thinkers`,
                  },
                ]
              : []),
            ...(topTags.length > 0
              ? [
                  {
                    label: "Subtopics",
                    value: `${topTags.length} related topics`,
                  },
                ]
              : []),
          ]}
        />

        {/* Key Thinkers in this Theme */}
        <ThinkerShelf
          title={`Leading Thinkers on ${category.name}`}
          subtitle="Click any thinker to filter quotes below"
          icon="🏛️"
          thinkers={topAuthors.map((a) => ({
            ...a,
            quoteCount: a.categoryQuoteCount,
          }))}
          selectedAuthorId={selectedAuthor?.id}
          getFilterHref={(author, isCurrentFilter) =>
            buildHref(1, currentSort, isCurrentFilter ? null : author.slug)
          }
          contextLabel={`on ${category.name}`}
        />

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
            <SortToolbar
              options={sortOptions}
              currentSort={currentSort}
              buildSortHref={(sortKey) => buildHref(1, sortKey as SortKey)}
            />
          </div>

          {/* Active Author Filter Pill Banner */}
          <ActiveFilterBanner
            filters={selectedAuthor ? [{ label: "Thinker", value: selectedAuthor.name }] : []}
            countNote={`${totalQuotes} quotes found in ${category.name}`}
            clearHref={buildHref(1, currentSort, null)}
            clearLabel="Clear Filter"
          />

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
