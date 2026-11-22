import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSiteUrl } from "@/lib/site"

export const revalidate = 3600 // Cache and revalidate feed once per hour

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function wrapCdata(str: string): string {
  return `<![CDATA[${str.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`
}

export async function GET() {
  const siteUrl = getSiteUrl()
  const now = new Date()

  // Query top 50 recent published quotes with rich relational metadata
  const quotes = await prisma.quote.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
    },
    take: 50,
    orderBy: [
      { createdAt: "desc" },
    ],
    include: {
      author: {
        select: {
          name: true,
          slug: true,
          profession: true,
          nationality: true,
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
          type: true,
        },
      },
      tags: {
        select: {
          tag: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  })

  const itemsXml = quotes
    .map((quote) => {
      const authorName = quote.author?.name || quote.authorName || "Unknown Author"
      const quoteUrl = `${siteUrl}/quotes/${quote.slug || quote.id}`
      const pubDate = (quote.publishedAt || quote.createdAt).toUTCString()
      
      const snippet = quote.content.length > 90
        ? `${quote.content.slice(0, 90).trim()}...`
        : quote.content
      const title = `“${snippet}” — ${authorName}`

      const plainDescription = `“${quote.content}” — ${authorName}${
        quote.source ? ` (${quote.source.title}${quote.source.year ? `, ${quote.source.year}` : ""})` : ""
      }`

      const tagsList = quote.tags.map((t) => t.tag.name).join(", ")

      const htmlContent = `
<figure style="margin: 0 0 1.25rem 0; font-family: Georgia, Cambria, serif;">
  <blockquote style="font-size: 1.2rem; line-height: 1.6; color: #212529; margin: 0 0 0.85rem 0; font-style: italic;">
    “${escapeXml(quote.content)}”
  </blockquote>
  <figcaption style="font-size: 0.95rem; color: #495057; font-style: normal;">
    — <strong>${escapeXml(authorName)}</strong>${
        quote.author?.profession ? `, ${escapeXml(quote.author.profession)}` : ""
      }
    ${
      quote.source
        ? `<br/><small style="color: #6c757d;">Primary Source: <em>${escapeXml(
            quote.source.title
          )}</em>${quote.source.year ? ` (${quote.source.year})` : ""}</small>`
        : ""
    }
  </figcaption>
</figure>
<p style="margin: 0 0 0.75rem 0; font-size: 0.85rem; color: #6c757d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  Theme: <strong>${escapeXml(quote.category.name)}</strong>
  ${tagsList ? ` · Tags: ${escapeXml(tagsList)}` : ""}
</p>
<p style="margin: 1rem 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <a href="${quoteUrl}" style="color: #c76b3e; font-weight: 600; text-decoration: underline;">Read contemplation &amp; analysis on Quotzen &rarr;</a>
</p>
`.trim()

      return `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${quoteUrl}</link>
      <guid isPermaLink="true">${quoteUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${wrapCdata(authorName)}</dc:creator>
      <category>${escapeXml(quote.category.name)}</category>
      ${quote.tags
        .map((t) => `<category>${escapeXml(t.tag.name)}</category>`)
        .join("\n      ")}
      <description>${wrapCdata(plainDescription)}</description>
      <content:encoded>${wrapCdata(htmlContent)}</content:encoded>
    </item>`.trimEnd()
    })
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Quotzen — Timeless Quotes, Philosophy &amp; Literary Sanctuary</title>
    <link>${siteUrl}</link>
    <description>Curated timeless quotations from history&apos;s greatest philosophers, poets, and thinkers. Verified against primary texts, distraction-free, and inspiring.</description>
    <language>en-us</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${siteUrl}/icons/icon-512x512.png</url>
      <title>Quotzen — Timeless Quotes</title>
      <link>${siteUrl}</link>
      <width>512</width>
      <height>512</height>
    </image>
${itemsXml}
  </channel>
</rss>`.trim()

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}

