import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"

export type DiagnosticCheck = {
  id: string
  name: string
  category: "counters" | "relations" | "integrity" | "search"
  status: "ok" | "warning" | "error"
  description: string
  message: string
  issueCount: number
  sampleItems?: Array<{ id: string; label: string; issue: string }>
}

export type SystemDiagnosticsReport = {
  timestamp: string
  overallStatus: "healthy" | "attention_needed" | "critical"
  stats: {
    totalQuotes: number
    publishedQuotes: number
    totalAuthors: number
    totalCategories: number
    totalSources: number
    totalTags: number
    totalCollections: number
  }
  checks: DiagnosticCheck[]
}

export async function GET() {
  const admin = await getAdmin()
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 1. Gather high-level stats
    const [
      totalQuotes,
      publishedQuotes,
      totalAuthors,
      totalCategories,
      totalSources,
      totalTags,
      totalCollections,
    ] = await Promise.all([
      prisma.quote.count({ where: { deletedAt: null } }),
      prisma.quote.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
      prisma.author.count(),
      prisma.category.count(),
      prisma.source.count(),
      prisma.tag.count(),
      prisma.collection.count(),
    ])

    // 2. Check 1: Counter Synchronization Drift across Authors & Categories
    const authorDrift = await prisma.$queryRaw<Array<{ id: string; name: string; cached: number; actual: number }>>`
      SELECT a.id, a.name, a."quoteCount" as cached, COALESCE(c.cnt, 0)::int as actual
      FROM "Author" a
      LEFT JOIN (
        SELECT "authorId", COUNT(*)::int as cnt
        FROM "Quote"
        WHERE "deletedAt" IS NULL AND status = 'PUBLISHED' AND "authorId" IS NOT NULL
        GROUP BY "authorId"
      ) c ON a.id = c."authorId"
      WHERE a."quoteCount" != COALESCE(c.cnt, 0)
      LIMIT 10
    `

    const categoryDrift = await prisma.$queryRaw<Array<{ id: string; name: string; cached: number; actual: number }>>`
      SELECT c.id, c.name, c."quoteCount" as cached, COALESCE(s.cnt, 0)::int as actual
      FROM "Category" c
      LEFT JOIN (
        SELECT "categoryId", COUNT(*)::int as cnt
        FROM "Quote"
        WHERE "deletedAt" IS NULL AND status = 'PUBLISHED'
        GROUP BY "categoryId"
      ) s ON c.id = s."categoryId"
      WHERE c."quoteCount" != COALESCE(s.cnt, 0)
      LIMIT 10
    `

    const totalCounterDrift = authorDrift.length + categoryDrift.length
    const counterSamples = [
      ...authorDrift.map((a) => ({
        id: a.id,
        label: `Author: ${a.name}`,
        issue: `Cached count is ${a.cached}, but actual published quotes is ${a.actual}`,
      })),
      ...categoryDrift.map((c) => ({
        id: c.id,
        label: `Category: ${c.name}`,
        issue: `Cached count is ${c.cached}, but actual published quotes is ${c.actual}`,
      })),
    ]

    const checkCounters: DiagnosticCheck = {
      id: "counter-drift",
      name: "Quote Counter Synchronization",
      category: "counters",
      status: totalCounterDrift === 0 ? "ok" : "warning",
      description: "Verifies that cached quoteCount metrics on Authors and Categories match actual non-deleted published quotes.",
      message:
        totalCounterDrift === 0
          ? "All entity quote counts are perfectly synchronized with published quotations."
          : `${totalCounterDrift} entity counter discrepancy detected between cache and actual database records.`,
      issueCount: totalCounterDrift,
      sampleItems: counterSamples.slice(0, 5),
    }

    // 3. Check 2: Orphaned Join Relations (QuoteTag & QuoteCollection)
    const orphanTags = await prisma.$queryRaw<Array<{ cnt: number }>>`
      SELECT COUNT(*)::int as cnt
      FROM "QuoteTag" qt
      LEFT JOIN "Quote" q ON q.id = qt."quoteId"
      WHERE q.id IS NULL
    `
    const orphanCollections = await prisma.$queryRaw<Array<{ cnt: number }>>`
      SELECT COUNT(*)::int as cnt
      FROM "QuoteCollection" qc
      LEFT JOIN "Quote" q ON q.id = qc."quoteId"
      WHERE q.id IS NULL
    `

    const orphanTagCount = orphanTags[0]?.cnt || 0
    const orphanColCount = orphanCollections[0]?.cnt || 0
    const totalOrphanCount = orphanTagCount + orphanColCount

    const checkOrphans: DiagnosticCheck = {
      id: "orphan-relations",
      name: "Relational Join Integrity",
      category: "relations",
      status: totalOrphanCount === 0 ? "ok" : "warning",
      description: "Audits QuoteTag and QuoteCollection join tables for dangling references to removed or invalid quote IDs.",
      message:
        totalOrphanCount === 0
          ? "Zero orphaned references found in join tables."
          : `${totalOrphanCount} orphaned join records detected (${orphanTagCount} in tags, ${orphanColCount} in collections).`,
      issueCount: totalOrphanCount,
    }

    // 4. Check 3: Content Hashes & Normalization Integrity
    const missingHashes = await prisma.$queryRaw<Array<{ id: string; slug: string }>>`
      SELECT id, slug
      FROM "Quote"
      WHERE "contentHash" IS NULL OR LENGTH("contentHash") < 32
      LIMIT 5
    `
    const missingNormalized = await prisma.$queryRaw<Array<{ cnt: number }>>`
      SELECT COUNT(*)::int as cnt
      FROM "Quote"
      WHERE "normalizedContent" IS NULL OR "normalizedContent" = ''
    `

    const hashIssueCount = missingHashes.length + (missingNormalized[0]?.cnt || 0)

    const checkHashes: DiagnosticCheck = {
      id: "hash-integrity",
      name: "Content Hash & Deduplication Integrity",
      category: "integrity",
      status: hashIssueCount === 0 ? "ok" : "warning",
      description: "Ensures every quotation has a valid SHA-256 contentHash and normalizedContent for duplicate prevention.",
      message:
        hashIssueCount === 0
          ? "All quotations have valid SHA-256 deduplication hashes and normalized content."
          : `${hashIssueCount} quotes found with missing or incomplete deduplication hashes.`,
      issueCount: hashIssueCount,
      sampleItems: missingHashes.map((q) => ({
        id: q.id,
        label: `Quote: /${q.slug}`,
        issue: "Missing or truncated SHA-256 contentHash",
      })),
    }

    // 5. Check 4: Published Quotes Missing Attribution
    const unassignedQuotes = await prisma.$queryRaw<Array<{ id: string; slug: string }>>`
      SELECT id, slug
      FROM "Quote"
      WHERE "deletedAt" IS NULL AND status = 'PUBLISHED' AND ("authorId" IS NULL OR "categoryId" IS NULL)
      LIMIT 5
    `

    const checkAttributions: DiagnosticCheck = {
      id: "attribution-check",
      name: "Core Entity Linkage",
      category: "relations",
      status: unassignedQuotes.length === 0 ? "ok" : "warning",
      description: "Checks that all live published quotations are linked to an active Author and Category.",
      message:
        unassignedQuotes.length === 0
          ? "All live quotations have valid author and category linkages."
          : `${unassignedQuotes.length} published quote(s) lack an assigned author or category.`,
      issueCount: unassignedQuotes.length,
      sampleItems: unassignedQuotes.map((q) => ({
        id: q.id,
        label: `Quote: /${q.slug}`,
        issue: "Published quote missing authorId or categoryId",
      })),
    }

    // 6. Check 5: Slug Redirection History
    const orphanSlugHistories = await prisma.$queryRaw<Array<{ cnt: number }>>`
      SELECT COUNT(*)::int as cnt
      FROM "QuoteSlugHistory" sh
      LEFT JOIN "Quote" q ON q.id = sh."quoteId"
      WHERE q.id IS NULL
    `
    const orphanSlugCount = orphanSlugHistories[0]?.cnt || 0

    const checkSlugHistory: DiagnosticCheck = {
      id: "slug-history",
      name: "Slug & Redirection Registry",
      category: "integrity",
      status: orphanSlugCount === 0 ? "ok" : "warning",
      description: "Validates QuoteSlugHistory records ensuring all redirection entries point to valid live quotation records.",
      message:
        orphanSlugCount === 0
          ? "All historical slug redirection mappings point to valid quotation entities."
          : `${orphanSlugCount} stale slug redirection records detected without matching parent quotes.`,
      issueCount: orphanSlugCount,
    }

    // 7. Check 6: Search Vector Indexing Status
    const missingSearchVectors = await prisma.$queryRaw<Array<{ cnt: number }>>`
      SELECT COUNT(*)::int as cnt
      FROM "Quote"
      WHERE "searchVector" IS NULL
    `
    const missingVectorCount = missingSearchVectors[0]?.cnt || 0

    const checkSearchVector: DiagnosticCheck = {
      id: "search-vector",
      name: "Full-Text Search Vector Health",
      category: "search",
      status: missingVectorCount === 0 ? "ok" : "warning",
      description: "Audits PostgreSQL tsvector search vectors required for high-performance lexical search.",
      message:
        missingVectorCount === 0
          ? "All quotations have active PostgreSQL search vectors generated."
          : `${missingVectorCount} quote(s) pending searchVector compilation.`,
      issueCount: missingVectorCount,
    }

    const checks = [
      checkCounters,
      checkOrphans,
      checkHashes,
      checkAttributions,
      checkSlugHistory,
      checkSearchVector,
    ]

    const totalIssues = checks.reduce((acc, c) => acc + c.issueCount, 0)
    const overallStatus =
      totalIssues === 0
        ? "healthy"
        : checks.some((c) => c.status === "error")
        ? "critical"
        : "attention_needed"

    const report: SystemDiagnosticsReport = {
      timestamp: new Date().toISOString(),
      overallStatus,
      stats: {
        totalQuotes,
        publishedQuotes,
        totalAuthors,
        totalCategories,
        totalSources,
        totalTags,
        totalCollections,
      },
      checks,
    }

    return NextResponse.json(report)
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Diagnostics scan failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

