import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { getAdmin } from "@/lib/auth/getAdmin"
import { prisma } from "@/lib/prisma"
import { QuotesListManager } from "./QuotesListManager"
import { PageHeader, FilterTabs } from "@/components/admin"
import { Button } from "@/components/ui"
import { parseSafePageNumber } from "@/lib/security/input"
import { searchQuoteIds } from "@/lib/quotes/search"
import { getQuoteSort, buildQuoteOrderBy } from "@/lib/quotes/sort"
import { registerPublicDataInvalidator } from "@/lib/revalidation"
import { isValidUuid } from "@/lib/api/route-helpers"

type QuoteFilter =
  | "all"
  | "draft"
  | "archived"
  | "featured"
  | "unverified"
  | "disputed"
  | "unattributed"
  | "missing-source"
  | "no-tags"
  | "no-context"
  | "has-context"
  | "orphaned"

const PAGE_SIZE = 50

const quoteSelect = {
  id: true,
  content: true,
  status: true,
  isVerified: true,
  attributionStatus: true,
  isFeatured: true,
  createdAt: true,
  publishedAt: true,
  authorId: true,
  authorName: true,
  authorSlug: true,
  categoryId: true,
  categorySlug: true,
  sourceId: true,
  meaning: true,
  historicalContext: true,
  modernRelevance: true,
  author: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  source: { select: { title: true } },
  tags: { select: { tagId: true } },
} satisfies Prisma.QuoteSelect

type QuoteFilterCounts = {
  all: number
  draft: number
  archived: number
  featured: number
  unverified: number
  disputed: number
  unattributed: number
  missingSource: number
  noTags: number
  noContext: number
  hasContext: number
  orphaned: number
}

let cachedQuoteFilterCounts: { counts: QuoteFilterCounts; timestamp: number } | null = null
const FILTER_COUNTS_TTL_MS = 30 * 1000 // 30 seconds

registerPublicDataInvalidator(() => {
  cachedQuoteFilterCounts = null
})

async function getQuoteFilterCounts(): Promise<QuoteFilterCounts> {
  const now = Date.now()
  if (cachedQuoteFilterCounts && now - cachedQuoteFilterCounts.timestamp < FILTER_COUNTS_TTL_MS) {
    return cachedQuoteFilterCounts.counts
  }

  try {
    const rows = await prisma.$queryRaw<QuoteFilterCounts[]>`
      SELECT
        COUNT(*)::int AS "all",
        COUNT(*) FILTER (WHERE status IN ('DRAFT', 'REVIEW'))::int AS "draft",
        COUNT(*) FILTER (WHERE status = 'ARCHIVED')::int AS "archived",
        COUNT(*) FILTER (WHERE "isFeatured" = true)::int AS "featured",
        COUNT(*) FILTER (WHERE "isVerified" = false)::int AS "unverified",
        COUNT(*) FILTER (WHERE "attributionStatus" IN ('DISPUTED', 'MISATTRIBUTED'))::int AS "disputed",
        COUNT(*) FILTER (WHERE "authorId" IS NULL OR "authorName" IS NULL)::int AS "unattributed",
        COUNT(*) FILTER (WHERE "sourceId" IS NULL)::int AS "missingSource",
        COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "QuoteTag" qt WHERE qt."quoteId" = q.id))::int AS "noTags",
        COUNT(*) FILTER (
          WHERE ("meaning" IS NULL OR TRIM("meaning") = '')
            AND ("historicalContext" IS NULL OR TRIM("historicalContext") = '')
            AND ("modernRelevance" IS NULL OR TRIM("modernRelevance") = '')
        )::int AS "noContext",
        COUNT(*) FILTER (
          WHERE ("meaning" IS NOT NULL AND TRIM("meaning") <> '')
             OR ("historicalContext" IS NOT NULL AND TRIM("historicalContext") <> '')
             OR ("modernRelevance" IS NOT NULL AND TRIM("modernRelevance") <> '')
        )::int AS "hasContext",
        COUNT(*) FILTER (
          WHERE "authorId" IS NULL 
             OR "authorName" IS NULL 
             OR "sourceId" IS NULL 
             OR NOT EXISTS (SELECT 1 FROM "QuoteTag" qt WHERE qt."quoteId" = q.id)
        )::int AS "orphaned"
      FROM "Quote" q
      WHERE "deletedAt" IS NULL;
    `
    const counts = rows[0] ?? {
      all: 0,
      draft: 0,
      archived: 0,
      featured: 0,
      unverified: 0,
      disputed: 0,
      unattributed: 0,
      missingSource: 0,
      noTags: 0,
      noContext: 0,
      hasContext: 0,
      orphaned: 0,
    }
    cachedQuoteFilterCounts = { counts, timestamp: now }
    return counts
  } catch (error) {
    console.error("[Failed to load quote filter counts]", error)
    return {
      all: 0,
      draft: 0,
      archived: 0,
      featured: 0,
      unverified: 0,
      disputed: 0,
      unattributed: 0,
      missingSource: 0,
      noTags: 0,
      noContext: 0,
      hasContext: 0,
      orphaned: 0,
    }
  }
}

