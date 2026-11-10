import * as React from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import {
  PublicLayout,
  QuoteCard,
  Breadcrumb,
  TaxonomyHero,
  ThinkerShelf,
  SortToolbar,
  ActiveFilterBanner,
} from "@/components/public"
import { Pagination } from "@/components/ui/pagination"
import {
  formatCountWithNoun,
  getCategoryMeta,
  getTagTypeMeta,
} from "@/lib/formatters"
import { getSiteUrl } from "@/lib/site"
import { parseSafePageNumber, sanitizeSlug } from "@/lib/security/input"
import { registerPublicDataInvalidator } from "@/lib/revalidation"
import type { TagType } from "@prisma/client"

const QUOTES_PER_PAGE = 12

type SortKey = "popular" | "newest" | "views" | "verified"

const VALID_SORT_KEYS: readonly SortKey[] = ["popular", "newest", "views", "verified"]

interface TagDetailPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    page?: string
    sort?: string
    author?: string
    category?: string
  }>
}

export const revalidate = 300

export async function generateStaticParams() {
  try {
    const topTags = await prisma.tag.findMany({
      where: { quoteCount: { gt: 0 } },
      orderBy: { quoteCount: "desc" },
      take: 30,
      select: { slug: true },
    })
    return topTags.map((t) => ({ slug: t.slug }))
  } catch (error) {
    console.error("Failed to generate static params for tags:", error)
    return []
  }
}

const getTagBySlug = React.cache(async (slug: string) => {
  return prisma.tag.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      description: true,
      quoteCount: true,
    },
  })
})

interface TagTaxonomyAuthor {
  id: string
  name: string
  slug: string
  profession: string | null
  nationality: string | null
  birthYear: number | null
  deathYear: number | null
  imageUrl: string | null
  tagQuoteCount: number
}

interface TagTaxonomyCategory {
  id: string
  name: string
  slug: string
  quoteCount: number
}

interface TagTaxonomyCooccurring {
  id: string
  name: string
  slug: string
  type: TagType
  sharedCount: number
}

interface TagTaxonomySibling {
  id: string
  name: string
  slug: string
  quoteCount: number
}

interface TagTaxonomy {
  topAuthors: TagTaxonomyAuthor[]
  affiliatedCategories: TagTaxonomyCategory[]
  cooccurringTags: TagTaxonomyCooccurring[]
  siblingTypeTags: TagTaxonomySibling[]
}

interface TagQuotesItem {
  id: string
  slug: string | null
  content: string
  authorName: string | null
  isVerified: boolean
  views: number
  author: { id: string; name: string; slug: string } | null
  category: { id: string; name: string; slug: string }
  source: { title: string; year: number | null } | null
  tags: Array<{ tag: { name: string; slug: string } }>
}

interface TagDefaultPageCache {
  quotes: TagQuotesItem[]
  totalQuotes: number
  timestamp: number
}

const tagTaxonomyCache = new Map<string, { data: TagTaxonomy; timestamp: number }>()
const tagPage1Cache = new Map<string, TagDefaultPageCache>()
const TAXONOMY_TTL_MS = 15 * 60 * 1000 // 15 mins
const MAX_TAG_CACHE_ENTRIES = 80

registerPublicDataInvalidator(() => {
  tagTaxonomyCache.clear()
  tagPage1Cache.clear()
})

