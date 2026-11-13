import { prisma } from "@/lib/prisma"
import { APP_TIME_ZONE, subtractDays } from "@/lib/datetime"
import { unstable_cache } from "next/cache"
import { ADMIN_DASHBOARD_CACHE_TAG, registerDashboardInvalidator } from "@/lib/revalidation"

type DashboardDateRange = {
  sevenDaysAgo: Date
  fourteenDaysAgo: Date
  thirtyDaysAgo: Date
}

type QuoteCountMetricsRow = {
  totalQuotes: number
  publishedQuotes: number
  draftQuotes: number
  reviewQuotes: number
  archivedQuotes: number
  featuredQuotes: number
  unattributedQuotes: number
  quotesLast7Days: number
  deletedQuotes: number
  quotesPrevious7Days: number
  verifiedQuotes: number
  missingSourceQuotes: number
  publishedLast7Days: number
  attributionConfirmedQuotes: number
  attributionDisputedQuotes: number
  attributionMisattributedQuotes: number
  attributionUnknownQuotes: number
  avgVerificationConfidence: number | null
  lowConfidenceQuotes: number
  noTagQuotes: number
  orphanedQuotes: number
  moderationBacklogQuotes: number
  staleModerationQuotes: number
  publishedLast30Days: number
  publishedPrevious7Days: number
  featuredPublishedQuotes: number
  noContextQuotes: number
  hasContextQuotes: number
}

type EntityCountMetricsRow = {
  totalAuthors: number
  totalCategories: number
  totalTags: number
  totalSources: number
  totalCollections: number
  authorsLast7Days: number
  authorsPrevious7Days: number
  categoriesLast7Days: number
  categoriesPrevious7Days: number
  tagsLast7Days: number
  tagsPrevious7Days: number
  sourcesLast7Days: number
  sourcesPrevious7Days: number
  activeAuthors: number
  activeCategories: number
  activeTags: number
}

type EngagementMetricsRow = {
  currentViews: number
  currentShares: number
  previousViews: number
  previousShares: number
}

export type DashboardMetrics = {
  totalQuotes: number
  publishedQuotes: number
  draftQuotes: number
  reviewQuotes: number
  archivedQuotes: number
  featuredQuotes: number
  unattributedQuotes: number
  quotesLast7Days: number
  totalAuthors: number
  totalCategories: number
  totalTags: number
  totalSources: number
  totalCollections: number
  deletedQuotes: number
  quotesPrevious7Days: number
  authorsLast7Days: number
  authorsPrevious7Days: number
  categoriesLast7Days: number
  categoriesPrevious7Days: number
  tagsLast7Days: number
  tagsPrevious7Days: number
  sourcesLast7Days: number
  sourcesPrevious7Days: number
  recentQuotes: Awaited<ReturnType<typeof fetchRecentQuotes>>
  recentAuthors: Awaited<ReturnType<typeof fetchRecentAuthors>>
  recentSources: Awaited<ReturnType<typeof fetchRecentSources>>
  topCategories: Awaited<ReturnType<typeof fetchTopCategories>>
  topTags: Awaited<ReturnType<typeof fetchTopTags>>
  topSources: Awaited<ReturnType<typeof fetchTopSources>>
  mostViewedQuotes: Awaited<ReturnType<typeof fetchMostViewedQuotes>>
  trendingQuotes: Awaited<ReturnType<typeof fetchTrendingQuotes>>
  verifiedQuotes: number
  missingSourceQuotes: number
  publishedLast7Days: number
  publishedDailySeries: Awaited<ReturnType<typeof fetchPublishedDailySeries>>
  engagementCurrent7d: { _sum: { views: number | null; shares: number | null } }
  engagementPrevious7d: { _sum: { views: number | null; shares: number | null } }
  attributionConfirmedQuotes: number
  attributionDisputedQuotes: number
  attributionMisattributedQuotes: number
  attributionUnknownQuotes: number
  verificationAggregate: { _avg: { verificationConfidence: number | null } }
  lowConfidenceQuotes: number
  noTagQuotes: number
  orphanedQuotes: number
  orphanedSources: number
  moderationBacklogQuotes: number
  staleModerationQuotes: number
  publishedLast30Days: number
  publishedPrevious7Days: number
  sourceTypeBreakdown: Awaited<ReturnType<typeof fetchSourceTypeBreakdown>>
  activeAuthors: number
  activeCategories: number
  activeTags: number
  featuredPublishedQuotes: number
  noContextQuotes: number
  hasContextQuotes: number
}

