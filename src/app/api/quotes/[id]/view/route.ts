import { NextResponse, after } from "next/server"
import { enforceIpRateLimitAsync } from "@/lib/api/rate-limit"
import { sanitizeSlug } from "@/lib/security/input"
import {
  resolveQuoteForView,
  recordBufferedView,
  scheduleViewFlush,
} from "@/lib/quotes/view-counter-buffer"

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
    const rateLimited = await enforceIpRateLimitAsync(request, "quoteView", rawIdentifier)
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

    // Fast lookup from resolution cache / Prisma
    const target = await resolveQuoteForView(rawIdentifier)
    if (!target) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      )
    }

    // Record view in memory buffer without database row lock contention
    const currentViews = recordBufferedView(target.id, target.views)

    // Schedule background batched flush after response is dispatched
    after(() => {
      scheduleViewFlush()
    })

    return NextResponse.json({
      success: true,
      views: currentViews,
    })
  } catch (error) {
    console.error("Failed to record quote view:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
