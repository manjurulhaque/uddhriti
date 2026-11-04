import { requireSuperAdmin } from "@/lib/api/admin-auth"
import { prisma } from "@/lib/prisma"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import type { Prisma, QuoteStatus } from "@prisma/client"

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(req: Request) {
  const { admin, response } = await requireSuperAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "bulk")
  if (rateLimited) return rateLimited

  const { searchParams } = new URL(req.url)
  const format = searchParams.get("format")?.toLowerCase() === "json" ? "json" : "csv"
  const filter = searchParams.get("filter")
  const statusParam = searchParams.get("status")?.toUpperCase()
  const rawIds = searchParams.get("ids")
  const ids = rawIds ? rawIds.split(",").map((s) => s.trim()).filter(Boolean) : []
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "10000", 10)), 20000)

  // Build where clause based on selected IDs or active filters
  const where: Prisma.QuoteWhereInput = { deletedAt: null }

  if (ids.length > 0) {
    where.id = { in: ids }
  } else {
    if (statusParam && ["PUBLISHED", "DRAFT", "ARCHIVED", "REVIEW"].includes(statusParam)) {
      where.status = statusParam as QuoteStatus
    }

    if (filter === "draft") {
      where.status = { in: ["DRAFT", "REVIEW"] }
    } else if (filter === "archived") {
      where.status = "ARCHIVED"
    } else if (filter === "unattributed") {
      where.OR = [{ authorId: null }, { authorName: null }]
    } else if (filter === "missing-source") {
      where.sourceId = null
    } else if (filter === "no-tags") {
      where.tags = { none: {} }
    } else if (filter === "orphaned") {
      where.OR = [{ authorId: null }, { authorName: null }, { sourceId: null }, { tags: { none: {} } }]
    }

    const searchQuery = searchParams.get("search")?.trim() || searchParams.get("q")?.trim()
    if (searchQuery) {
      const searchCondition: Prisma.QuoteWhereInput = {
        OR: [
          { content: { contains: searchQuery, mode: "insensitive" } },
          { authorName: { contains: searchQuery, mode: "insensitive" } },
          { author: { name: { contains: searchQuery, mode: "insensitive" } } },
          { category: { name: { contains: searchQuery, mode: "insensitive" } } },
          { source: { title: { contains: searchQuery, mode: "insensitive" } } },
        ],
      }
      where.AND = [searchCondition]
    }
  }

  const quotes = await prisma.quote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      content: true,
      meaning: true,
      historicalContext: true,
      modernRelevance: true,
      language: true,
      status: true,
      authorName: true,
      authorSlug: true,
      author: { select: { name: true, slug: true } },
      source: { select: { title: true, type: true } },
      category: { select: { name: true, slug: true } },
      tags: { select: { tag: { select: { name: true, slug: true, type: true } } } },
      views: true,
      likes: true,
      shares: true,
      isVerified: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)

  if (format === "json") {
    const jsonOutput = quotes.map((q) => ({
      id: q.id,
      content: q.content,
      meaning: q.meaning,
      historicalContext: q.historicalContext,
      modernRelevance: q.modernRelevance,
      language: q.language,
      status: q.status,
      author: q.author?.name || q.authorName || null,
      authorSlug: q.author?.slug || q.authorSlug || null,
      source: q.source?.title || null,
      sourceType: q.source?.type || null,
      category: q.category.name,
      categorySlug: q.category.slug,
      tags: q.tags.map((t) => t.tag.name),
      stats: {
        views: q.views,
        likes: q.likes,
        shares: q.shares,
      },
      isVerified: q.isVerified,
      publishedAt: q.publishedAt ? q.publishedAt.toISOString() : null,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    }))

    return new Response(JSON.stringify(jsonOutput, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="quotzen-quotes-${timestamp}.json"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    })
  }

  // Format CSV with standard RFC 4180 headers
  const csvHeaders = [
    "ID",
    "Quote Text",
    "Author",
    "Author Slug",
    "Category",
    "Category Slug",
    "Source",
    "Tags",
    "Status",
    "Meaning",
    "Historical Context",
    "Modern Relevance",
    "Views",
    "Likes",
    "Shares",
    "Verified",
    "Published At",
    "Created At",
  ]

  const csvRows = quotes.map((q) => {
    const authorName = q.author?.name || q.authorName || ""
    const authorSlug = q.author?.slug || q.authorSlug || ""
    const sourceTitle = q.source?.title || ""
    const tagList = q.tags.map((t) => t.tag.name).join("; ")

    return [
      escapeCsvCell(q.id),
      escapeCsvCell(q.content),
      escapeCsvCell(authorName),
      escapeCsvCell(authorSlug),
      escapeCsvCell(q.category.name),
      escapeCsvCell(q.category.slug),
      escapeCsvCell(sourceTitle),
      escapeCsvCell(tagList),
      escapeCsvCell(q.status),
      escapeCsvCell(q.meaning || ""),
      escapeCsvCell(q.historicalContext || ""),
      escapeCsvCell(q.modernRelevance || ""),
      escapeCsvCell(q.views),
      escapeCsvCell(q.likes),
      escapeCsvCell(q.shares),
      escapeCsvCell(q.isVerified ? "Yes" : "No"),
      escapeCsvCell(q.publishedAt ? q.publishedAt.toISOString() : ""),
      escapeCsvCell(q.createdAt.toISOString()),
    ].join(",")
  })

  // UTF-8 Byte Order Mark (\uFEFF) ensures Excel properly decodes Unicode characters
  const csvPayload = `\uFEFF${[csvHeaders.join(","), ...csvRows].join("\r\n")}`

  return new Response(csvPayload, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quotzen-quotes-${timestamp}.csv"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}