async function loadTagTaxonomy(tagId: string, tagType: TagType): Promise<TagTaxonomy> {
  const cached = tagTaxonomyCache.get(tagId)
  const now = Date.now()
  if (cached && now - cached.timestamp < TAXONOMY_TTL_MS) {
    return cached.data
  }

  const [authorGroups, categoryGroups, cooccurringTagGroups, siblingTypeTags] = await Promise.all([
    prisma.quote.groupBy({
      by: ["authorId"],
      where: {
        tags: { some: { tagId } },
        status: "PUBLISHED",
        deletedAt: null,
        authorId: { not: null },
      },
      _count: { authorId: true },
      orderBy: { _count: { authorId: "desc" } },
      take: 6,
    }),
    prisma.quote.groupBy({
      by: ["categoryId"],
      where: {
        tags: { some: { tagId } },
        status: "PUBLISHED",
        deletedAt: null,
      },
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: "desc" } },
      take: 6,
    }),
    prisma.quoteTag.groupBy({
      by: ["tagId"],
      where: {
        tagId: { not: tagId },
        quote: {
          tags: { some: { tagId } },
          status: "PUBLISHED",
          deletedAt: null,
        },
      },
      _count: { tagId: true },
      orderBy: { _count: { tagId: "desc" } },
      take: 10,
    }),
    prisma.tag.findMany({
      where: {
        id: { not: tagId },
        type: tagType,
        quoteCount: { gt: 0 },
      },
      select: { id: true, name: true, slug: true, quoteCount: true },
      take: 8,
      orderBy: [{ quoteCount: "desc" }, { name: "asc" }],
    }),
  ])

  const authorIds = authorGroups
    .map((g) => g.authorId)
    .filter((id): id is string => Boolean(id))
  const categoryIds = categoryGroups.map((g) => g.categoryId)
  const tagIds = cooccurringTagGroups.map((g) => g.tagId)

  const [authorRecords, categoryRecords, tagRecords] = await Promise.all([
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
    categoryIds.length > 0
      ? prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
    tagIds.length > 0
      ? prisma.tag.findMany({
          where: { id: { in: tagIds } },
          select: { id: true, name: true, slug: true, type: true },
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
        tagQuoteCount: g._count.authorId,
      }
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)

  const categoryMap = new Map(categoryRecords.map((c) => [c.id, c]))
  const affiliatedCategories = categoryGroups
    .map((g) => {
      const cat = categoryMap.get(g.categoryId)
      if (!cat) return null
      return {
        ...cat,
        quoteCount: g._count.categoryId,
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  const tagMap = new Map(tagRecords.map((t) => [t.id, t]))
  const cooccurringTags = cooccurringTagGroups
    .map((g) => {
      const t = tagMap.get(g.tagId)
      if (!t) return null
      return {
        ...t,
        sharedCount: g._count.tagId,
      }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)

  const data: TagTaxonomy = {
    topAuthors,
    affiliatedCategories,
    cooccurringTags,
    siblingTypeTags,
  }

  if (tagTaxonomyCache.size >= MAX_TAG_CACHE_ENTRIES) {
    const oldest = tagTaxonomyCache.keys().next().value
    if (oldest) tagTaxonomyCache.delete(oldest)
  }
  tagTaxonomyCache.set(tagId, { data, timestamp: now })
  return data
}

export async function generateMetadata({
  params,
}: TagDetailPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const tag = await getTagBySlug(slug)

  if (!tag) {
    return { title: "Tag Not Found" }
  }

  const title = `${tag.name} Quotes - Maxims & Literary Passages`
  const description =
    tag.description ||
    `Browse ${tag.quoteCount > 0 ? `${tag.quoteCount} ` : ""}memorable quotes, aphorisms, and timeless passages tagged under ${tag.name} (${tag.type.toLowerCase().replace(/_/g, " ")}).`

  return {
    title,
    description,
    alternates: {
      canonical: `/tags/${slug}`,
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

export default async function TagDetailPage({
  params,
  searchParams,
}: TagDetailPageProps) {
  const { slug: rawSlug } = await params
  const slug = sanitizeSlug(rawSlug, 150)
  const resolvedSearchParams = await searchParams
  const currentPage = parseSafePageNumber(resolvedSearchParams.page, 500)

  const rawSort = resolvedSearchParams.sort?.toLowerCase() as SortKey | undefined
  const currentSort: SortKey = rawSort && VALID_SORT_KEYS.includes(rawSort) ? rawSort : "popular"

  const selectedAuthorSlug = resolvedSearchParams.author
    ? sanitizeSlug(resolvedSearchParams.author, 150)
    : null

  const selectedCategorySlug = resolvedSearchParams.category
    ? sanitizeSlug(resolvedSearchParams.category, 150)
    : null

  const tag = await getTagBySlug(slug)

  if (!tag) {
    notFound()
  }

  // Look up filter targets if set
  const [selectedAuthor, selectedCategory] = await Promise.all([
    selectedAuthorSlug
      ? prisma.author.findUnique({
          where: { slug: selectedAuthorSlug },
          select: { id: true, name: true, slug: true, profession: true },
        })
      : null,
    selectedCategorySlug
      ? prisma.category.findUnique({
          where: { slug: selectedCategorySlug },
          select: { id: true, name: true, slug: true },
        })
      : null,
  ])

  // Build filter where clause
  const whereClause: {
    tags: { some: { tagId: string } }
    status: "PUBLISHED"
    deletedAt: null
    isVerified?: boolean
    authorId?: string
    categoryId?: string
  } = {
    tags: { some: { tagId: tag.id } },
    status: "PUBLISHED",
    deletedAt: null,
  }

  if (currentSort === "verified") {
    whereClause.isVerified = true
  }

  if (selectedAuthor) {
    whereClause.authorId = selectedAuthor.id
  }

  if (selectedCategory) {
    whereClause.categoryId = selectedCategory.id
  }

  let orderByClause: Array<Record<string, "desc" | "asc">> = [{ popularityScore: "desc" }, { id: "asc" }]
  if (currentSort === "newest") {
    orderByClause = [{ createdAt: "desc" }, { id: "asc" }]
  } else if (currentSort === "views") {
    orderByClause = [{ views: "desc" }, { id: "asc" }]
  }

  const isDefaultBrowse = !selectedAuthor && !selectedCategory && currentSort === "popular" && currentPage === 1
  const now = Date.now()

  let totalQuotes: number
  let quotes: TagQuotesItem[]
  let taxonomy: TagTaxonomy

  const cachedPage = isDefaultBrowse ? tagPage1Cache.get(tag.id) : null

  if (cachedPage && now - cachedPage.timestamp < TAXONOMY_TTL_MS) {
    totalQuotes = cachedPage.totalQuotes
    quotes = cachedPage.quotes
    taxonomy = await loadTagTaxonomy(tag.id, tag.type)
  } else {
    const isDefaultCount = !selectedAuthor && !selectedCategory && currentSort !== "verified"

    const [fetchedTotal, fetchedQuotes, fetchedTaxonomy] = await Promise.all([
      isDefaultCount ? Promise.resolve(tag.quoteCount) : prisma.quote.count({ where: whereClause }),
      prisma.quote.findMany({
        where: whereClause,
        orderBy: orderByClause,
        skip: (currentPage - 1) * QUOTES_PER_PAGE,
        take: QUOTES_PER_PAGE,
        select: {
          id: true,
          slug: true,
          content: true,
          authorName: true,
          isVerified: true,
          views: true,
          author: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
          source: { select: { title: true, year: true } },
          tags: {
            select: {
              tag: { select: { name: true, slug: true } },
            },
          },
        },
      }),
      loadTagTaxonomy(tag.id, tag.type),
    ])

    totalQuotes = fetchedTotal
    quotes = fetchedQuotes
    taxonomy = fetchedTaxonomy

    if (isDefaultBrowse) {
      if (tagPage1Cache.size >= MAX_TAG_CACHE_ENTRIES) {
        const oldest = tagPage1Cache.keys().next().value
        if (oldest) tagPage1Cache.delete(oldest)
      }
      tagPage1Cache.set(tag.id, {
        quotes,
        totalQuotes,
        timestamp: now,
      })
    }
  }

  const { topAuthors, affiliatedCategories, cooccurringTags, siblingTypeTags } = taxonomy

  const totalPages = Math.ceil(totalQuotes / QUOTES_PER_PAGE)
  const typeMeta = getTagTypeMeta(tag.type)

  const siteUrl = getSiteUrl()
  const tagUrl = `${siteUrl}/tags/${tag.slug}`

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": tagUrl,
    url: tagUrl,
    name: `${tag.name} Quotes & Philosophical Meditations`,
    description:
      tag.description ||
      `Explore timeless quotations tagged under ${tag.name} (${typeMeta.label}).`,
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

  function buildHref(
    newPage: number,
    newSort?: SortKey,
    newAuthor?: string | null,
    newCategory?: string | null
  ) {
    const query = new URLSearchParams()
    if (newPage > 1) query.set("page", String(newPage))
    const targetSort = newSort !== undefined ? newSort : currentSort
    if (targetSort && targetSort !== "popular") query.set("sort", targetSort)
    const targetAuthor = newAuthor !== undefined ? newAuthor : selectedAuthorSlug
    if (targetAuthor) query.set("author", targetAuthor)
    const targetCategory = newCategory !== undefined ? newCategory : selectedCategorySlug
    if (targetCategory) query.set("category", targetCategory)
    const qs = query.toString()
    return `/tags/${slug}${qs ? `?${qs}` : ""}`
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
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Tags", href: "/tags" },
            { label: `#${tag.name}` },
          ]}
        />

        {/* Semantic Tag Hero */}
        <TaxonomyHero
          title={`#${tag.name}`}
          kicker="Literary Motif"
          badgeLabel={typeMeta.label}
          badgeClass={typeMeta.badgeClass}
          icon={typeMeta.icon}
          gradient={typeMeta.gradient}
          border={typeMeta.border}
          description={
            tag.description ||
            `A curated index of philosophical passages, maxims, and literary reflections exploring the nuance of #${tag.name.toLowerCase()}.`
          }
          stats={[
            {
              label: "Quotes",
              value: formatCountWithNoun(tag.quoteCount, "passage"),
              isPrimary: true,
            },
            ...(topAuthors.length > 0
              ? [
                  {
                    label: "Thinkers",
                    value: `${topAuthors.length}+ prominent voices`,
                  },
                ]
              : []),
            ...(affiliatedCategories.length > 0
              ? [
                  {
                    label: "Themes",
                    value: `${affiliatedCategories.length} philosophical domains`,
                  },
                ]
              : []),
          ]}
        />

        {/* Contributing Thinkers Shelf */}
        <ThinkerShelf
          title={`Prominent Thinkers on #${tag.name}`}
          subtitle="Click any thinker to filter quotes below"
          icon="🏛️"
          thinkers={topAuthors}
          selectedAuthorId={selectedAuthor?.id}
          getFilterHref={(author, isCurrentFilter) =>
            buildHref(1, currentSort, isCurrentFilter ? null : author.slug, selectedCategorySlug)
          }
          contextLabel={`on #${tag.name}`}
        />

        {/* Thematic Category Affiliations & Co-occurring Motifs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Affiliated Categories */}
          {affiliatedCategories.length > 0 && (
            <section className="space-y-3" aria-labelledby="affiliated-categories-heading">
              <div className="flex items-center justify-between border-b border-stone-900/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">🧭</span>
                  <h2 id="affiliated-categories-heading" className="font-serif text-lg font-bold tracking-tight text-[var(--ink-900)]">
                    Affiliated Themes
                  </h2>
                </div>
                <span className="text-xs text-stone-500 font-mono">
                  Filter by category
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {affiliatedCategories.map((cat) => {
                  const catMeta = getCategoryMeta(cat.name)
                  const isCurrentCat = selectedCategory?.id === cat.id

                  return (
                    <Link
                      key={cat.id}
                      href={buildHref(1, currentSort, selectedAuthorSlug, isCurrentCat ? null : cat.slug)}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-1.5 text-xs font-medium transition-all shadow-2xs ${
                        isCurrentCat
                          ? "border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20"
                          : `${catMeta.border} bg-white hover:bg-stone-50 text-stone-800`
                      }`}
                    >
                      <span aria-hidden="true">{catMeta.icon}</span>
                      <span>{cat.name}</span>
                      <span className="rounded-full bg-stone-100 px-1.5 py-0.2 text-[10px] font-mono font-bold text-stone-600">
                        {cat.quoteCount}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Co-occurring Tags */}
          {cooccurringTags.length > 0 && (
            <section className="space-y-3" aria-labelledby="cooccurring-motifs-heading">
              <div className="flex items-center justify-between border-b border-stone-900/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">🔗</span>
                  <h2 id="cooccurring-motifs-heading" className="font-serif text-lg font-bold tracking-tight text-[var(--ink-900)]">
                    Co-occurring Motifs
                  </h2>
                </div>
                <span className="text-xs text-stone-500 font-mono">
                  Related tags
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {cooccurringTags.map((coTag) => (
                  <Link
                    key={coTag.id}
                    href={`/tags/${coTag.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/90 bg-white px-3 py-1 text-xs text-stone-800 hover:border-stone-400 hover:bg-stone-50 shadow-2xs transition-all"
                  >
                    <span className="font-medium">#{coTag.name}</span>
                    <span className="text-[10px] font-mono text-stone-400 font-bold">
                      {coTag.sharedCount}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Quotes Section with Toolbar */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-900/10 pb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--ink-900)]">
                Quotations Tagged #{tag.name}
              </h2>
              <span className="text-xs text-stone-500 font-mono">
                Showing {quotes.length} of {formatCountWithNoun(totalQuotes, "passage")}
                {selectedAuthor ? ` by ${selectedAuthor.name}` : ""}
                {selectedCategory ? ` in ${selectedCategory.name}` : ""}
              </span>
            </div>

            {/* Sort Toolbar */}
            <SortToolbar
              options={sortOptions}
              currentSort={currentSort}
              buildSortHref={(sortKey) => buildHref(1, sortKey as SortKey)}
            />
          </div>

          {/* Active Filter Pill Banners */}
          <ActiveFilterBanner
            filters={[
              ...(selectedAuthor ? [{ label: "Thinker", value: selectedAuthor.name }] : []),
              ...(selectedCategory ? [{ label: "Theme", value: selectedCategory.name }] : []),
            ]}
            countNote={`${totalQuotes} passages`}
            clearHref={buildHref(1, currentSort, null, null)}
          />

          {/* Quotations Grid */}
          {quotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  id={quote.id}
                  slug={quote.slug ?? undefined}
                  content={quote.content}
                  authorName={quote.author?.name || quote.authorName}
                  authorSlug={quote.author?.slug}
                  category={quote.category?.name}
                  categorySlug={quote.category?.slug}
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
                No quotations found matching the selected filters.
              </p>
              {(selectedAuthor || selectedCategory) && (
                <div>
                  <Link
                    href={buildHref(1, currentSort, null, null)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-rust)] hover:underline"
                  >
                    Clear filters to view all quotes tagged #{tag.name} →
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

        {/* Sibling Motifs within the same TagType */}
        {siblingTypeTags.length > 0 && (
          <section className="pt-6 border-t border-stone-200/80 space-y-4" aria-labelledby="sibling-motifs-heading">
            <div className="flex items-center justify-between">
              <h3 id="sibling-motifs-heading" className="font-serif text-xl font-bold text-stone-900">
                Related {typeMeta.label} Motifs
              </h3>
              <Link
                href="/tags"
                className="text-xs font-semibold text-[var(--accent-rust)] hover:underline"
              >
                Browse All Tags →
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              {siblingTypeTags.map((item) => (
                <Link
                  key={item.id}
                  href={`/tags/${item.slug}`}
                  className="rounded-xl border border-stone-200/90 bg-white px-3.5 py-1.5 text-xs text-stone-800 hover:border-stone-400 hover:bg-stone-50 transition-all shadow-2xs"
                >
                  <span className="font-medium">#{item.name}</span>{" "}
                  <span className="text-[10px] text-stone-400 font-mono">({item.quoteCount})</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </PublicLayout>
  )
}
