import { prisma } from "@/lib/prisma"
import { subtractDays } from "@/lib/datetime"
import {
  PublicLayout,
  HomeHero,
  HomeMoodFilter,
  HomeHighlights,
  HomeTrendingSection,
  HomeLatestQuotes,
} from "@/components"

export const revalidate = 60

const quoteCardSelect = {
  id: true,
  slug: true,
  content: true,
  authorName: true,
  author: {
    select: {
      name: true,
      slug: true,
    },
  },
  views: true,
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
  source: {
    select: {
      title: true,
      year: true,
      yearLabel: true,
      yearApproximate: true,
    },
  },
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    take: 4,
  },
} as const

export default async function HomePage() {
  const sevenDaysAgo = subtractDays(new Date(), 7)

  const {
    featuredQuote,
    latestQuotes,
    trendingQuotes,
    topCategories,
    topTags,
    recentAuthors,
    totalPublishedQuotes,
    totalAuthors,
    quotesLast7Days,
    errorMessage,
  } = await loadHomePageData(sevenDaysAgo)

  const heroQuote = featuredQuote ?? latestQuotes[0] ?? null

  return (
    <PublicLayout>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10 space-y-6 sm:space-y-8">
        <HomeHero
          totalPublishedQuotes={totalPublishedQuotes}
          totalAuthors={totalAuthors}
          quotesLast7Days={quotesLast7Days}
          heroQuote={heroQuote}
        />

        <HomeMoodFilter />

        <div id="highlights" className="scroll-mt-20">
          <HomeHighlights
            topCategories={topCategories}
            recentAuthors={recentAuthors}
            quotesLast7Days={quotesLast7Days}
            errorMessage={errorMessage}
          />
        </div>

        <div id="trending" className="scroll-mt-20">
          <HomeTrendingSection
            trendingQuotes={trendingQuotes}
            topTags={topTags}
            latestCount={latestQuotes.length}
            tagCount={topTags.length}
            categoryCount={topCategories.length}
          />
        </div>

        <div id="latest" className="scroll-mt-20">
          <HomeLatestQuotes quotes={latestQuotes} />
        </div>
      </main>
    </PublicLayout>
  )
}

async function loadHomePageData(sevenDaysAgo: Date) {
  try {
    const [
      featuredQuote,
      latestQuotes,
      trendingQuotes,
      topCategories,
      topTags,
      recentAuthors,
      totalPublishedQuotes,
      totalAuthors,
      quotesLast7Days,
    ] = await Promise.all([
      prisma.quote.findFirst({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          isFeatured: true,
        },
        orderBy: [{ publishedAt: "desc" }],
        select: quoteCardSelect,
      }),
      prisma.quote.findMany({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
        },
        orderBy: [{ publishedAt: "desc" }],
        take: 8,
        select: quoteCardSelect,
      }),
      prisma.quote.findMany({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
        },
        orderBy: [{ trendingScore: "desc" }, { views: "desc" }],
        take: 4,
        select: {
          ...quoteCardSelect,
          trendingScore: true,
        },
      }),
      prisma.category.findMany({
        where: { quoteCount: { gt: 0 } },
        orderBy: [{ quoteCount: "desc" }, { name: "asc" }],
        take: 6,
        select: {
          id: true,
          name: true,
          quoteCount: true,
        },
      }),
      prisma.tag.findMany({
        where: { quoteCount: { gt: 0 } },
        orderBy: [{ quoteCount: "desc" }, { name: "asc" }],
        take: 8,
        select: {
          id: true,
          name: true,
          type: true,
          quoteCount: true,
        },
      }),
      prisma.author.findMany({
        where: { quoteCount: { gt: 0 } },
        orderBy: [{ quoteCount: "desc" }, { name: "asc" }],
        take: 5,
        select: {
          id: true,
          name: true,
          quoteCount: true,
        },
      }),
      prisma.quote.count({
        where: { status: "PUBLISHED", deletedAt: null },
      }),
      prisma.author.count(),
      prisma.quote.count({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ])

    return {
      ok: true,
      featuredQuote,
      latestQuotes,
      trendingQuotes,
      topCategories,
      topTags,
      recentAuthors,
      totalPublishedQuotes,
      totalAuthors,
      quotesLast7Days,
      errorMessage: null,
    }
  } catch (error) {
    console.error("Failed to load homepage metrics", error)

    return {
      ok: false,
      featuredQuote: null,
      latestQuotes: [],
      trendingQuotes: [],
      topCategories: [],
      topTags: [],
      recentAuthors: [],
      totalPublishedQuotes: 0,
      totalAuthors: 0,
      quotesLast7Days: 0,
      errorMessage: "Some homepage data is temporarily unavailable. The page is still online, but metrics and listings may be incomplete.",
    }
  }
}
