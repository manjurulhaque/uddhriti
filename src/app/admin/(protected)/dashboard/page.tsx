import Link from "next/link"
import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { getCachedDashboardMetrics } from "@/lib/dashboard/metrics"
import { formatDateInAppTimeZone, formatShortDateInAppTimeZone } from "@/lib/datetime"
import { formatNumber } from "@/lib/formatters"
import { RefreshMetricsButton } from "./RefreshMetricsButton"
import { Button, Badge } from "@/components/ui"
import {
  PageHeader,
  StatCard,
  KpiCard,
  AttentionCard,
  MiniBarChart,
  Metric,
  DashboardCard,
  DashboardLink,
  DashboardPostAction,
  ListOrEmpty,
  EmptyRow,
} from "@/components/admin"

export default async function DashboardPage() {
  const admin = await getAdmin()
  if (!admin) {
    redirect("/admin/login")
  }

  if (admin.role !== "SUPER_ADMIN") {
    redirect("/")
  }

  const {
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
  } = await getCachedDashboardMetrics()

  const publishRate = totalQuotes === 0 ? 0 : Math.round((publishedQuotes / totalQuotes) * 100)
  const attributedQuotes = Math.max(0, totalQuotes - unattributedQuotes)

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
      <PageHeader
        title="Dashboard"
        description="Operations, quality, and publishing health across all quotation surfaces."
        badge={
          <Badge variant="neutral" size="sm">
            Admin Overview
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshMetricsButton />
            <Button href="/admin/quotes/new" variant="primary" size="sm">
              + New Quote
            </Button>
            <Button href="/admin/quotes/import" variant="outline" size="sm">
              Import Quotes
            </Button>
            <Button href="/admin/authors/bulk" variant="outline" size="sm">
              Import Authors
            </Button>
            <Button href="/admin/sources/bulk" variant="outline" size="sm">
              Import Sources
            </Button>
          </div>
        }
      />

      <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_24%),linear-gradient(180deg,_#ffffff_0%,_#fafaf9_100%)] p-5 shadow-[0_18px_50px_rgba(28,25,23,0.08)]">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
          <StatCard title="Quotes" value={totalQuotes} subtitle={quotesTrendLabel} href="/admin/quotes" />
          <StatCard title="Published" value={publishedQuotes} subtitle={`${publishRate}% rate | ${publishedTrendLabel}`} href="/admin/quotes" />
          <StatCard title="Authors" value={totalAuthors} subtitle={authorsTrendLabel} href="/admin/authors" />
          <StatCard title="Categories" value={totalCategories} subtitle={categoriesTrendLabel} href="/admin/categories" />
          <StatCard title="Tags" value={totalTags} subtitle={tagsTrendLabel} href="/admin/tags" />
          <StatCard title="Sources" value={totalSources} subtitle={sourcesTrendLabel} href="/admin/sources" />
          <StatCard title="Collections" value={totalCollections} href="/admin/collections" />
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
            <DashboardLink href="/admin/faqs/bulk" label="Bulk Import FAQs" />
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


function formatPeriodDelta(current: number, previous: number, actionLabel: string) {
  const delta = current - previous
  const direction = delta > 0 ? "+" : ""
  return `${formatNumber(current)} ${actionLabel} in 7d | ${direction}${formatNumber(delta)} vs prev 7d`
}

function formatShortDate(value: Date | string) {
  return formatShortDateInAppTimeZone(value)
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}...`
}