const filterLabels: Record<QuoteFilter, string> = {
  all: "All Quotes",
  draft: "Draft / Review",
  archived: "Archived",
  featured: "Featured",
  unverified: "Unverified",
  disputed: "Disputed Quotes",
  unattributed: "Unattributed",
  "missing-source": "Missing Source",
  "no-tags": "No Tags",
  "no-context": "No Interpretation & Context",
  "has-context": "Has Interpretation & Context",
  orphaned: "Orphaned",
}

function getQuoteFilter(value: string | string[] | undefined): QuoteFilter {
  if (typeof value !== "string") return "all"
  if (value === "draft") return "draft"
  if (value === "archived") return "archived"
  if (value === "featured" || value === "is-featured") return "featured"
  if (value === "unverified") return "unverified"
  if (value === "disputed" || value === "misattributed" || value === "attribution-risk") return "disputed"
  if (value === "unattributed") return "unattributed"
  if (value === "missing-source") return "missing-source"
  if (value === "no-tags") return "no-tags"
  if (
    value === "no-context" ||
    value === "missing-context" ||
    value === "without-context" ||
    value === "no-interpretation" ||
    value === "missing-interpretation" ||
    value === "without-interpretation"
  ) {
    return "no-context"
  }
  if (
    value === "has-context" ||
    value === "curated" ||
    value === "with-context" ||
    value === "has-interpretation" ||
    value === "with-interpretation"
  ) {
    return "has-context"
  }
  if (value === "orphaned") return "orphaned"
  return "all"
}

function getPageNumber(value: string | string[] | undefined) {
  if (typeof value !== "string") return 1
  return parseSafePageNumber(value, 1000)
}

