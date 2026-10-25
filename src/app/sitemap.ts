import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site"
import { prisma } from "@/lib/prisma"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()

  const [authors, categories, tags, quotes] = await Promise.all([
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
    prisma.quote.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      select: { slug: true, updatedAt: true },
      take: 500,
      orderBy: { popularityScore: "desc" },
    }),
  ])

  const entries: MetadataRoute.Sitemap = [
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
    },
  ]

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
