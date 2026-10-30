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

function buildQuoteWhere(activeFilter: QuoteFilter): Prisma.QuoteWhereInput {
  if (activeFilter === "all") {
    return { deletedAt: null }
  }

  if (activeFilter === "draft") {
    return { deletedAt: null, status: { in: ["DRAFT", "REVIEW"] } }
  }

  if (activeFilter === "archived") {
    return { deletedAt: null, status: "ARCHIVED" }
  }

  if (activeFilter === "unattributed") {
    return { deletedAt: null, OR: [{ authorId: null }, { authorName: null }] }
  }

  if (activeFilter === "missing-source") {
    return { deletedAt: null, sourceId: null }
  }

  if (activeFilter === "no-tags") {
    return { deletedAt: null, tags: { none: {} } }
  }

  return {
    deletedAt: null,
    OR: [{ authorId: null }, { authorName: null }, { sourceId: null }, { tags: { none: {} } }],
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
  const where = buildQuoteWhere(activeFilter)

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
      sourceId: true,
      author: { select: { name: true } },
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
    sourceTitle: quote.source?.title ?? null,
    hasAuthor: Boolean(quote.authorId || quote.authorName),
    hasSource: Boolean(quote.sourceId),
    hasTags: quote.tags.length > 0,
  }))

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Quotes"
        description="Review, publish, and curate quotations archive entries."
        actions={
          <>
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
          { value: "all", label: filterLabels.all, href: "/admin/quotes" },
          { value: "draft", label: filterLabels.draft, href: "/admin/quotes?filter=draft" },
          { value: "archived", label: filterLabels.archived, href: "/admin/quotes?filter=archived" },
          { value: "unattributed", label: filterLabels.unattributed, href: "/admin/quotes?filter=unattributed" },
          { value: "missing-source", label: filterLabels["missing-source"], href: "/admin/quotes?filter=missing-source" },
          { value: "no-tags", label: filterLabels["no-tags"], href: "/admin/quotes?filter=no-tags" },
          { value: "orphaned", label: filterLabels.orphaned, href: "/admin/quotes?filter=orphaned" },
        ]}
      />

      <QuotesListManager
        quotes={normalizedQuotes}
        activeFilter={activeFilter}
        activeFilterLabel={filterLabels[activeFilter]}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
      />
    </div>
  )
}
