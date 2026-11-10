import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site"
import { generateSitemaps } from "./sitemap"

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = getSiteUrl()
  const sitemaps = await generateSitemaps()
  const sitemapUrls = sitemaps.map((item) => `${base}/sitemap/${item.id}.xml`)

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/quotes/random"],
    },
    sitemap: sitemapUrls.length === 1 ? sitemapUrls[0] : sitemapUrls,
  }
}
