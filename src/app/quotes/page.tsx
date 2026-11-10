import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { PublicLayout, QuoteCard, SortToolbar, FilterPills } from "@/components/public"
import { Pagination } from "@/components/ui/pagination"
import { formatCountWithNoun } from "@/lib/formatters"
import { parseSafePageNumber, sanitizeSearchQuery, sanitizeSlug } from "@/lib/security/input"
import { searchPublicQuoteIds } from "@/lib/quotes/search"
import { BoundedMemoryCache } from "@/lib/cache/bounded-cache"
import { publicQuoteCardSelect, type PublicQuoteCardItem } from "@/lib/quotes/selects"

export const metadata: Metadata = {
  title: "Browse All Quotations",
  description:
    "Explore our complete searchable archive of timeless quotations, curated philosophical fragments, and memorable passages.",
}

export const revalidate = 300

const PAGE_SIZE = 18

interface FilterCategory {
  id: string
  name: string
  slug: string
  quoteCount: number
}

const filterCategoriesCache = new BoundedMemoryCache<string, FilterCategory[]>({
  maxSize: 1,
  ttlMs: 15 * 60 * 1000,
})

const defaultQuotesPageCache = new BoundedMemoryCache<
  string,
  { quotes: PublicQuoteCardItem[]; totalQuotes: number }
>({
  maxSize: 1,
  ttlMs: 5 * 60 * 1000,
})

async function getFilterCategories(): Promise<FilterCategory[]> {
  const cached = filterCategoriesCache.get("categories")
  if (cached) {
    return cached
  }
  const categories = await prisma.category.findMany({
    where: { quoteCount: { gt: 0 } },
    select: { id: true, name: true, slug: true, quoteCount: true },
    orderBy: [{ quoteCount: "desc" }, { name: "asc" }],
  })
  filterCategoriesCache.set("categories", categories)
  return categories
}

async function loadQuotesBrowseData({
  currentPage,
  searchQuery,
  categorySlug,
  selectedSort,
}: {
  currentPage: number
  searchQuery?: string
  categorySlug?: string
  selectedSort: string
}) {
  const isDefaultBrowse = !searchQuery && !categorySlug && selectedSort === "trending" && currentPage === 1

  if (isDefaultBrowse) {
    const cached = defaultQuotesPageCache.get("default-page-1")
    if (cached) {
      const categories = await getFilterCategories()
      return {
        totalQuotes: cached.totalQuotes,
        quotes: cached.quotes,
        categories,
      }
    }
  }

  // Build where filter
  const whereConditions: {
    status: "PUBLISHED"
    deletedAt: null
    categorySlug?: string
    isFeatured?: boolean
    id?: { in: string[] }
    OR?: Array<{
      content?: { contains: string; mode: "insensitive" }
      authorName?: { contains: string; mode: "insensitive" }
    }>
  } = {
    status: "PUBLISHED",
    deletedAt: null,
  }

  if (categorySlug) {
    whereConditions.categorySlug = categorySlug
  }

  if (selectedSort === "featured") {
    whereConditions.isFeatured = true
  }

  if (searchQuery) {
    const matchingQuoteIds = await searchPublicQuoteIds(searchQuery, {
      categorySlug,
      limit: 1000,
    })
    if (matchingQuoteIds !== null) {
      whereConditions.id = { in: matchingQuoteIds }
    } else {
      whereConditions.OR = [
        { content: { contains: searchQuery, mode: "insensitive" } },
        { authorName: { contains: searchQuery, mode: "insensitive" } },
      ]
    }
  }

  // Determine order by
  let orderBy: Record<string, "asc" | "desc"> = { trendingScore: "desc" }
  if (selectedSort === "latest") {
    orderBy = { publishedAt: "desc" }
  } else if (selectedSort === "popular") {
    orderBy = { views: "desc" }
  } else if (selectedSort === "rank") {
    orderBy = { rankScore: "desc" }
  }

  const [categories, totalQuotes, quotes] = await Promise.all([
    getFilterCategories(),
    prisma.quote.count({ where: whereConditions }),
    prisma.quote.findMany({
      where: whereConditions,
      orderBy,
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: publicQuoteCardSelect,
    }),
  ])

  if (isDefaultBrowse) {
    defaultQuotesPageCache.set("default-page-1", {
      quotes,
      totalQuotes,
    })
  }

  return { totalQuotes, quotes, categories }
}

