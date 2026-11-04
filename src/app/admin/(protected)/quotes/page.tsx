import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { getAdmin } from "@/lib/auth/getAdmin"
import { prisma } from "@/lib/prisma"
import { QuotesListManager } from "./QuotesListManager"
import { PageHeader, FilterTabs } from "@/components/admin"
import { Button } from "@/components/ui"
import { parseSafePageNumber } from "@/lib/security/input"

type QuoteFilter = "all" | "draft" | "archived" | "unattributed" | "missing-source" | "no-tags" | "orphaned"

const PAGE_SIZE = 50

const filterLabels: Record<QuoteFilter, string> = {
  all: "All Quotes",
  draft: "Draft / Review",
  archived: "Archived",
  unattributed: "Unattributed",
  "missing-source": "Missing Source",
  "no-tags": "No Tags",
  orphaned: "Orphaned",
}

function getQuoteFilter(value: string | string[] | undefined): QuoteFilter {
  if (typeof value !== "string") return "all"
  if (value === "draft") return "draft"
  if (value === "archived") return "archived"
  if (value === "unattributed") return "unattributed"
  if (value === "missing-source") return "missing-source"
  if (value === "no-tags") return "no-tags"
  if (value === "orphaned") return "orphaned"
  return "all"
}

function getPageNumber(value: string | string[] | undefined) {
  if (typeof value !== "string") return 1
  return parseSafePageNumber(value, 1000)
}

function buildQuoteWhere(activeFilter: QuoteFilter, search?: string): Prisma.QuoteWhereInput {
  let baseWhere: Prisma.QuoteWhereInput

  if (activeFilter === "all") {
    baseWhere = { deletedAt: null }
  } else if (activeFilter === "draft") {
    baseWhere = { deletedAt: null, status: { in: ["DRAFT", "REVIEW"] } }
  } else if (activeFilter === "archived") {
    baseWhere = { deletedAt: null, status: "ARCHIVED" }
  } else if (activeFilter === "unattributed") {
    baseWhere = { deletedAt: null, OR: [{ authorId: null }, { authorName: null }] }
  } else if (activeFilter === "missing-source") {
    baseWhere = { deletedAt: null, sourceId: null }
  } else if (activeFilter === "no-tags") {
    baseWhere = { deletedAt: null, tags: { none: {} } }
  } else {
    baseWhere = {
      deletedAt: null,
      OR: [{ authorId: null }, { authorName: null }, { sourceId: null }, { tags: { none: {} } }],
    }
  }

  const query = search?.trim()
  if (!query) return baseWhere

  const searchCondition: Prisma.QuoteWhereInput = {
    OR: [
      { content: { contains: query, mode: "insensitive" } },
      { authorName: { contains: query, mode: "insensitive" } },
      { author: { name: { contains: query, mode: "insensitive" } } },
      { category: { name: { contains: query, mode: "insensitive" } } },
      { source: { title: { contains: query, mode: "insensitive" } } },
    ],
  }

  return {
    AND: [baseWhere, searchCondition],
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
  const requestedPage = getPageNumber(resolvedSearchParams.page)
  const searchQuery =
    typeof resolvedSearchParams.search === "string"
      ? resolvedSearchParams.search.trim()
      : typeof resolvedSearchParams.q === "string"
      ? resolvedSearchParams.q.trim()
      : ""
  const where = buildQuoteWhere(activeFilter, searchQuery)

  const total = await prisma.quote.count({ where })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)
  const skip = (page - 1) * PAGE_SIZE

  const quotes = await prisma.quote.findMany({
    where,
    select: {
      id: true,
      content: true,
      status: true,
      createdAt: true,
      publishedAt: true,
      authorId: true,
      authorName: true,
      categoryId: true,
      categorySlug: true,
      sourceId: true,
      author: { select: { name: true } },
      category: { select: { name: true, slug: true } },
      source: { select: { title: true } },
      tags: { select: { tagId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip,
  })

  const normalizedQuotes = quotes.map((quote) => ({
    id: quote.id,
    content: quote.content,
    status: quote.status,
    createdAt: quote.createdAt.toISOString(),
    publishedAt: quote.publishedAt?.toISOString() ?? null,
    authorName: quote.author?.name ?? quote.authorName ?? null,
    categoryName: quote.category?.name ?? null,
    categorySlug: quote.category?.slug ?? quote.categorySlug ?? null,
    sourceTitle: quote.source?.title ?? null,
    hasAuthor: Boolean(quote.authorId || quote.authorName),
    hasCategory: Boolean(quote.categoryId && (quote.category?.name || quote.categorySlug)),
    hasSource: Boolean(quote.sourceId),
    hasTags: quote.tags.length > 0,
  }))

  const exportParams = new URLSearchParams({ format: "csv" })
  if (activeFilter !== "all") exportParams.set("filter", activeFilter)
  if (searchQuery) exportParams.set("search", searchQuery)
  const exportUrl = `/api/admin/quotes/export?${exportParams.toString()}`

  const buildFilterHref = (filterValue: QuoteFilter) => {
    const params = new URLSearchParams()
    if (filterValue !== "all") params.set("filter", filterValue)
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
          { value: "all", label: filterLabels.all, href: buildFilterHref("all") },
          { value: "draft", label: filterLabels.draft, href: buildFilterHref("draft") },
          { value: "archived", label: filterLabels.archived, href: buildFilterHref("archived") },
          { value: "unattributed", label: filterLabels.unattributed, href: buildFilterHref("unattributed") },
          { value: "missing-source", label: filterLabels["missing-source"], href: buildFilterHref("missing-source") },
          { value: "no-tags", label: filterLabels["no-tags"], href: buildFilterHref("no-tags") },
          { value: "orphaned", label: filterLabels.orphaned, href: buildFilterHref("orphaned") },
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
      />
    </div>
  )
}
