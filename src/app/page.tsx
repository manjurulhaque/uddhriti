import type { Metadata } from "next"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSiteUrl } from "@/lib/site"
import { formatSourceYearLabel } from "@/lib/sourceYear"
import {
  HOME_PAGE_CACHE_TAG,
  HOME_TAXONOMIES_CACHE_TAG,
  registerPublicDataInvalidator,
} from "@/lib/revalidation"
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
  type DynamicMoodQuote,
} from "@/components"

export const revalidate = 3600

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
  isVerified: true,
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
  isVerified: true,
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

// Module-level in-memory cache for fast lookups
let cachedTotalPublishedCount: { count: number; timestamp: number } | null = null
let cachedTaxonomies: {
  authors: Array<{
    id: string
    name: string
    slug: string
    profession: string | null
    nationality: string | null
    birthYear: number | null
    deathYear: number | null
    imageUrl: string | null
    quoteCount: number
    topQuote: { content: string; slug: string | null } | null
  }>
  categories: Array<{
    id: string
    name: string
    slug: string
    description: string | null
    quoteCount: number
    topQuote: { content: string; authorName: string | null } | null
  }>
  tags: Array<{
    id: string
    name: string
    type: string
    quoteCount: number
  }>
  timestamp: number
} | null = null

// Invalidate in-memory caches whenever public content mutations occur
registerPublicDataInvalidator(() => {
  cachedTotalPublishedCount = null
  cachedTaxonomies = null
})

async function getPublishedQuoteCount(): Promise<number> {
  const now = Date.now()
  if (cachedTotalPublishedCount && now - cachedTotalPublishedCount.timestamp < 10 * 60 * 1000) {
    return cachedTotalPublishedCount.count
  }
  try {
    const count = await prisma.quote.count({
      where: { status: "PUBLISHED", deletedAt: null },
    })
    cachedTotalPublishedCount = { count, timestamp: now }
    return count
  } catch (err) {
    console.error("Failed to count published quotes:", err)
    return cachedTotalPublishedCount?.count ?? 0
  }
}

async function getTaxonomiesData() {
  const now = Date.now()
  if (cachedTaxonomies && now - cachedTaxonomies.timestamp < 15 * 60 * 1000) {
    return cachedTaxonomies
  }

  const [spotlightCategoriesRaw, spotlightAuthorsRaw, topTags] = await Promise.all([
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
  ])

  const spotlightAuthors = spotlightAuthorsRaw.map((a) => ({
    ...a,
    topQuote: a.quotes[0] ?? null,
  }))

  const spotlightCategories = spotlightCategoriesRaw.map((c) => ({
    ...c,
    topQuote: c.quotes[0] ?? null,
  }))

  const result = {
    authors: spotlightAuthors,
    categories: spotlightCategories,
    tags: topTags,
    timestamp: now,
  }

  cachedTaxonomies = result
  return result
}

export default async function HomePage() {
  const todayStr = new Date().toISOString().slice(0, 10)
  const {
    dailyQuote,
    featuredQuote,
    companionQuotesPool,
    moodQuotesPool,
    dayIndex,
    latestQuotes,
    trendingQuotes,
    topTags,
    spotlightAuthors,
    spotlightCategories,
    errorMessage,
  } = await loadHomePageData(todayStr)

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

  // 3. Dynamic Daily Calendar Rotation for Reflect by Feeling (Moods)
  const moodCategoryMap: Record<string, { categories: string[]; offset: number }> = {
    stillness: { categories: ["philosophical"], offset: 5 },
    grit: { categories: ["failure"], offset: 1 },
    solace: { categories: ["sad"], offset: 2 },
    wonder: { categories: ["philosophical"], offset: 0 },
    focus: { categories: ["success", "attitude"], offset: 3 },
    connection: { categories: ["love", "friendship"], offset: 4 },
    hope: { categories: ["positive"], offset: 6 },
    time: { categories: ["time"], offset: 7 },
  }

  const initialMoodQuotes: Record<string, DynamicMoodQuote> = {}

  for (const [moodId, config] of Object.entries(moodCategoryMap)) {
    const eligibleQuotes = moodQuotesPool.filter(
      (q) =>
        q.categorySlug &&
        config.categories.includes(q.categorySlug) &&
        !usedQuoteIds.has(q.id)
    )

    if (eligibleQuotes.length > 0) {
      const quoteIndex = (dayIndex + config.offset) % eligibleQuotes.length
      const selectedQuote = eligibleQuotes[quoteIndex]
      if (selectedQuote) {
        usedQuoteIds.add(selectedQuote.id)
        initialMoodQuotes[moodId] = {
          id: selectedQuote.id,
          content: selectedQuote.content,
          author: selectedQuote.author?.name || selectedQuote.authorName || "Unknown Author",
          authorSlug: selectedQuote.author?.slug,
          source: selectedQuote.source?.title,
          year: formatSourceYearLabel(selectedQuote.source),
        }
      }
    }
  }

  // 4. Companion quotes pool for Hero (distinct from hero, daily, and mood quotes)
  const eligibleCompanionQuotes = companionQuotesPool.filter((q) => !usedQuoteIds.has(q.id))
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

  // 5. Trending quotes (distinct from hero, daily, mood, and companion quotes)
  const dedupedTrendingQuotes = trendingQuotes
    .filter((q) => !usedQuoteIds.has(q.id))
    .slice(0, 4)
  dedupedTrendingQuotes.forEach((q) => {
    if (q.id) usedQuoteIds.add(q.id)
  })

  // 6. Remaining latest quotes (distinct from all previous sections)
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10 space-y-6 sm:space-y-8">
        <HomeHero
          heroQuote={heroQuote}
          companionQuotes={companionQuotes}
        />

        <HomeMoodFilter initialMoodQuotes={initialMoodQuotes} />

        <HomeHighlights
          errorMessage={errorMessage}
        />

        {finalDailyQuote && (
          <HomeDailyQuote
            initialQuote={finalDailyQuote}
          />
        )}

        {spotlightAuthors.length > 0 && spotlightCategories.length > 0 && (
          <HomeTaxonomiesShowcase
            spotlightAuthors={spotlightAuthors}
            spotlightCategories={spotlightCategories}
          />
        )}

        <HomeReaderStudio />

        <HomeTrendingSection
          trendingQuotes={dedupedTrendingQuotes}
          topTags={topTags}
        />

        <HomeLatestQuotes quotes={remainingLatestQuotes} />
      </main>
    </PublicLayout>
  )
}