async function fetchQuoteCountMetrics({
  sevenDaysAgo,
  fourteenDaysAgo,
  thirtyDaysAgo,
}: DashboardDateRange) {
  const [row] = await prisma.$queryRaw<QuoteCountMetricsRow[]>`
    SELECT
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL)::int AS "totalQuotes",
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND status = 'PUBLISHED')::int AS "publishedQuotes",
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND status = 'DRAFT')::int AS "draftQuotes",
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND status = 'REVIEW')::int AS "reviewQuotes",
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND status = 'ARCHIVED')::int AS "archivedQuotes",
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND "isFeatured" = true)::int AS "featuredQuotes",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL AND ("authorId" IS NULL OR "authorName" IS NULL)
      )::int AS "unattributedQuotes",
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND "createdAt" >= ${sevenDaysAgo})::int AS "quotesLast7Days",
      COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL)::int AS "deletedQuotes",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL
          AND "createdAt" >= ${fourteenDaysAgo}
          AND "createdAt" < ${sevenDaysAgo}
      )::int AS "quotesPrevious7Days",
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND "isVerified" = true)::int AS "verifiedQuotes",
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND "sourceId" IS NULL)::int AS "missingSourceQuotes",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL
          AND status = 'PUBLISHED'
          AND "publishedAt" >= ${sevenDaysAgo}
      )::int AS "publishedLast7Days",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL AND "attributionStatus" = 'CONFIRMED'
      )::int AS "attributionConfirmedQuotes",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL AND "attributionStatus" = 'DISPUTED'
      )::int AS "attributionDisputedQuotes",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL AND "attributionStatus" = 'MISATTRIBUTED'
      )::int AS "attributionMisattributedQuotes",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL AND "attributionStatus" = 'UNKNOWN'
      )::int AS "attributionUnknownQuotes",
      AVG("verificationConfidence") FILTER (WHERE "deletedAt" IS NULL) AS "avgVerificationConfidence",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL AND "verificationConfidence" < 0.5
      )::int AS "lowConfidenceQuotes",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM "QuoteTag" qt WHERE qt."quoteId" = "Quote".id
          )
      )::int AS "noTagQuotes",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL
          AND (
            "authorId" IS NULL
            OR "authorName" IS NULL
            OR "sourceId" IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM "QuoteTag" qt WHERE qt."quoteId" = "Quote".id
            )
          )
      )::int AS "orphanedQuotes",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL AND status IN ('DRAFT', 'REVIEW')
      )::int AS "moderationBacklogQuotes",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL
          AND status IN ('DRAFT', 'REVIEW')
          AND "createdAt" < ${fourteenDaysAgo}
      )::int AS "staleModerationQuotes",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL
          AND status = 'PUBLISHED'
          AND "publishedAt" >= ${thirtyDaysAgo}
      )::int AS "publishedLast30Days",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL
          AND status = 'PUBLISHED'
          AND "publishedAt" >= ${fourteenDaysAgo}
          AND "publishedAt" < ${sevenDaysAgo}
      )::int AS "publishedPrevious7Days",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL
          AND status = 'PUBLISHED'
          AND "isFeatured" = true
      )::int AS "featuredPublishedQuotes",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL
          AND ("meaning" IS NULL OR TRIM("meaning") = '')
          AND ("historicalContext" IS NULL OR TRIM("historicalContext") = '')
          AND ("modernRelevance" IS NULL OR TRIM("modernRelevance") = '')
      )::int AS "noContextQuotes",
      COUNT(*) FILTER (
        WHERE "deletedAt" IS NULL
          AND (
            ("meaning" IS NOT NULL AND TRIM("meaning") <> '')
            OR ("historicalContext" IS NOT NULL AND TRIM("historicalContext") <> '')
            OR ("modernRelevance" IS NOT NULL AND TRIM("modernRelevance") <> '')
          )
      )::int AS "hasContextQuotes"
    FROM "Quote"
  `

  if (!row) return null

  return {
    ...row,
    avgVerificationConfidence:
      row.avgVerificationConfidence !== null ? Number(row.avgVerificationConfidence) : null,
  }
}