function buildQuoteWhere(
  activeFilter: QuoteFilter,
  search?: string,
  searchIds?: string[] | null,
  categorySlugOrId?: string | null,
  authorSlugOrId?: string | null
): Prisma.QuoteWhereInput {
  let baseWhere: Prisma.QuoteWhereInput

  if (activeFilter === "all") {
    baseWhere = { deletedAt: null }
  } else if (activeFilter === "draft") {
    baseWhere = { deletedAt: null, status: { in: ["DRAFT", "REVIEW"] } }
  } else if (activeFilter === "archived") {
    baseWhere = { deletedAt: null, status: "ARCHIVED" }
  } else if (activeFilter === "featured") {
    baseWhere = { deletedAt: null, isFeatured: true }
  } else if (activeFilter === "unverified") {
    baseWhere = { deletedAt: null, isVerified: false }
  } else if (activeFilter === "disputed") {
    baseWhere = { deletedAt: null, attributionStatus: { in: ["DISPUTED", "MISATTRIBUTED"] } }
  } else if (activeFilter === "unattributed") {
    baseWhere = { deletedAt: null, OR: [{ authorId: null }, { authorName: null }] }
  } else if (activeFilter === "missing-source") {
    baseWhere = { deletedAt: null, sourceId: null }
  } else if (activeFilter === "no-tags") {
    baseWhere = { deletedAt: null, tags: { none: {} } }
  } else if (activeFilter === "no-context") {
    baseWhere = {
      deletedAt: null,
      AND: [
        { OR: [{ meaning: null }, { meaning: "" }] },
        { OR: [{ historicalContext: null }, { historicalContext: "" }] },
        { OR: [{ modernRelevance: null }, { modernRelevance: "" }] },
      ],
    }
  } else if (activeFilter === "has-context") {
    baseWhere = {
      deletedAt: null,
      OR: [
        { AND: [{ meaning: { not: null } }, { meaning: { not: "" } }] },
        { AND: [{ historicalContext: { not: null } }, { historicalContext: { not: "" } }] },
        { AND: [{ modernRelevance: { not: null } }, { modernRelevance: { not: "" } }] },
      ],
    }
  } else if (activeFilter === "orphaned") {
    baseWhere = {
      deletedAt: null,
      OR: [{ authorId: null }, { authorName: null }, { sourceId: null }, { tags: { none: {} } }],
    }
  } else {
    baseWhere = { deletedAt: null }
  }

  const conditions: Prisma.QuoteWhereInput[] = [baseWhere]

  const trimmedCategory = categorySlugOrId?.trim()
  if (trimmedCategory && trimmedCategory !== "all") {
    if (isValidUuid(trimmedCategory)) {
      conditions.push({ categoryId: trimmedCategory })
    } else {
      conditions.push({ categorySlug: trimmedCategory })
    }
  }

  const trimmedAuthor = authorSlugOrId?.trim()
  if (trimmedAuthor && trimmedAuthor !== "all") {
    if (isValidUuid(trimmedAuthor)) {
      conditions.push({ authorId: trimmedAuthor })
    } else {
      conditions.push({
        OR: [
          { authorSlug: trimmedAuthor },
          { author: { slug: trimmedAuthor } },
        ],
      })
    }
  }

  const query = search?.trim()
  if (query) {
    // If GIN full-text index returned matching quote IDs, filter directly by PK id
    if (Array.isArray(searchIds)) {
      conditions.push({ id: { in: searchIds } })
    } else {
      // Graceful fallback to multi-column ILIKE if FTS was unavailable
      const searchCondition: Prisma.QuoteWhereInput = {
        OR: [
          { content: { contains: query, mode: "insensitive" } },
          { authorName: { contains: query, mode: "insensitive" } },
          { author: { name: { contains: query, mode: "insensitive" } } },
          { category: { name: { contains: query, mode: "insensitive" } } },
          { source: { title: { contains: query, mode: "insensitive" } } },
        ],
      }
      conditions.push(searchCondition)
    }
  }

  if (conditions.length === 1) {
    return conditions[0]
  }

  return {
    AND: conditions,
  }
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const resolvedSearchParams = (await searchParams) ?? {}
  const activeFilter = getQuoteFilter(resolvedSearchParams.filter)
  const activeSort = getQuoteSort(resolvedSearchParams.sort)
  const requestedPage = getPageNumber(resolvedSearchParams.page)
  const activeCategory =
    typeof resolvedSearchParams.category === "string"
      ? resolvedSearchParams.category.trim()
      : typeof resolvedSearchParams.categoryId === "string"
      ? resolvedSearchParams.categoryId.trim()
      : "all"
  const activeAuthor =
    typeof resolvedSearchParams.author === "string"
      ? resolvedSearchParams.author.trim()
      : typeof resolvedSearchParams.authorId === "string"
      ? resolvedSearchParams.authorId.trim()
      : ""
  const searchQuery =
    typeof resolvedSearchParams.search === "string"
      ? resolvedSearchParams.search.trim()
      : typeof resolvedSearchParams.q === "string"
      ? resolvedSearchParams.q.trim()
      : ""
  const searchMatchingIds = searchQuery ? await searchQuoteIds(searchQuery) : null
  const where = buildQuoteWhere(activeFilter, searchQuery, searchMatchingIds, activeCategory, activeAuthor)
  const orderBy = buildQuoteOrderBy(activeSort)
  const initialSkip = Math.max(0, (requestedPage - 1) * PAGE_SIZE)

  let activeAuthorName: string | null = null
  if (activeAuthor && activeAuthor !== "all") {
    const authorRecord = await prisma.author.findFirst({
      where: isValidUuid(activeAuthor) ? { id: activeAuthor } : { slug: activeAuthor },
      select: { name: true, slug: true },
    })
    activeAuthorName = authorRecord?.name ?? activeAuthor
  }

  const [total, initialQuotes, filterCounts, categories] = await Promise.all([
    prisma.quote.count({ where }),
    prisma.quote.findMany({
      where,
      select: quoteSelect,
      orderBy,
      take: PAGE_SIZE,
      skip: initialSkip,
    }),
    getQuoteFilterCounts(),
    prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)

  const quotes =
    page !== requestedPage
      ? await prisma.quote.findMany({
          where,
          select: quoteSelect,
          orderBy,
          take: PAGE_SIZE,
          skip: (page - 1) * PAGE_SIZE,
        })
      : initialQuotes

  const normalizedQuotes = quotes.map((quote) => ({
    id: quote.id,
    content: quote.content,
    status: quote.status,
    isVerified: Boolean(quote.isVerified),
    isFeatured: Boolean(quote.isFeatured),
    attributionStatus: quote.attributionStatus,
    createdAt: quote.createdAt.toISOString(),
    publishedAt: quote.publishedAt?.toISOString() ?? null,
    authorId: quote.authorId ?? null,
    authorName: quote.author?.name ?? quote.authorName ?? null,
    authorSlug: quote.author?.slug ?? quote.authorSlug ?? null,
    categoryName: quote.category?.name ?? null,
    categorySlug: quote.category?.slug ?? quote.categorySlug ?? null,
    sourceTitle: quote.source?.title ?? null,
    hasAuthor: Boolean(quote.authorId || quote.authorName),
    hasCategory: Boolean(quote.categoryId && (quote.category?.name || quote.categorySlug)),
    hasSource: Boolean(quote.sourceId),
    hasTags: quote.tags.length > 0,
    hasContext: Boolean(
      (quote.meaning && quote.meaning.trim()) ||
      (quote.historicalContext && quote.historicalContext.trim()) ||
      (quote.modernRelevance && quote.modernRelevance.trim())
    ),
  }))

  const exportParams = new URLSearchParams({ format: "csv" })
  if (activeFilter !== "all") exportParams.set("filter", activeFilter)
  if (activeCategory !== "all") exportParams.set("category", activeCategory)
  if (activeAuthor && activeAuthor !== "all") exportParams.set("author", activeAuthor)
  if (activeSort !== "newest") exportParams.set("sort", activeSort)
  if (searchQuery) exportParams.set("search", searchQuery)
  const exportUrl = `/api/admin/quotes/export?${exportParams.toString()}`

  const buildFilterHref = (filterValue: QuoteFilter) => {
    const params = new URLSearchParams()
    if (filterValue !== "all") params.set("filter", filterValue)
    if (activeCategory !== "all") params.set("category", activeCategory)
    if (activeAuthor && activeAuthor !== "all") params.set("author", activeAuthor)
    if (activeSort !== "newest") params.set("sort", activeSort)
    if (searchQuery) params.set("search", searchQuery)
    const qs = params.toString()
    return qs ? `/admin/quotes?${qs}` : "/admin/quotes"
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Quotes"
        description="Review, publish, and curate quotations archive entries."
        actions={
          <>
            <Button
              href={exportUrl}
              variant="outline"
              size="sm"
              download
              title={`Export ${filterLabels[activeFilter]} to CSV`}
            >
              Export CSV
            </Button>
            <Button href="/admin/quotes/deleted" variant="outline" size="sm">
              Trash
            </Button>
            <Button href="/admin/quotes/bulk" variant="secondary" size="sm">
              Bulk Upload
            </Button>
            <Button href="/admin/quotes/new" variant="primary" size="sm">
              + New Quote
            </Button>
          </>
        }
      />

      <FilterTabs<QuoteFilter>
        label="Filter"
        activeValue={activeFilter}
        items={[
          { value: "all", label: filterLabels.all, href: buildFilterHref("all"), count: filterCounts.all },
          { value: "draft", label: filterLabels.draft, href: buildFilterHref("draft"), count: filterCounts.draft },
          { value: "archived", label: filterLabels.archived, href: buildFilterHref("archived"), count: filterCounts.archived },
          { value: "featured", label: filterLabels.featured, href: buildFilterHref("featured"), count: filterCounts.featured },
          { value: "unverified", label: filterLabels.unverified, href: buildFilterHref("unverified"), count: filterCounts.unverified },
          { value: "disputed", label: filterLabels.disputed, href: buildFilterHref("disputed"), count: filterCounts.disputed },
          { value: "unattributed", label: filterLabels.unattributed, href: buildFilterHref("unattributed"), count: filterCounts.unattributed },
          { value: "missing-source", label: filterLabels["missing-source"], href: buildFilterHref("missing-source"), count: filterCounts.missingSource },
          { value: "no-tags", label: filterLabels["no-tags"], href: buildFilterHref("no-tags"), count: filterCounts.noTags },
          { value: "no-context", label: filterLabels["no-context"], href: buildFilterHref("no-context"), count: filterCounts.noContext },
          { value: "has-context", label: filterLabels["has-context"], href: buildFilterHref("has-context"), count: filterCounts.hasContext },
          { value: "orphaned", label: filterLabels.orphaned, href: buildFilterHref("orphaned"), count: filterCounts.orphaned },
        ]}
      />

      <QuotesListManager
        quotes={normalizedQuotes}
        activeFilter={activeFilter}
        activeFilterLabel={filterLabels[activeFilter]}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        initialSearch={searchQuery}
        initialSort={activeSort}
        initialCategory={activeCategory}
        categoryOptions={categories}
        initialAuthor={activeAuthor}
        initialAuthorName={activeAuthorName}
      />
    </div>
  )
}