function loadHomePageData(todayStr: string) {
  return unstable_cache(
    async () => fetchHomePageDataInternal(todayStr),
    [`home-page-data-${todayStr}`],
    {
      tags: [HOME_PAGE_CACHE_TAG, HOME_TAXONOMIES_CACHE_TAG, "quotes"],
      revalidate: 3600,
    }
  )()
}

async function fetchHomePageDataInternal(todayStr: string) {
  try {
    const [year, month, day] = todayStr.split("-").map(Number)
    const dayIndex = Math.floor(Date.UTC(year, month - 1, day) / 86400000)

    let hash = 0
    for (let i = 0; i < todayStr.length; i++) {
      hash = (hash << 5) - hash + todayStr.charCodeAt(i)
      hash |= 0
    }
    const dailySeed = Math.abs(hash)

    // Parallel fetch of cached count and cached taxonomies + dynamic quote pools
    const totalPublishedQuotes = await getPublishedQuoteCount()
    const dailySkip = totalPublishedQuotes > 0 ? dailySeed % totalPublishedQuotes : 0

    const [
      taxonomies,
      dailyQuote,
      featuredQuotesPool,
      companionQuotesPool,
      moodQuotesPool,
      latestQuotes,
      trendingQuotes,
    ] = await Promise.all([
      getTaxonomiesData(),
      prisma.quote.findFirst({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: [{ id: "asc" }],
        skip: dailySkip,
        select: dailyQuoteSelect,
      }),
      prisma.quote.findMany({
        where: { status: "PUBLISHED", deletedAt: null, isFeatured: true },
        orderBy: [{ popularityScore: "desc" }, { views: "desc" }, { id: "asc" }],
        take: 2,
        select: quoteCardSelect,
      }),
      prisma.quote.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: [{ views: "desc" }, { publishedAt: "desc" }],
        take: 6,
        select: quoteCardSelect,
      }),
      prisma.quote.findMany({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          categorySlug: {
            in: [
              "philosophical",
              "failure",
              "sad",
              "success",
              "attitude",
              "love",
              "friendship",
              "positive",
              "time",
            ],
          },
        },
        orderBy: [{ popularityScore: "desc" }, { views: "desc" }, { id: "asc" }],
        take: 36,
        select: {
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
          categorySlug: true,
          source: {
            select: {
              title: true,
              year: true,
              yearLabel: true,
              yearApproximate: true,
            },
          },
        },
      }),
      prisma.quote.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: [{ publishedAt: "desc" }],
        take: 12,
        select: quoteCardSelect,
      }),
      prisma.quote.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: [{ trendingScore: "desc" }, { views: "desc" }],
        take: 6,
        select: {
          ...quoteCardSelect,
          trendingScore: true,
        },
      }),
    ])

    const featuredQuote =
      featuredQuotesPool.find((q) => q.id !== dailyQuote?.id) ??
      featuredQuotesPool[0] ??
      null

    return {
      dailyQuote,
      featuredQuote,
      companionQuotesPool,
      moodQuotesPool,
      dayIndex,
      latestQuotes,
      trendingQuotes,
      topTags: taxonomies.tags,
      spotlightAuthors: taxonomies.authors,
      spotlightCategories: taxonomies.categories,
      errorMessage: null,
    }
  } catch (error) {
    console.error("Failed to load homepage data", error)

    return {
      dailyQuote: null,
      featuredQuote: null,
      companionQuotesPool: [],
      moodQuotesPool: [],
      dayIndex: 0,
      latestQuotes: [],
      trendingQuotes: [],
      topTags: [],
      spotlightAuthors: [],
      spotlightCategories: [],
      errorMessage: "Some homepage data is temporarily unavailable. The page is still online, but content may be incomplete.",
    }
  }
}
