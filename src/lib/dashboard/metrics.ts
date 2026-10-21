import { prisma } from "@/lib/prisma"
import { APP_TIME_ZONE } from "@/lib/datetime"

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
      )::int AS "featuredPublishedQuotes"
    FROM "Quote"
  `

  return row
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
  return prisma.$queryRaw<
    {
      day: Date
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
  return prisma.quote.findMany({
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
}

async function fetchRecentAuthors() {
  return prisma.author.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, createdAt: true },
  })
}

async function fetchRecentSources() {
  return prisma.source.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, type: true, createdAt: true },
  })
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
  return prisma.$queryRaw<
    {
      id: string
      content: string
      views: number
      authorName: string | null
      score: number
    }[]
  >`
    SELECT
      q.id,
      q.content,
      q.views,
      q."authorName",
      q.views / POWER(
        EXTRACT(EPOCH FROM (NOW() - q."publishedAt")) / 3600 + 2,
        1.8
      ) AS score
    FROM "Quote" q
    WHERE q."status" = 'PUBLISHED'
      AND q."deletedAt" IS NULL
      AND q."publishedAt" IS NOT NULL
    ORDER BY score DESC
    LIMIT 5;
  `
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