async function fetchEntityCountMetrics({
  sevenDaysAgo,
  fourteenDaysAgo,
}: DashboardDateRange) {
  const [row] = await prisma.$queryRaw<EntityCountMetricsRow[]>`
    SELECT
      (SELECT COUNT(*)::int FROM "Author") AS "totalAuthors",
      (SELECT COUNT(*)::int FROM "Category") AS "totalCategories",
      (SELECT COUNT(*)::int FROM "Tag") AS "totalTags",
      (SELECT COUNT(*)::int FROM "Source") AS "totalSources",
      (SELECT COUNT(*)::int FROM "Collection") AS "totalCollections",
      (SELECT COUNT(*)::int FROM "Author" WHERE "createdAt" >= ${sevenDaysAgo}) AS "authorsLast7Days",
      (
        SELECT COUNT(*)::int
        FROM "Author"
        WHERE "createdAt" >= ${fourteenDaysAgo} AND "createdAt" < ${sevenDaysAgo}
      ) AS "authorsPrevious7Days",
      (SELECT COUNT(*)::int FROM "Category" WHERE "createdAt" >= ${sevenDaysAgo}) AS "categoriesLast7Days",
      (
        SELECT COUNT(*)::int
        FROM "Category"
        WHERE "createdAt" >= ${fourteenDaysAgo} AND "createdAt" < ${sevenDaysAgo}
      ) AS "categoriesPrevious7Days",
      (SELECT COUNT(*)::int FROM "Tag" WHERE "createdAt" >= ${sevenDaysAgo}) AS "tagsLast7Days",
      (
        SELECT COUNT(*)::int
        FROM "Tag"
        WHERE "createdAt" >= ${fourteenDaysAgo} AND "createdAt" < ${sevenDaysAgo}
      ) AS "tagsPrevious7Days",
      (SELECT COUNT(*)::int FROM "Source" WHERE "createdAt" >= ${sevenDaysAgo}) AS "sourcesLast7Days",
      (
        SELECT COUNT(*)::int
        FROM "Source"
        WHERE "createdAt" >= ${fourteenDaysAgo} AND "createdAt" < ${sevenDaysAgo}
      ) AS "sourcesPrevious7Days",
      (
        SELECT COUNT(DISTINCT a.id)::int
        FROM "Author" a
        INNER JOIN "Quote" q ON q."authorId" = a.id AND q."deletedAt" IS NULL
      ) AS "activeAuthors",
      (
        SELECT COUNT(DISTINCT c.id)::int
        FROM "Category" c
        INNER JOIN "Quote" q ON q."categoryId" = c.id AND q."deletedAt" IS NULL
      ) AS "activeCategories",
      (
        SELECT COUNT(DISTINCT t.id)::int
        FROM "Tag" t
        INNER JOIN "QuoteTag" qt ON qt."tagId" = t.id
        INNER JOIN "Quote" q ON q.id = qt."quoteId" AND q."deletedAt" IS NULL
      ) AS "activeTags"
  `

  return row
}

