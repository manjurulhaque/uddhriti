import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { enforceIpRateLimit } from "@/lib/api/rate-limit"
import { isValidUuid } from "@/lib/api/route-helpers"
import { sanitizeSlug } from "@/lib/security/input"

type Context = {
  params: Promise<{ id: string }>
}

export async function POST(
  request: Request,
  context: Context
) {
  try {
    const rawParam = (await context.params).id
    const rawIdentifier = sanitizeSlug(rawParam)
    if (!rawIdentifier) {
      return NextResponse.json(
        { error: "Quote identifier is required" },
        { status: 400 }
      )
    }

    // IP-level rate limiting to prevent automated view inflation and DoS attacks
    const rateLimited = enforceIpRateLimit(request, "quoteView", rawIdentifier)
    if (rateLimited) return rateLimited

    // Ignore automated crawlers, search bots, and unfurl scrapers from inflating metrics
    const userAgent = request.headers.get("user-agent") || ""
    const isBot = /bot|spider|crawl|slurp|facebookexternalhit|twitterbot|whatsapp|telegrambot|preview|embed/i.test(userAgent)
    if (isBot) {
      return NextResponse.json({
        success: true,
        ignored: true,
      })
    }

    const isUuid = isValidUuid(rawIdentifier)

    // Lookup published quote by UUID or slug
    const quote = await prisma.quote.findFirst({
      where: {
        OR: [{ slug: rawIdentifier }, ...(isUuid ? [{ id: rawIdentifier }] : [])],
        status: "PUBLISHED",
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      )
    }

    // Normalizing to UTC date at 00:00:00 for daily stat aggregations
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const [updatedQuote] = await prisma.$transaction([
      prisma.quote.update({
        where: { id: quote.id },
        data: {
          views: { increment: 1 },
          popularityScore: { increment: 1 },
          trendingViews24h: { increment: 1 },
          trendingScore: { increment: 1 },
        },
        select: {
          id: true,
          views: true,
        },
      }),
      prisma.quoteDailyStat.upsert({
        where: {
          quoteId_date: {
            quoteId: quote.id,
            date: today,
          },
        },
        update: {
          views: { increment: 1 },
        },
        create: {
          quoteId: quote.id,
          date: today,
          views: 1,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      views: updatedQuote.views,
    })
  } catch (error) {
    console.error("Failed to record quote view:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
