import { prisma } from "@/lib/prisma"
import { subtractDays } from "@/lib/datetime"
import {
  PublicLayout,
  HomeHero,
  HomeMoodFilter,
  HomeHighlights,
  HomeDailyQuote,
  HomeTaxonomiesShowcase,
  HomeReaderStudio,
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

const dailyQuoteSelect = {
  id: true,
  slug: true,
  content: true,
  meaning: true,
  historicalContext: true,
  authorName: true,
  author: {
    select: {
      name: true,
      slug: true,
      profession: true,
      nationality: true,
      birthYear: true,
      deathYear: true,
    },
  },
  views: true,
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
} as const

export default async function HomePage() {
  const sevenDaysAgo = subtractDays(new Date(), 7)

  const {
    dailyQuote,
    serendipityPool,
    latestQuotes,
    trendingQuotes,
    topCategories,
    topTags,
    recentAuthors,
    spotlightAuthors,
    spotlightCategories,
    totalPublishedQuotes,
    quotesLast7Days,
    errorMessage,
  } = await loadHomePageData(sevenDaysAgo)

  const heroQuote = dailyQuote ?? latestQuotes[0] ?? null
  const companionPool = serendipityPool.filter((q) => q.id !== heroQuote?.id)
  const remainingLatestQuotes = latestQuotes.filter((q) => q.id !== heroQuote?.id)

  return (
    <PublicLayout>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10 space-y-6 sm:space-y-8">
        <HomeHero
          totalPublishedQuotes={totalPublishedQuotes}
          heroQuote={heroQuote}
          companionQuotes={companionPool.length > 0 ? companionPool : remainingLatestQuotes.slice(0, 5)}
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

        {dailyQuote && (
          <div id="daily-quote" className="scroll-mt-20">
            <HomeDailyQuote
              initialQuote={dailyQuote}
              serendipityPool={serendipityPool}
            />
          </div>
        )}

        {spotlightAuthors.length > 0 && spotlightCategories.length > 0 && (
          <div id="taxonomies" className="scroll-mt-20">
            <HomeTaxonomiesShowcase
              spotlightAuthors={spotlightAuthors}
              spotlightCategories={spotlightCategories}
            />
          </div>
        )}

        <div id="reader-studio" className="scroll-mt-20">
          <HomeReaderStudio
            featuredSampleQuote={
              dailyQuote
                ? {
                    content: dailyQuote.content,
                    authorName: dailyQuote.author?.name || dailyQuote.authorName,
                    sourceTitle: dailyQuote.source?.title,
                    slug: dailyQuote.slug,
                  }
                : null
            }
          />
        </div>

        <div id="trending" className="scroll-mt-20">
          <HomeTrendingSection
            trendingQuotes={trendingQuotes}
            topTags={topTags}
          />
        </div>

        <div id="latest" className="scroll-mt-20">
          <HomeLatestQuotes quotes={remainingLatestQuotes} />
        </div>
      </main>
    </PublicLayout>
  )
}

async function loadHomePageData(sevenDaysAgo: Date) {
  try {
    // Deterministic daily seed based on UTC date string
    const todayStr = new Date().toISOString().slice(0, 10)
    let hash = 0
    for (let i = 0; i < todayStr.length; i++) {
      hash = (hash << 5) - hash + todayStr.charCodeAt(i)
      hash |= 0
    }
    const dailySeed = Math.abs(hash)

    const totalPublishedQuotes = await prisma.quote.count({
      where: { status: "PUBLISHED", deletedAt: null },
    })
    const dailySkip = totalPublishedQuotes > 0 ? dailySeed % totalPublishedQuotes : 0

    const [
      dailyQuote,
      serendipityPool,
      latestQuotes,
      trendingQuotes,
      spotlightCategoriesRaw,
      topTags,
      spotlightAuthorsRaw,
      totalAuthors,
      quotesLast7Days,
    ] = await Promise.all([
      prisma.quote.findFirst({
        where: { status: "PUBLISHED", deletedAt: null },
        skip: dailySkip,
        select: dailyQuoteSelect,
      }),
      prisma.quote.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: [{ views: "desc" }, { publishedAt: "desc" }],
        take: 12,
        select: dailyQuoteSelect,
      }),
      prisma.quote.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: [{ publishedAt: "desc" }],
        take: 8,
        select: quoteCardSelect,
      }),
      prisma.quote.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
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
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          quoteCount: true,
          quotes: {
            where: { status: "PUBLISHED", deletedAt: null },
            take: 1,
            orderBy: { popularityScore: "desc" },
            select: {
              content: true,
              authorName: true,
            },
          },
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
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          birthYear: true,
          deathYear: true,
          profession: true,
          nationality: true,
          imageUrl: true,
          quoteCount: true,
          quotes: {
            where: { status: "PUBLISHED", deletedAt: null },
            take: 1,
            orderBy: { popularityScore: "desc" },
            select: {
              content: true,
              slug: true,
            },
          },
        },
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

    const spotlightAuthors = spotlightAuthorsRaw.map((a) => ({
      ...a,
      topQuote: a.quotes[0] ?? null,
    }))
    const recentAuthors = spotlightAuthorsRaw.slice(0, 5).map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      birthYear: a.birthYear,
      deathYear: a.deathYear,
      profession: a.profession,
      nationality: a.nationality,
      quoteCount: a.quoteCount,
    }))

    const spotlightCategories = spotlightCategoriesRaw.map((c) => ({
      ...c,
      topQuote: c.quotes[0] ?? null,
    }))
    const topCategories = spotlightCategoriesRaw.slice(0, 6).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      quoteCount: c.quoteCount,
    }))

    return {
      dailyQuote,
      serendipityPool,
      latestQuotes,
      trendingQuotes,
      topCategories,
      topTags,
      recentAuthors,
      spotlightAuthors,
      spotlightCategories,
      totalPublishedQuotes,
      totalAuthors,
      quotesLast7Days,
      errorMessage: null,
    }
  } catch (error) {
    console.error("Failed to load homepage metrics", error)

    return {
      dailyQuote: null,
      serendipityPool: [],
      latestQuotes: [],
      trendingQuotes: [],
      topCategories: [],
      topTags: [],
      recentAuthors: [],
      spotlightAuthors: [],
      spotlightCategories: [],
      totalPublishedQuotes: 0,
      totalAuthors: 0,
      quotesLast7Days: 0,
      errorMessage: "Some homepage data is temporarily unavailable. The page is still online, but metrics and listings may be incomplete.",
    }
  }
}
