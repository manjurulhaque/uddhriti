import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site"
import { prisma } from "@/lib/prisma"

export const QUOTES_PER_SITEMAP = 1000

export async function generateSitemaps() {
  try {
    const totalQuotes = await prisma.quote.count({
      where: { status: "PUBLISHED", deletedAt: null },
    })

    const numberOfSitemaps = Math.max(1, Math.ceil(totalQuotes / QUOTES_PER_SITEMAP))
    return Array.from({ length: numberOfSitemaps }, (_, index) => ({ id: index }))
  } catch (error) {
    console.error("Failed to count quotes for generateSitemaps:", error)
    return [{ id: 0 }]
  }
}

type SitemapProps = {
  id?: Promise<string | number> | string | number
}

export default async function sitemap(props?: SitemapProps): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()
  const rawId = props?.id ? await props.id : 0
  const sitemapId = Number(rawId) || 0

  const entries: MetadataRoute.Sitemap = []

  // Sitemap 0 contains core static routes and primary taxonomies
  if (sitemapId === 0) {
    entries.push(
      {
        url: base,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1,
      },
      {
        url: `${base}/quotes`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.9,
      },
      {
        url: `${base}/authors`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.9,
      },
      {
        url: `${base}/categories`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${base}/tags`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${base}/privacy`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.4,
      },
      {
        url: `${base}/terms`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.4,
      },
      {
        url: `${base}/copyright`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.4,
      },
      {
        url: `${base}/cookies`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.4,
      }
    )

    const [authors, categories, tags] = await Promise.all([
      prisma.author.findMany({
        where: { quoteCount: { gt: 0 } },
        select: { slug: true, updatedAt: true },
        orderBy: { quoteCount: "desc" },
      }),
      prisma.category.findMany({
        where: { quoteCount: { gt: 0 } },
        select: { slug: true, updatedAt: true },
        orderBy: { quoteCount: "desc" },
      }),
      prisma.tag.findMany({
        where: { quoteCount: { gt: 0 } },
        select: { slug: true },
        orderBy: { quoteCount: "desc" },
      }),
    ])

    for (const author of authors) {
      entries.push({
        url: `${base}/authors/${author.slug}`,
        lastModified: author.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      })
    }

    for (const category of categories) {
      entries.push({
        url: `${base}/categories/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      })
    }

    for (const tag of tags) {
      entries.push({
        url: `${base}/tags/${tag.slug}`,
        changeFrequency: "weekly",
        priority: 0.6,
      })
    }
  }

  // Fetch the quotes partition assigned to this sitemapId
  const quotes = await prisma.quote.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    select: { slug: true, updatedAt: true },
    skip: sitemapId * QUOTES_PER_SITEMAP,
    take: QUOTES_PER_SITEMAP,
    orderBy: [{ popularityScore: "desc" }, { id: "asc" }],
  })

  for (const quote of quotes) {
    if (quote.slug) {
      entries.push({
        url: `${base}/quotes/${quote.slug}`,
        lastModified: quote.updatedAt,
        changeFrequency: "monthly",
        priority: 0.7,
      })
    }
  }

  return entries
}
