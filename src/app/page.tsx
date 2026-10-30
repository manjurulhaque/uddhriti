import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { getSiteUrl } from "@/lib/site"
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

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: "Quotzen — Timeless Quotes, Philosophy & Literary Sanctuary",
  description:
    "Explore a curated, searchable collection of meaningful quotes from history's greatest philosophers, poets, and thinkers. Verified against primary texts, distraction-free, and available offline.",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Quotzen — Timeless Quotes, Philosophy & Literary Sanctuary",
    description:
      "A quiet, searchable sanctuary for memorable quotations from books, speeches, interviews, and thinkers across history.",
    url: siteUrl,
    siteName: "Quotzen",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Quotzen",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Quotzen — Timeless Quotes, Philosophy & Literary Sanctuary",
    description:
      "A quiet, searchable sanctuary for memorable quotations from books, speeches, and thinkers across history.",
    images: ["/icons/icon-512x512.png"],
  },
}

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

const serendipityQuoteSelect = {
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
  const {
    dailyQuote,
    featuredQuote,
    serendipityPool,
    latestQuotes,
    trendingQuotes,
    topTags,
    spotlightAuthors,
    spotlightCategories,
    errorMessage,
  } = await loadHomePageData()

  // Strict mutual exclusion registry: guarantees zero quote duplication across all sections
  const usedQuoteIds = new Set<string>()

  // 1. Featured Quote for Hero (Curator's Choice)
  const heroQuote = featuredQuote && featuredQuote.id !== dailyQuote?.id
    ? featuredQuote
    : (latestQuotes.find((q) => q.id !== dailyQuote?.id) ?? dailyQuote ?? null)
  if (heroQuote?.id) usedQuoteIds.add(heroQuote.id)

  // 2. Daily Quote (guaranteed distinct from heroQuote)
  const finalDailyQuote = dailyQuote && !usedQuoteIds.has(dailyQuote.id)
    ? dailyQuote
    : (latestQuotes.find((q) => !usedQuoteIds.has(q.id)) ?? null)
  if (finalDailyQuote?.id) usedQuoteIds.add(finalDailyQuote.id)

  // 3. Companion quotes pool for Hero (distinct from heroQuote and dailyQuote)
  const eligibleCompanionQuotes = serendipityPool.filter((q) => !usedQuoteIds.has(q.id))
  const companionPool = eligibleCompanionQuotes.length > 0
    ? eligibleCompanionQuotes
    : latestQuotes.filter((q) => !usedQuoteIds.has(q.id))

  const companionQuotes = companionPool.slice(0, 5).map((q) => ({
    id: q.id,
    slug: q.slug,
    content: q.content,
    authorName: q.author?.name || q.authorName,
    author: q.author ? { name: q.author.name, slug: q.author.slug } : null,
    category: q.category ? { name: q.category.name, slug: q.category.slug } : null,
    source: q.source,
  }))
  companionQuotes.forEach((q) => {
    if (q.id) usedQuoteIds.add(q.id)
  })

  // 4. Trending quotes (distinct from hero, daily, and companion quotes)
  const dedupedTrendingQuotes = trendingQuotes
    .filter((q) => !usedQuoteIds.has(q.id))
    .slice(0, 4)
  dedupedTrendingQuotes.forEach((q) => {
    if (q.id) usedQuoteIds.add(q.id)
  })

  // 5. Remaining latest quotes (distinct from all previous sections)
  const remainingLatestQuotes = latestQuotes
    .filter((q) => !usedQuoteIds.has(q.id))
    .slice(0, 8)

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "Quotzen",
        alternateName: ["Quotzen", "Quotzen Sanctuary"],
        description:
          "A quiet, searchable sanctuary for memorable quotations from books, speeches, interviews, and thinkers across history.",
        inLanguage: "en-US",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/quotes?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Quotzen",
        url: siteUrl,
        logo: `${siteUrl}/icons/icon-512x512.png`,
      },
      ...(heroQuote
        ? [
            {
              "@type": "Quotation",
              "@id": `${siteUrl}/quotes/${heroQuote.slug || heroQuote.id}#quotation`,
              text: heroQuote.content,
              creator: {
                "@type": "Person",
                name: heroQuote.author?.name || heroQuote.authorName || "Unknown",
                ...(heroQuote.author?.slug
                  ? { url: `${siteUrl}/authors/${heroQuote.author.slug}` }
                  : {}),
              },
              ...(heroQuote.source?.title ? { citation: heroQuote.source.title } : {}),
            },
          ]
        : []),
    ],
  }

  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10 space-y-6 sm:space-y-8">
        <HomeHero
          heroQuote={heroQuote}
          companionQuotes={companionQuotes}
        />

        <HomeMoodFilter />

        <div id="highlights" className="scroll-mt-20">
          <HomeHighlights
            errorMessage={errorMessage}
          />
        </div>

        {finalDailyQuote && (
          <div id="daily-quote" className="scroll-mt-20">
            <HomeDailyQuote
              initialQuote={finalDailyQuote}
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
          <HomeReaderStudio />
        </div>

        <div id="trending" className="scroll-mt-20">
          <HomeTrendingSection
            trendingQuotes={dedupedTrendingQuotes}
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

async function loadHomePageData() {
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
      featuredQuote,
      serendipityPool,
      latestQuotes,
      trendingQuotes,
      spotlightCategoriesRaw,
      topTags,
      spotlightAuthorsRaw,
    ] = await Promise.all([
      prisma.quote.findFirst({
        where: { status: "PUBLISHED", deletedAt: null },
        skip: dailySkip,
        select: dailyQuoteSelect,
      }),
      prisma.quote.findFirst({
        where: { status: "PUBLISHED", deletedAt: null, isFeatured: true },
        orderBy: [{ popularityScore: "desc" }, { views: "desc" }],
        select: quoteCardSelect,
      }),
      prisma.quote.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: [{ views: "desc" }, { publishedAt: "desc" }],
        take: 10,
        select: serendipityQuoteSelect,
      }),
      prisma.quote.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: [{ publishedAt: "desc" }],
        take: 16,
        select: quoteCardSelect,
      }),
      prisma.quote.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: [{ trendingScore: "desc" }, { views: "desc" }],
        take: 8,
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
    ])

    const spotlightAuthors = spotlightAuthorsRaw.map((a) => ({
      ...a,
      topQuote: a.quotes[0] ?? null,
    }))

    const spotlightCategories = spotlightCategoriesRaw.map((c) => ({
      ...c,
      topQuote: c.quotes[0] ?? null,
    }))

    return {
      dailyQuote,
      featuredQuote,
      serendipityPool,
      latestQuotes,
      trendingQuotes,
      topTags,
      spotlightAuthors,
      spotlightCategories,
      errorMessage: null,
    }
  } catch (error) {
    console.error("Failed to load homepage data", error)

    return {
      dailyQuote: null,
      featuredQuote: null,
      serendipityPool: [],
      latestQuotes: [],
      trendingQuotes: [],
      topTags: [],
      spotlightAuthors: [],
      spotlightCategories: [],
      errorMessage: "Some homepage data is temporarily unavailable. The page is still online, but content may be incomplete.",
    }
  }
}