async function fetchEngagementMetrics({
  sevenDaysAgo,
  fourteenDaysAgo,
}: DashboardDateRange) {
  const [row] = await prisma.$queryRaw<EngagementMetricsRow[]>`
    SELECT
      COALESCE(SUM(views) FILTER (WHERE date >= ${sevenDaysAgo}), 0)::int AS "currentViews",
      COALESCE(SUM(shares) FILTER (WHERE date >= ${sevenDaysAgo}), 0)::int AS "currentShares",
      COALESCE(
        SUM(views) FILTER (WHERE date >= ${fourteenDaysAgo} AND date < ${sevenDaysAgo}),
        0
      )::int AS "previousViews",
      COALESCE(
        SUM(shares) FILTER (WHERE date >= ${fourteenDaysAgo} AND date < ${sevenDaysAgo}),
        0
      )::int AS "previousShares"
    FROM "QuoteDailyStat"
  `

  return row
}

async function fetchPublishedDailySeries() {
  const rows = await prisma.$queryRaw<
    {
      day: Date | string
      count: number
    }[]
  >`
    SELECT
      series.day::date AS "day",
      COALESCE(COUNT(q.id), 0)::int AS "count"
    FROM generate_series(
      (CURRENT_TIMESTAMP AT TIME ZONE ${APP_TIME_ZONE})::date - INTERVAL '29 days',
      (CURRENT_TIMESTAMP AT TIME ZONE ${APP_TIME_ZONE})::date,
      INTERVAL '1 day'
    ) AS series(day)
    LEFT JOIN "Quote" q
      ON q."publishedAt" IS NOT NULL
      AND q."status" = 'PUBLISHED'
      AND q."deletedAt" IS NULL
      AND (q."publishedAt" AT TIME ZONE ${APP_TIME_ZONE})::date = series.day::date
    GROUP BY series.day
    ORDER BY series.day ASC;
  `

  return rows.map((r) => ({
    day: r.day instanceof Date ? r.day.toISOString() : String(r.day),
    count: Number(r.count),
  }))
}

async function fetchSourceTypeBreakdown() {
  return prisma.source.groupBy({
    by: ["type"],
    _count: { _all: true },
    orderBy: {
      _count: {
        type: "desc",
      },
    },
  })
}

async function fetchOrphanedSourceCount() {
  return prisma.source.count({
    where: {
      quotes: {
        none: {
          deletedAt: null,
        },
      },
    },
  })
}

async function fetchRecentQuotes() {
  const rows = await prisma.quote.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      content: true,
      createdAt: true,
      createdBy: { select: { email: true } },
    },
  })

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }))
}

async function fetchRecentAuthors() {
  const rows = await prisma.author.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, createdAt: true },
  })

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }))
}

async function fetchRecentSources() {
  const rows = await prisma.source.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, type: true, createdAt: true },
  })

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }))
}

async function fetchTopCategories() {
  return prisma.category.findMany({
    orderBy: { quoteCount: "desc" },
    take: 5,
    select: { id: true, name: true, quoteCount: true },
  })
}

async function fetchTopTags() {
  return prisma.tag.findMany({
    orderBy: { quoteCount: "desc" },
    take: 5,
    select: { id: true, name: true, type: true, quoteCount: true },
  })
}

async function fetchTopSources() {
  return prisma.source.findMany({
    orderBy: { quoteCount: "desc" },
    take: 5,
    select: { id: true, title: true, type: true, quoteCount: true },
  })
}

async function fetchMostViewedQuotes() {
  return prisma.quote.findMany({
    where: { deletedAt: null, status: "PUBLISHED" },
    orderBy: { views: "desc" },
    take: 5,
    select: { id: true, content: true, views: true, authorName: true },
  })
}