interface QuotesBrowsePageProps {
  searchParams: Promise<{
    q?: string
    category?: string
    sort?: string
    page?: string
  }>
}

export default async function QuotesBrowsePage({
  searchParams,
}: QuotesBrowsePageProps) {
  const { q, category: rawCategorySlug, sort, page } = await searchParams
  const currentPage = parseSafePageNumber(page, 500)
  const searchQuery = sanitizeSearchQuery(q, 100)
  const categorySlug = rawCategorySlug ? sanitizeSlug(rawCategorySlug, 100) : undefined
  const selectedSort = sort?.toLowerCase() || "trending"

  const { totalQuotes, quotes, categories } = await loadQuotesBrowseData({
    currentPage,
    searchQuery,
    categorySlug,
    selectedSort,
  })

  const totalPages = Math.ceil(totalQuotes / PAGE_SIZE)

  function buildHref(newPage: number) {
    const params = new URLSearchParams()
    if (searchQuery) params.set("q", searchQuery)
    if (categorySlug) params.set("category", categorySlug)
    if (selectedSort !== "trending") params.set("sort", selectedSort)
    if (newPage > 1) params.set("page", String(newPage))
    const qs = params.toString()
    return `/quotes${qs ? `?${qs}` : ""}`
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 space-y-8 font-sans">
        {/* Editorial Header */}
        <div className="border-b border-stone-900/10 pb-6 sm:pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-rust)]">
              Curated Archive
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-900)]">
              Explore Quotations
            </h1>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-serif">
              Search, filter, and discover timeless thoughts across philosophies, authors, and centuries.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-stone-500 bg-white/70 rounded-full px-4 py-2 border border-stone-200 shadow-2xs self-start md:self-end">
            <span>Archive:</span>
            <span className="font-bold text-stone-900">{formatCountWithNoun(totalQuotes, "quotation")}</span>
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <form method="GET" action="/quotes" className="relative flex-1">
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search quotes by text or author name..."
                className="w-full rounded-2xl border border-stone-300/80 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 shadow-2xs transition-all"
              />
              {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
              {selectedSort && <input type="hidden" name="sort" value={selectedSort} />}
              <button
                type="submit"
                className="absolute right-2 top-2 rounded-xl bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-black transition-all cursor-pointer"
              >
                Search
              </button>
            </form>

            {/* Sort Toolbar Selector */}
            <SortToolbar
              options={[
                { key: "trending", label: "Trending" },
                { key: "latest", label: "Latest" },
                { key: "popular", label: "Popular" },
                { key: "featured", label: "Featured" },
              ]}
              currentSort={selectedSort || "trending"}
              buildSortHref={(sortKey) => {
                const params = new URLSearchParams()
                if (searchQuery) params.set("q", searchQuery)
                if (categorySlug) params.set("category", categorySlug)
                if (sortKey !== "trending") params.set("sort", sortKey)
                const qs = params.toString()
                return `/quotes${qs ? `?${qs}` : ""}`
              }}
            />
          </div>

          {/* Category Filter Pills */}
          <FilterPills
            label="Theme:"
            allLabel="All Themes"
            allHref={(() => {
              const p = new URLSearchParams()
              if (searchQuery) p.set("q", searchQuery)
              if (selectedSort !== "trending") p.set("sort", selectedSort)
              const qs = p.toString()
              return `/quotes${qs ? `?${qs}` : ""}`
            })()}
            isAllActive={!categorySlug}
            items={categories.map((c) => {
              const p = new URLSearchParams()
              if (searchQuery) p.set("q", searchQuery)
              p.set("category", c.slug)
              if (selectedSort !== "trending") p.set("sort", selectedSort)
              const qs = p.toString()
              return {
                id: c.id,
                label: c.name,
                href: `/quotes${qs ? `?${qs}` : ""}`,
                isActive: categorySlug === c.slug,
              }
            })}
          />
        </div>

        {/* Quotes Grid */}
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
          <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center space-y-3">
            <span className="text-3xl">🕊️</span>
            <h3 className="font-serif text-lg font-bold text-stone-900">
              No Quotations Found
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No published quotes match your current filter criteria. Try clearing your search or switching categories.
            </p>
            <Link
              href="/quotes"
              className="inline-flex items-center rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black transition-all"
            >
              Reset Filters
            </Link>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalQuotes}
          pageSize={PAGE_SIZE}
          buildHref={buildHref}
        />
      </div>
    </PublicLayout>
  )
}
