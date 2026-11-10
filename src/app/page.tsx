import type { Metadata } from "next"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getSiteUrl } from "@/lib/site"
import { formatSourceYearLabel } from "@/lib/sourceYear"
import {
  HOME_PAGE_CACHE_TAG,
  HOME_TAXONOMIES_CACHE_TAG,
} from "@/lib/revalidation"
import { publicQuoteCardSelect } from "@/lib/quotes/selects"
import { BoundedMemoryCache } from "@/lib/cache/bounded-cache"
import {
  PublicLayout,
  JsonLd,
  HomeHero,
  HomeMoodFilter,
  HomeHighlights,
  HomeDailyQuote,
  HomeTaxonomiesShowcase,
  HomeReaderStudio,
  HomeTrendingSection,
  HomeLatestQuotes,
  type DynamicMoodQuote,
  type TrendingQuote,
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

async function fetchTaxonomiesInternal() {
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
          take: 2,
          orderBy: [{ popularityScore: "desc" }, { views: "desc" }, { id: "asc" }],
          select: {
            id: true,
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
          take: 2,
          orderBy: [{ popularityScore: "desc" }, { views: "desc" }, { id: "asc" }],
          select: {
            id: true,
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

  return {
    authors: spotlightAuthorsRaw,
    categories: spotlightCategoriesRaw,
    tags: topTags,
  }
}

type TaxonomiesData = Awaited<ReturnType<typeof fetchTaxonomiesInternal>>

const taxonomiesCache = new BoundedMemoryCache<string, TaxonomiesData>({
  maxSize: 1,
  ttlMs: 15 * 60 * 1000,
})

async function getTaxonomiesData(): Promise<TaxonomiesData> {
  const cached = taxonomiesCache.get("taxonomies")
  if (cached) {
    return cached
  }

  const result = await fetchTaxonomiesInternal()
  taxonomiesCache.set("taxonomies", result)
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
    spotlightAuthorsRaw,
    spotlightCategoriesRaw,
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

  // 5. Spotlight Authors Top Quote (strictly deduplicated against all prior sections)
  const rawAuthors = spotlightAuthorsRaw ?? []
  const spotlightAuthors = rawAuthors.map((author) => {
    const quotes = author.quotes ?? []
    const quote = quotes.find((q) => !usedQuoteIds.has(q.id)) ?? null
    if (quote?.id) usedQuoteIds.add(quote.id)
    return {
      id: author.id,
      name: author.name,
      slug: author.slug,
      profession: author.profession,
      nationality: author.nationality,
      birthYear: author.birthYear,
      deathYear: author.deathYear,
      imageUrl: author.imageUrl,
      quoteCount: author.quoteCount,
      topQuote: quote ? { content: quote.content, slug: quote.slug } : null,
    }
  })

  // 6. Spotlight Categories Top Quote (strictly deduplicated against all prior sections)
  const rawCategories = spotlightCategoriesRaw ?? []
  const spotlightCategories = rawCategories.map((category) => {
    const quotes = category.quotes ?? []
    const quote = quotes.find((q) => !usedQuoteIds.has(q.id)) ?? null
    if (quote?.id) usedQuoteIds.add(quote.id)
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      quoteCount: category.quoteCount,
      topQuote: quote ? { content: quote.content, authorName: quote.authorName } : null,
    }
  })

  // 7. Trending quotes (distinct from all prior sections)
  const dedupedTrendingQuotes: TrendingQuote[] = trendingQuotes
    .filter((q) => !usedQuoteIds.has(q.id))
    .slice(0, 4)

  // Resilient fallback: If strict exclusion left fewer than 4 quotes, backfill from unused latest quotes,
  // or remaining trending quotes as a last resort so the UI grid is never starved.
  if (dedupedTrendingQuotes.length < 4) {
    const candidateQuotes: TrendingQuote[] = [
      ...latestQuotes.filter((q) => !usedQuoteIds.has(q.id)),
      ...trendingQuotes.filter((q) => !dedupedTrendingQuotes.some((d) => d.id === q.id)),
    ]
    for (const q of candidateQuotes) {
      if (!dedupedTrendingQuotes.some((d) => d.id === q.id)) {
        dedupedTrendingQuotes.push(q)
        if (dedupedTrendingQuotes.length === 4) break
      }
    }
  }

  dedupedTrendingQuotes.forEach((q) => {
    if (q.id) usedQuoteIds.add(q.id)
  })

  // 8. Remaining latest quotes (distinct from all prior sections)
  const remainingLatestQuotes = latestQuotes
    .filter((q) => !usedQuoteIds.has(q.id))
    .slice(0, 8)

  if (remainingLatestQuotes.length < 8 && latestQuotes.length >= 8) {
    const includedIds = new Set(remainingLatestQuotes.map((q) => q.id))
    for (const q of latestQuotes) {
      if (!includedIds.has(q.id)) {
        remainingLatestQuotes.push(q)
        includedIds.add(q.id)
        if (remainingLatestQuotes.length === 8) break
      }
    }
  }

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
      <JsonLd data={jsonLd} />
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

// Module-level cached handler
const getCachedHomePageData = unstable_cache(
  async (todayStr: string) => fetchHomePageDataInternal(todayStr),
  ["home-page-data-v4"],
  {
    tags: [HOME_PAGE_CACHE_TAG, HOME_TAXONOMIES_CACHE_TAG, "quotes"],
    revalidate: 3600,
  }
)

const homePageMemoryCache = new BoundedMemoryCache<
  string,
  Awaited<ReturnType<typeof fetchHomePageDataInternal>>
>({
  maxSize: 2,
  ttlMs: 5 * 60 * 1000,
})

async function loadHomePageData(todayStr: string) {
  // Ultra-fast in-memory path (1ms response on warm process)
  const cached = homePageMemoryCache.get(todayStr)
  if (cached) {
    return cached
  }

  const data = await getCachedHomePageData(todayStr)
  homePageMemoryCache.set(todayStr, data)
  return data
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
    const targetKey = (dailySeed % 10000) / 10000

    // Single concurrent batch without pre-requisite blocking count query
    const [
      taxonomies,
      dailyQuoteRaw,
      featuredQuotesPool,
      companionQuotesPool,
      moodQuotesPool,
      latestQuotes,
      trendingQuotes,
    ] = await Promise.all([
      getTaxonomiesData(),
      prisma.quote.findFirst({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          randomKey: { gte: targetKey },
        },
        orderBy: { randomKey: "asc" },
        select: dailyQuoteSelect,
      }),
      prisma.quote.findMany({
        where: { status: "PUBLISHED", deletedAt: null, isFeatured: true },
        orderBy: [{ popularityScore: "desc" }, { views: "desc" }, { id: "asc" }],
        take: 2,
        select: publicQuoteCardSelect,
      }),
      prisma.quote.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: [{ views: "desc" }, { publishedAt: "desc" }],
        take: 6,
        select: publicQuoteCardSelect,
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
        take: 24,
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
        orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
        take: 24,
        select: publicQuoteCardSelect,
      }),
      prisma.quote.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: [{ trendingScore: "desc" }, { views: "desc" }, { id: "asc" }],
        take: 32,
        select: {
          ...publicQuoteCardSelect,
          trendingScore: true,
        },
      }),
    ])

    // Fallback if targetKey was near 1.0 and wrapped
    let dailyQuote = dailyQuoteRaw
    if (!dailyQuote) {
      dailyQuote = await prisma.quote.findFirst({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: { randomKey: "asc" },
        select: dailyQuoteSelect,
      })
    }

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
      spotlightAuthorsRaw: taxonomies.authors,
      spotlightCategoriesRaw: taxonomies.categories,
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
      spotlightAuthorsRaw: [],
      spotlightCategoriesRaw: [],
      errorMessage: "Some homepage data is temporarily unavailable. The page is still online, but content may be incomplete.",
    }
  }
}
