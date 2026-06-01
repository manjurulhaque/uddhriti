import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { APP_TIME_ZONE, formatDateInAppTimeZone, formatShortDateInAppTimeZone, subtractDays } from "@/lib/datetime"

export default async function DashboardPage() {
  const admin = await getAdmin()
  if (!admin || admin.role !== "SUPER_ADMIN") {
    redirect("/admin/login")
  }

  const now = new Date()
  const sevenDaysAgo = subtractDays(now, 7)
  const fourteenDaysAgo = subtractDays(now, 14)
  const thirtyDaysAgo = subtractDays(now, 30)

  const [
    totalQuotes,
    publishedQuotes,
    draftQuotes,
    reviewQuotes,
    archivedQuotes,
    featuredQuotes,
    unattributedQuotes,
    quotesLast7Days,
    totalAuthors,
    totalCategories,
    totalTags,
    totalSources,
    totalCollections,
    deletedQuotes,
    quotesPrevious7Days,
    authorsLast7Days,
    authorsPrevious7Days,
    categoriesLast7Days,
    categoriesPrevious7Days,
    tagsLast7Days,
    tagsPrevious7Days,
    sourcesLast7Days,
    sourcesPrevious7Days,
    recentQuotes,
    recentAuthors,
    recentSources,
    topCategories,
    topTags,
    topSources,
    mostViewedQuotes,
    trendingQuotes,
  ] = await Promise.all([
    prisma.quote.count({ where: { deletedAt: null } }),
    prisma.quote.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    prisma.quote.count({ where: { status: "DRAFT", deletedAt: null } }),
    prisma.quote.count({ where: { status: "REVIEW", deletedAt: null } }),
    prisma.quote.count({ where: { status: "ARCHIVED", deletedAt: null } }),
    prisma.quote.count({ where: { isFeatured: true, deletedAt: null } }),
    prisma.quote.count({
      where: {
        deletedAt: null,
        OR: [{ authorId: null }, { authorName: null }],
      },
    }),
    prisma.quote.count({
      where: {
        deletedAt: null,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.author.count(),
    prisma.category.count(),
    prisma.tag.count(),
    prisma.source.count(),
    prisma.collection.count(),
    prisma.quote.count({ where: { deletedAt: { not: null } } }),
    prisma.quote.count({
      where: {
        deletedAt: null,
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
    }),
    prisma.author.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.author.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    prisma.category.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.category.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    prisma.tag.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.tag.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    prisma.source.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.source.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    prisma.quote.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        content: true,
        createdAt: true,
        createdBy: { select: { email: true } },
      },
    }),
    prisma.author.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.source.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, type: true, createdAt: true },
    }),
    prisma.category.findMany({
      orderBy: { quoteCount: "desc" },
      take: 5,
      select: { id: true, name: true, quoteCount: true },
    }),
    prisma.tag.findMany({
      orderBy: { quoteCount: "desc" },
      take: 5,
      select: { id: true, name: true, type: true, quoteCount: true },
    }),
    prisma.source.findMany({
      orderBy: { quoteCount: "desc" },
      take: 5,
      select: { id: true, title: true, type: true, quoteCount: true },
    }),
    prisma.quote.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      orderBy: { views: "desc" },
      take: 5,
      select: { id: true, content: true, views: true, authorName: true },
    }),
    prisma.$queryRaw<
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
    `,
  ])

  const publishRate = totalQuotes === 0 ? 0 : Math.round((publishedQuotes / totalQuotes) * 100)
  const attributedQuotes = Math.max(0, totalQuotes - unattributedQuotes)
  const [
    verifiedQuotes,
    missingSourceQuotes,
    publishedLast7Days,
    publishedDailySeries,
    engagementCurrent7d,
    engagementPrevious7d,
    attributionConfirmedQuotes,
    attributionDisputedQuotes,
    attributionMisattributedQuotes,
    attributionUnknownQuotes,
    verificationAggregate,
    lowConfidenceQuotes,
    noTagQuotes,
    orphanedQuotes,
    orphanedSources,
    moderationBacklogQuotes,
    staleModerationQuotes,
    publishedLast30Days,
    publishedPrevious7Days,
    sourceTypeBreakdown,
    activeAuthors,
    activeCategories,
    activeTags,
    featuredPublishedQuotes,
  ] = await Promise.all([
      prisma.quote.count({
        where: {
          deletedAt: null,
          isVerified: true,
        },
      }),
      prisma.quote.count({
        where: {
          deletedAt: null,
          sourceId: null,
        },
      }),
      prisma.quote.count({
        where: {
          deletedAt: null,
          status: "PUBLISHED",
          publishedAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.$queryRaw<
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
      `,
      prisma.quoteDailyStat.aggregate({
        where: {
          date: { gte: sevenDaysAgo },
        },
        _sum: {
          views: true,
          shares: true,
        },
      }),
      prisma.quoteDailyStat.aggregate({
        where: {
          date: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
        _sum: {
          views: true,
          shares: true,
        },
      }),
      prisma.quote.count({
        where: {
          deletedAt: null,
          attributionStatus: "CONFIRMED",
        },
      }),
      prisma.quote.count({
        where: {
          deletedAt: null,
          attributionStatus: "DISPUTED",
        },
      }),
      prisma.quote.count({
        where: {
          deletedAt: null,
          attributionStatus: "MISATTRIBUTED",
        },
      }),
      prisma.quote.count({
        where: {
          deletedAt: null,
          attributionStatus: "UNKNOWN",
        },
      }),
      prisma.quote.aggregate({
        where: { deletedAt: null },
        _avg: { verificationConfidence: true },
      }),
      prisma.quote.count({
        where: {
          deletedAt: null,
          verificationConfidence: { lt: 0.5 },
        },
      }),
      prisma.quote.count({
        where: {
          deletedAt: null,
          tags: { none: {} },
        },
      }),
      prisma.quote.count({
        where: {
          deletedAt: null,
          OR: [{ authorId: null }, { authorName: null }, { sourceId: null }, { tags: { none: {} } }],
        },
      }),
      prisma.source.count({
        where: {
          quotes: {
            none: {
              deletedAt: null,
            },
          },
        },
      }),
      prisma.quote.count({
        where: {
          deletedAt: null,
          status: { in: ["DRAFT", "REVIEW"] },
        },
      }),
      prisma.quote.count({
        where: {
          deletedAt: null,
          status: { in: ["DRAFT", "REVIEW"] },
          createdAt: { lt: fourteenDaysAgo },
        },
      }),
      prisma.quote.count({
        where: {
          deletedAt: null,
          status: "PUBLISHED",
          publishedAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.quote.count({
        where: {
          deletedAt: null,
          status: "PUBLISHED",
          publishedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
      }),
      prisma.source.groupBy({
        by: ["type"],
        _count: { _all: true },
        orderBy: {
          _count: {
            type: "desc",
          },
        },
      }),
      prisma.author.count({
        where: {
          quotes: {
            some: {
              deletedAt: null,
            },
          },
        },
      }),
      prisma.category.count({
        where: {
          quotes: {
            some: {
              deletedAt: null,
            },
          },
        },
      }),
      prisma.tag.count({
        where: {
          quotes: {
            some: {
              quote: {
                deletedAt: null,
              },
            },
          },
        },
      }),
      prisma.quote.count({
        where: {
          deletedAt: null,
          status: "PUBLISHED",
          isFeatured: true,
        },
      }),
    ])

  const verifiedRate = totalQuotes === 0 ? 0 : Math.round((verifiedQuotes / totalQuotes) * 100)
  const publishVelocity = Number((publishedLast7Days / 7).toFixed(1))
  const currentViews7d = engagementCurrent7d._sum.views ?? 0
  const currentShares7d = engagementCurrent7d._sum.shares ?? 0
  const previousViews7d = engagementPrevious7d._sum.views ?? 0
  const previousShares7d = engagementPrevious7d._sum.shares ?? 0
  const engagementNow = currentViews7d + currentShares7d
  const engagementPrev = previousViews7d + previousShares7d
  const engagementTrendPct =
    engagementPrev === 0
      ? engagementNow > 0
        ? 100
        : 0
      : Math.round(((engagementNow - engagementPrev) / engagementPrev) * 100)
  const engagementTrendLabel = `${engagementTrendPct >= 0 ? "+" : ""}${engagementTrendPct}% vs prev 7d`
  const statusBreakdownLabel = `D:${formatNumber(draftQuotes)} R:${formatNumber(reviewQuotes)} A:${formatNumber(
    archivedQuotes
  )}`
  const attributionKnownQuotes = Math.max(0, totalQuotes - attributionUnknownQuotes)
  const attributionKnownRate = totalQuotes === 0 ? 0 : Math.round((attributionKnownQuotes / totalQuotes) * 100)
  const avgVerificationConfidence = Number(verificationAggregate._avg.verificationConfidence ?? 0)
  const avgVerificationConfidencePct = `${Math.round(avgVerificationConfidence * 100)}%`
  const publishVelocity30d = Number((publishedLast30Days / 30).toFixed(1))
  const topSourceType = sourceTypeBreakdown[0]?.type ?? "N/A"
  const topSourceTypeCount = sourceTypeBreakdown[0]?._count._all ?? 0
  const topSourceTypePct = totalSources === 0 ? 0 : Math.round((topSourceTypeCount / totalSources) * 100)
  const attributionRiskQuotes = attributionDisputedQuotes + attributionMisattributedQuotes
  const attributionRiskPct = totalQuotes === 0 ? 0 : Math.round((attributionRiskQuotes / totalQuotes) * 100)
  const authorCoveragePct = totalAuthors === 0 ? 0 : Math.round((activeAuthors / totalAuthors) * 100)
  const categoryCoveragePct = totalCategories === 0 ? 0 : Math.round((activeCategories / totalCategories) * 100)
  const tagCoveragePct = totalTags === 0 ? 0 : Math.round((activeTags / totalTags) * 100)
  const featuredPublishedPct = publishedQuotes === 0 ? 0 : Math.round((featuredPublishedQuotes / publishedQuotes) * 100)
  const engagementPerPublished7d = publishedLast7Days === 0 ? 0 : Math.round(engagementNow / publishedLast7Days)
  const published30dTotal = publishedDailySeries.reduce((sum, entry) => sum + entry.count, 0)
  const published30dAvg = Number((published30dTotal / Math.max(publishedDailySeries.length, 1)).toFixed(1))
  const published30dPeak = Math.max(...publishedDailySeries.map((entry) => entry.count), 0)
  const quotesTrendLabel = formatPeriodDelta(quotesLast7Days, quotesPrevious7Days, "created")
  const authorsTrendLabel = formatPeriodDelta(authorsLast7Days, authorsPrevious7Days, "added")
  const categoriesTrendLabel = formatPeriodDelta(categoriesLast7Days, categoriesPrevious7Days, "added")
  const tagsTrendLabel = formatPeriodDelta(tagsLast7Days, tagsPrevious7Days, "added")
  const sourcesTrendLabel = formatPeriodDelta(sourcesLast7Days, sourcesPrevious7Days, "added")
  const publishedTrendLabel = formatPeriodDelta(publishedLast7Days, publishedPrevious7Days, "published")
  const deletedTrendLabel = deletedQuotes === 0 ? "Trash is empty" : `${formatNumber(deletedQuotes)} awaiting review`

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-6 py-8 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-stone-700">
            Admin Overview
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-950 md:text-4xl">Dashboard</h1>
            <p className="text-sm text-stone-600">Operations, quality, and publishing health</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/quotes/new" className="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800">
            + New Quote
          </Link>
          <Link href="/admin/quotes/import" className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition hover:border-stone-400 hover:bg-stone-50">
            Import Quotes
          </Link>
          <Link href="/admin/authors/bulk" className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition hover:border-stone-400 hover:bg-stone-50">
            Import Authors
          </Link>
          <Link href="/admin/sources/bulk" className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition hover:border-stone-400 hover:bg-stone-50">
            Import Sources
          </Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_24%),linear-gradient(180deg,_#ffffff_0%,_#fafaf9_100%)] p-5 shadow-[0_18px_50px_rgba(28,25,23,0.08)]">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
          <StatCard title="Quotes" value={totalQuotes} subtitle={quotesTrendLabel} href="/admin/quotes" />
          <StatCard title="Published" value={publishedQuotes} subtitle={`${publishRate}% rate | ${publishedTrendLabel}`} href="/admin/quotes" />
          <StatCard title="Authors" value={totalAuthors} subtitle={authorsTrendLabel} href="/admin/authors" />
          <StatCard title="Categories" value={totalCategories} subtitle={categoriesTrendLabel} href="/admin/categories" />
          <StatCard title="Tags" value={totalTags} subtitle={tagsTrendLabel} href="/admin/tags" />
          <StatCard title="Sources" value={totalSources} subtitle={sourcesTrendLabel} href="/admin/sources" />
          <StatCard title="Collections" value={totalCollections} href="#" />
          <StatCard title="Trash" value={deletedQuotes} subtitle={deletedTrendLabel} href="/admin/quotes/deleted" />
        </div>
      </section>

      <DashboardCard title="Needs Attention">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <AttentionCard
            title="Moderation Backlog"
            value={moderationBacklogQuotes}
            subtitle={`${formatNumber(staleModerationQuotes)} stale for more than 14 days`}
            href="/admin/quotes?filter=draft"
            tone={staleModerationQuotes > 0 ? "danger" : "warning"}
          />
          <AttentionCard
            title="Unattributed Quotes"
            value={unattributedQuotes}
            subtitle="Missing author relation or author name"
            href="/admin/quotes?filter=unattributed"
            tone={unattributedQuotes > 0 ? "danger" : "neutral"}
          />
          <AttentionCard
            title="Missing Sources"
            value={missingSourceQuotes}
            subtitle="Quotes that still need a source"
            href="/admin/quotes?filter=missing-source"
            tone={missingSourceQuotes > 0 ? "warning" : "neutral"}
          />
          <AttentionCard
            title="No Tags"
            value={noTagQuotes}
            subtitle="Quotes that need tag coverage"
            href="/admin/quotes?filter=no-tags"
            tone={noTagQuotes > 0 ? "warning" : "neutral"}
          />
          <AttentionCard
            title="Trash"
            value={deletedQuotes}
            subtitle="Soft-deleted quotes waiting in recycle bin"
            href="/admin/quotes/deleted"
            tone={deletedQuotes > 0 ? "warning" : "neutral"}
          />
        </div>
      </DashboardCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Status Breakdown" value={formatNumber(publishedQuotes)} subtitle={statusBreakdownLabel} href="/admin/quotes" />
        <KpiCard title="Verified Rate" value={`${verifiedRate}%`} subtitle={`${formatNumber(verifiedQuotes)} verified`} href="/admin/quotes" />
        <KpiCard title="Publish Velocity" value={`${publishVelocity}/day`} subtitle={`${formatNumber(publishedLast7Days)} published in 7d`} href="/admin/quotes" />
        <KpiCard title="Missing Source" value={formatNumber(missingSourceQuotes)} subtitle="Quotes without source" href="/admin/quotes?filter=missing-source" />
        <KpiCard
          title="7d Engagement Trend"
          value={formatNumber(engagementNow)}
          subtitle={`${engagementTrendLabel} | ${formatNumber(currentViews7d)} views, ${formatNumber(currentShares7d)} shares`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Attribution Quality"
          value={`${attributionKnownRate}% known`}
          subtitle={`C:${formatNumber(attributionConfirmedQuotes)} D:${formatNumber(attributionDisputedQuotes)} M:${formatNumber(
            attributionMisattributedQuotes
          )} U:${formatNumber(attributionUnknownQuotes)}`}
          href="/admin/quotes"
        />
        <KpiCard
          title="Verification Confidence"
          value={avgVerificationConfidencePct}
          subtitle={`Avg ${avgVerificationConfidence.toFixed(2)} | ${formatNumber(lowConfidenceQuotes)} low-confidence`}
          href="/admin/quotes"
        />
        <KpiCard title="No Tags" value={formatNumber(noTagQuotes)} subtitle="Quotes without tags" href="/admin/quotes?filter=no-tags" />
        <KpiCard title="Orphaned Sources" value={formatNumber(orphanedSources)} subtitle="Sources with zero active quotes" href="/admin/sources" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Moderation Backlog"
          value={formatNumber(moderationBacklogQuotes)}
          subtitle={`${formatNumber(staleModerationQuotes)} stale (>14d)`}
          href="/admin/quotes?filter=draft"
        />
        <KpiCard
          title="Published (30d)"
          value={formatNumber(publishedLast30Days)}
          subtitle={`${publishVelocity30d}/day average`}
          href="/admin/quotes"
        />
        <KpiCard
          title="Top Source Type"
          value={topSourceType}
          subtitle={`${formatNumber(topSourceTypeCount)} sources (${topSourceTypePct}%)`}
          href="/admin/sources"
        />
        <KpiCard
          title="Attribution Risk"
          value={formatNumber(attributionRiskQuotes)}
          subtitle={`${attributionRiskPct}% disputed/misattributed`}
          href="/admin/quotes"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Author Coverage"
          value={`${authorCoveragePct}%`}
          subtitle={`${formatNumber(activeAuthors)} of ${formatNumber(totalAuthors)} active`}
          href="/admin/authors"
        />
        <KpiCard
          title="Category Coverage"
          value={`${categoryCoveragePct}%`}
          subtitle={`${formatNumber(activeCategories)} of ${formatNumber(totalCategories)} active`}
          href="/admin/categories"
        />
        <KpiCard
          title="Tag Coverage"
          value={`${tagCoveragePct}%`}
          subtitle={`${formatNumber(activeTags)} of ${formatNumber(totalTags)} active`}
          href="/admin/tags"
        />
        <KpiCard
          title="Featured Published"
          value={`${featuredPublishedPct}%`}
          subtitle={`${formatNumber(featuredPublishedQuotes)} featured | ${formatNumber(engagementPerPublished7d)} engagement/7d publish`}
          href="/admin/quotes"
        />
      </div>

      <DashboardCard title="Published Quotes (Last 30 Days)">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
            <span className="rounded-full bg-stone-100 px-3 py-1">{formatNumber(published30dTotal)} total published</span>
            <span className="rounded-full bg-stone-100 px-3 py-1">{published30dAvg}/day average</span>
            <span className="rounded-full bg-stone-100 px-3 py-1">{formatNumber(publishedLast7Days)} in the last 7 days</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">Peak day: {formatNumber(published30dPeak)}</span>
          </div>
          <MiniBarChart
            data={publishedDailySeries.map((entry) => ({
              label: formatShortDate(entry.day),
              value: entry.count,
            }))}
          />
        </div>
      </DashboardCard>

      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardCard title="Publishing Status Breakdown">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Draft" value={draftQuotes} />
            <Metric label="Review" value={reviewQuotes} />
            <Metric label="Published" value={publishedQuotes} />
            <Metric label="Archived" value={archivedQuotes} />
            <Metric label="Featured" value={featuredQuotes} />
            <Metric label="Publish Rate" value={`${publishRate}%`} />
          </div>
        </DashboardCard>

        <DashboardCard title="Data Quality">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Attributed" value={attributedQuotes} />
            <Metric label="Unattributed" value={unattributedQuotes} />
            <Metric label="Orphaned" value={orphanedQuotes} />
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Unattributed quotes are missing author relation or author name.
          </p>
          <div className="grid gap-2 text-sm mt-3">
            <DashboardLink href="/admin/quotes?filter=orphaned" label="View Orphaned Quotes" />
            <DashboardLink href="/admin/quotes?filter=unattributed" label="View Unattributed Quotes" />
            <DashboardLink href="/admin/quotes?filter=missing-source" label="View Missing Source Quotes" />
            <DashboardLink href="/admin/quotes?filter=no-tags" label="View No-tag Quotes" />
          </div>
        </DashboardCard>

        <DashboardCard title="Quick Links">
          <div className="grid gap-2 text-sm">
            <DashboardLink href="/admin/categories/bulk" label="Bulk Create Categories" />
            <DashboardLink href="/admin/tags/bulk" label="Bulk Create Tags" />
            <DashboardLink href="/admin/authors/bulk" label="Bulk Import Authors" />
            <DashboardLink href="/admin/sources/bulk" label="Bulk Import Sources" />
            <DashboardLink href="/admin/quotes/import" label="Bulk Import Quotes" />
            <DashboardPostAction action="/api/admin/tools/recalculate-counts" label="Recalculate Quote Counts" />
          </div>
        </DashboardCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardCard title="Top Categories">
          <ListOrEmpty
            empty="No categories with quotes yet."
            items={topCategories.map((c, i) => ({
              key: c.id,
              left: `${i + 1}. ${c.name}`,
              right: `${formatNumber(c.quoteCount)} quotes`,
            }))}
          />
        </DashboardCard>

        <DashboardCard title="Top Tags">
          <ListOrEmpty
            empty="No tags with quotes yet."
            items={topTags.map((t, i) => ({
              key: t.id,
              left: `${i + 1}. ${t.name} (${t.type})`,
              right: `${formatNumber(t.quoteCount)} quotes`,
            }))}
          />
        </DashboardCard>

        <DashboardCard title="Top Sources">
          <ListOrEmpty
            empty="No sources with quotes yet."
            items={topSources.map((s, i) => ({
              key: s.id,
              left: `${i + 1}. ${truncate(s.title, 50)} (${s.type})`,
              right: `${formatNumber(s.quoteCount)} quotes`,
            }))}
          />
        </DashboardCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardCard title="Most Viewed Quotes">
          <ListOrEmpty
            empty="No published quotes with views yet."
            items={mostViewedQuotes.map((q, i) => ({
              key: q.id,
              left: `${i + 1}. ${truncate(q.content, 90)} | ${q.authorName ?? "Unknown"}`,
              right: `${formatNumber(q.views)} views`,
            }))}
          />
        </DashboardCard>

        <DashboardCard title="Trending Quotes">
          <ListOrEmpty
            empty="No trending signal available yet."
            items={trendingQuotes.map((q, i) => ({
              key: q.id,
              left: `${i + 1}. ${truncate(q.content, 90)} | ${q.authorName ?? "Unknown"}`,
              right: `Score ${q.score.toFixed(2)}`,
            }))}
          />
        </DashboardCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardCard title="Recent Quotes">
          <div className="space-y-3 text-sm">
            {recentQuotes.length === 0 && <EmptyRow message="No recent quote activity." />}
            {recentQuotes.map((q) => (
              <div key={q.id} className="space-y-1">
                <div className="font-medium">{truncate(q.content, 85)}</div>
                <div className="text-gray-500">
                  {q.createdBy?.email ?? "System"} | {formatDateInAppTimeZone(q.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Recent Authors">
          <div className="space-y-3 text-sm">
            {recentAuthors.length === 0 && <EmptyRow message="No recent author activity." />}
            {recentAuthors.map((a) => (
              <div key={a.id} className="flex justify-between">
                <span>{a.name}</span>
                <span className="text-gray-500">{formatDateInAppTimeZone(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Recent Sources">
          <div className="space-y-3 text-sm">
            {recentSources.length === 0 && <EmptyRow message="No recent source activity." />}
            {recentSources.map((s) => (
              <div key={s.id} className="flex justify-between gap-3">
                <span>{truncate(s.title, 40)}</span>
                <span className="text-gray-500">{formatDateInAppTimeZone(s.createdAt)}</span>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

function formatPeriodDelta(current: number, previous: number, actionLabel: string) {
  const delta = current - previous
  const direction = delta > 0 ? "+" : ""
  return `${formatNumber(current)} ${actionLabel} in 7d | ${direction}${formatNumber(delta)} vs prev 7d`
}

function formatShortDate(value: Date) {
  return formatShortDateInAppTimeZone(value)
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}...`
}

function StatCard({
  title,
  value,
  subtitle,
  href,
}: {
  title: string
  value: number
  subtitle?: string
  href?: string
}) {
  const content = (
    <div className="h-full rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_8px_24px_rgba(28,25,23,0.06)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(28,25,23,0.10)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-500">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-stone-950">{formatNumber(value)}</p>
      {subtitle && <p className="mt-2 text-xs leading-5 text-stone-600">{subtitle}</p>}
    </div>
  )

  return href && href !== "#" ? <Link href={href}>{content}</Link> : content
}

function DashboardCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-[0_14px_36px_rgba(28,25,23,0.06)]">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-stone-950">{title}</h2>
      {children}
    </section>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
      <div className="text-xl font-bold tracking-tight text-stone-950">{typeof value === "number" ? formatNumber(value) : value}</div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500">{label}</div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  href,
}: {
  title: string
  value: string | number
  subtitle?: string
  href?: string
}) {
  const content = (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_10px_26px_rgba(28,25,23,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(28,25,23,0.08)]">
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-stone-950">{typeof value === "number" ? formatNumber(value) : value}</p>
      {subtitle ? <p className="mt-2 text-xs leading-5 text-stone-600">{subtitle}</p> : null}
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

function MiniBarChart({
  data,
}: {
  data: { label: string; value: number }[]
}) {
  if (data.length === 0) {
    return <EmptyRow message="No chart data available yet." />
  }

  const width = 560
  const height = 180
  const chartTop = 12
  const chartHeight = 120
  const horizontalPadding = 12
  const availableWidth = width - horizontalPadding * 2
  const gap = data.length > 20 ? 6 : 16
  const barWidth = Math.max(8, Math.floor((availableWidth - gap * Math.max(data.length - 1, 0)) / data.length))
  const xStep = barWidth + gap
  const maxValue = Math.max(...data.map((entry) => entry.value), 1)
  const peakValue = Math.max(...data.map((entry) => entry.value))
  const gridLines = [0.25, 0.5, 0.75, 1]
  const labelEvery = data.length > 20 ? 3 : 1

  return (
    <div className="space-y-3 rounded-[22px] border border-stone-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#fafaf9_100%)] p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        {gridLines.map((line) => {
          const y = chartTop + chartHeight - chartHeight * line
          return <line key={line} x1="0" x2={width} y1={y} y2={y} stroke="#e7e5e4" strokeDasharray="4 4" />
        })}
        {data.map((entry, index) => {
          const x = horizontalPadding + index * xStep
          const barHeight = maxValue === 0 ? 0 : Math.max((entry.value / maxValue) * chartHeight, entry.value > 0 ? 4 : 0)
          const y = chartTop + (chartHeight - barHeight)
          const isPeak = entry.value === peakValue && peakValue > 0

          return (
            <g key={`${entry.label}-${index}`}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={6} fill={isPeak ? "#d97706" : "#0f172a"} />
              {index % labelEvery === 0 ? (
                <text x={x + barWidth / 2} y={chartTop + chartHeight + 18} textAnchor="middle" className="fill-stone-500 text-[10px]">
                  {entry.label}
                </text>
              ) : null}
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="fill-stone-700 text-[10px]">
                {entry.value}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
          Daily published count
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
          Peak day
        </span>
      </div>
    </div>
  )
}

function AttentionCard({
  title,
  value,
  subtitle,
  href,
  tone,
}: {
  title: string
  value: number
  subtitle: string
  href: string
  tone: "neutral" | "warning" | "danger"
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-[linear-gradient(180deg,_#fff1f2_0%,_#ffe4e6_100%)]"
      : tone === "warning"
      ? "border-amber-200 bg-[linear-gradient(180deg,_#fffbeb_0%,_#fef3c7_100%)]"
      : "border-stone-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#fafaf9_100%)]"

  return (
    <Link href={href} className={`block rounded-[22px] border p-4 shadow-[0_10px_26px_rgba(28,25,23,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(28,25,23,0.08)] ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-stone-950">{formatNumber(value)}</p>
      <p className="mt-2 text-sm leading-6 text-stone-700">{subtitle}</p>
    </Link>
  )
}

function DashboardLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-stone-200 px-3 py-2 text-stone-700 transition hover:border-stone-300 hover:bg-stone-50">
      {label}
    </Link>
  )
}

function DashboardPostAction({ action, label }: { action: string; label: string }) {
  return (
    <form action={action} method="post">
      <button type="submit" className="w-full rounded-2xl border border-stone-200 px-3 py-2 text-left text-stone-700 transition hover:border-stone-300 hover:bg-stone-50">
        {label}
      </button>
    </form>
  )
}

function ListOrEmpty({
  items,
  empty,
}: {
  items: { key: string; left: string; right: string }[]
  empty: string
}) {
  if (items.length === 0) {
    return <EmptyRow message={empty} />
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key} className="flex justify-between gap-4 rounded-2xl border border-stone-100 bg-stone-50/70 px-3 py-2 text-sm">
          <span className="text-stone-800">{item.left}</span>
          <span className="whitespace-nowrap text-stone-500">{item.right}</span>
        </div>
      ))}
    </div>
  )
}

function EmptyRow({ message }: { message: string }) {
  return <p className="rounded-2xl border border-dashed border-stone-300 p-3 text-sm text-stone-500">{message}</p>
}
