import Link from "next/link"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { getAdmin } from "@/lib/auth/getAdmin"
import { prisma } from "@/lib/prisma"
import { QuotesListManager } from "./QuotesListManager"

type QuoteFilter = "all" | "draft" | "archived" | "unattributed" | "missing-source" | "no-tags" | "orphaned"

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

export default async function QuotesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const resolvedSearchParams = (await searchParams) ?? {}
  const activeFilter = getQuoteFilter(resolvedSearchParams.filter)

  const where: Prisma.QuoteWhereInput =
    activeFilter === "all"
      ? { deletedAt: null }
      : activeFilter === "draft"
      ? { deletedAt: null, status: { in: ["DRAFT", "REVIEW"] } }
      : activeFilter === "archived"
      ? { deletedAt: null, status: "ARCHIVED" }
      : activeFilter === "unattributed"
      ? { deletedAt: null, OR: [{ authorId: null }, { authorName: null }] }
      : activeFilter === "missing-source"
      ? { deletedAt: null, sourceId: null }
      : activeFilter === "no-tags"
      ? { deletedAt: null, tags: { none: {} } }
      : {
          deletedAt: null,
          OR: [{ authorId: null }, { authorName: null }, { sourceId: null }, { tags: { none: {} } }],
        }

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
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Quotes</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/quotes/deleted"
            className="border border-gray-300 px-4 py-2 rounded"
          >
            Trash
          </Link>
          <Link
            href="/admin/quotes/bulk"
            className="border border-gray-300 px-4 py-2 rounded"
          >
            Bulk Upload
          </Link>
          <Link
            href="/admin/quotes/new"
            className="bg-black text-white px-4 py-2 rounded"
          >
            + New Quote
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500">Filter:</span>
        <Link href="/admin/quotes" className={`border px-3 py-1 rounded ${activeFilter === "all" ? "bg-black text-white" : ""}`}>
          {filterLabels.all}
        </Link>
        <Link
          href="/admin/quotes?filter=draft"
          className={`border px-3 py-1 rounded ${activeFilter === "draft" ? "bg-black text-white" : ""}`}
        >
          {filterLabels.draft}
        </Link>
        <Link
          href="/admin/quotes?filter=archived"
          className={`border px-3 py-1 rounded ${activeFilter === "archived" ? "bg-black text-white" : ""}`}
        >
          {filterLabels.archived}
        </Link>
        <Link
          href="/admin/quotes?filter=unattributed"
          className={`border px-3 py-1 rounded ${activeFilter === "unattributed" ? "bg-black text-white" : ""}`}
        >
          {filterLabels.unattributed}
        </Link>
        <Link
          href="/admin/quotes?filter=missing-source"
          className={`border px-3 py-1 rounded ${activeFilter === "missing-source" ? "bg-black text-white" : ""}`}
        >
          {filterLabels["missing-source"]}
        </Link>
        <Link
          href="/admin/quotes?filter=no-tags"
          className={`border px-3 py-1 rounded ${activeFilter === "no-tags" ? "bg-black text-white" : ""}`}
        >
          {filterLabels["no-tags"]}
        </Link>
        <Link
          href="/admin/quotes?filter=orphaned"
          className={`border px-3 py-1 rounded ${activeFilter === "orphaned" ? "bg-black text-white" : ""}`}
        >
          {filterLabels.orphaned}
        </Link>
      </div>

      <QuotesListManager quotes={normalizedQuotes} activeFilterLabel={filterLabels[activeFilter]} />
    </div>
  )
}
