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

    // IP-level rate limiting to prevent automated share inflation and DoS attacks
    const rateLimited = enforceIpRateLimit(request, "quoteShare", rawIdentifier)
    if (rateLimited) return rateLimited

    const isUuid = isValidUuid(rawIdentifier)

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

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const [updatedQuote] = await prisma.$transaction([
      prisma.quote.update({
        where: { id: quote.id },
        data: {
          shares: { increment: 1 },
          popularityScore: { increment: 3 },
          trendingShares24h: { increment: 1 },
          trendingScore: { increment: 2 },
        },
        select: {
          id: true,
          shares: true,
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
          shares: { increment: 1 },
        },
        create: {
          quoteId: quote.id,
          date: today,
          shares: 1,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      shares: updatedQuote.shares,
    })
  } catch (error) {
    console.error("Failed to record quote share:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