async function fetchTrendingQuotes() {
  const rows = await prisma.quote.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      publishedAt: { not: null },
    },
    orderBy: [{ trendingScore: "desc" }, { id: "asc" }],
    take: 5,
    select: {
      id: true,
      content: true,
      views: true,
      authorName: true,
      trendingScore: true,
    },
  })

  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    views: Number(r.views),
    authorName: r.authorName,
    score: Number(r.trendingScore),
  }))
}

export async function getDashboardMetrics(range: DashboardDateRange): Promise<DashboardMetrics> {
  const [
    quoteCounts,
    entityCounts,
    engagement,
    publishedDailySeries,
    sourceTypeBreakdown,
    orphanedSources,
    recentQuotes,
    recentAuthors,
    recentSources,
    topCategories,
    topTags,
    topSources,
    mostViewedQuotes,
    trendingQuotes,
  ] = await Promise.all([
    fetchQuoteCountMetrics(range),
    fetchEntityCountMetrics(range),
    fetchEngagementMetrics(range),
    fetchPublishedDailySeries(),
    fetchSourceTypeBreakdown(),
    fetchOrphanedSourceCount(),
    fetchRecentQuotes(),
    fetchRecentAuthors(),
    fetchRecentSources(),
    fetchTopCategories(),
    fetchTopTags(),
    fetchTopSources(),
    fetchMostViewedQuotes(),
    fetchTrendingQuotes(),
  ])

  if (!quoteCounts || !entityCounts || !engagement) {
    throw new Error("Failed to load dashboard metrics")
  }

  return {
    ...quoteCounts,
    ...entityCounts,
    recentQuotes,
    recentAuthors,
    recentSources,
    topCategories,
    topTags,
    topSources,
    mostViewedQuotes,
    trendingQuotes,
    publishedDailySeries,
    sourceTypeBreakdown,
    orphanedSources,
    engagementCurrent7d: {
      _sum: {
        views: engagement.currentViews,
        shares: engagement.currentShares,
      },
    },
    engagementPrevious7d: {
      _sum: {
        views: engagement.previousViews,
        shares: engagement.previousShares,
      },
    },
    verificationAggregate: {
      _avg: {
        verificationConfidence: quoteCounts.avgVerificationConfidence,
      },
    },
  }
}

let inMemoryDashboardCache: { data: DashboardMetrics; timestamp: number } | null = null
const IN_MEMORY_TTL_MS = 30 * 1000 // 30 seconds

registerDashboardInvalidator(() => {
  inMemoryDashboardCache = null
})

const getUnstableCachedDashboardMetrics = unstable_cache(
  async () => {
    const now = new Date()
    const sevenDaysAgo = subtractDays(now, 7)
    const fourteenDaysAgo = subtractDays(now, 14)
    const thirtyDaysAgo = subtractDays(now, 30)

    return getDashboardMetrics({
      sevenDaysAgo,
      fourteenDaysAgo,
      thirtyDaysAgo,
    })
  },
  ["admin-dashboard-metrics-summary"],
  {
    revalidate: 60,
    tags: [ADMIN_DASHBOARD_CACHE_TAG],
  }
)

export async function getCachedDashboardMetrics(): Promise<DashboardMetrics> {
  const now = Date.now()
  if (inMemoryDashboardCache && now - inMemoryDashboardCache.timestamp < IN_MEMORY_TTL_MS) {
    return inMemoryDashboardCache.data
  }

  try {
    const data = await getUnstableCachedDashboardMetrics()
    inMemoryDashboardCache = { data, timestamp: now }
    return data
  } catch {
    // Graceful fallback when invoked outside Next.js request/page context (e.g. tests or CLI)
    const sevenDaysAgo = subtractDays(new Date(), 7)
    const fourteenDaysAgo = subtractDays(new Date(), 14)
    const thirtyDaysAgo = subtractDays(new Date(), 30)

    const data = await getDashboardMetrics({
      sevenDaysAgo,
      fourteenDaysAgo,
      thirtyDaysAgo,
    })
    inMemoryDashboardCache = { data, timestamp: now }
    return data
  }
}
