import { prisma } from "@/lib/prisma"
import { isValidUuid } from "@/lib/api/route-helpers"
import { BoundedMemoryCache } from "@/lib/cache/bounded-cache"

export interface QuoteViewTarget {
  id: string
  views: number
}

// Bounded in-memory resolution cache mapping slug/UUID to target quote
export const quoteResolutionCache = new BoundedMemoryCache<string, QuoteViewTarget>({
  maxSize: 500,
  ttlMs: 10 * 60 * 1000, // 10 minutes
})

// In-memory pending view increments: Map<quoteId, count>
export const pendingViewsBuffer = new Map<string, number>()

let flushTimer: NodeJS.Timeout | null = null
let isFlushing = false

/**
 * Resolves a raw slug or UUID to a verified published quote ID and base view count.
 * Leverages bounded memory caching to eliminate redundant database reads on viral quotes.
 */
export async function resolveQuoteForView(
  rawIdentifier: string
): Promise<QuoteViewTarget | null> {
  const cached = quoteResolutionCache.get(rawIdentifier)
  if (cached) {
    return cached
  }

  const isUuid = isValidUuid(rawIdentifier)

  const quote = await prisma.quote.findFirst({
    where: {
      OR: [{ slug: rawIdentifier }, ...(isUuid ? [{ id: rawIdentifier }] : [])],
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: {
      id: true,
      views: true,
    },
  })

  if (!quote) {
    return null
  }

  const target: QuoteViewTarget = {
    id: quote.id,
    views: quote.views,
  }

  quoteResolutionCache.set(rawIdentifier, target)
  return target
}

/**
 * Records an incoming view in the in-memory buffer and returns the estimated current view count.
 * O(1) in-memory operation, completely eliminating PostgreSQL row lock contention during traffic spikes.
 */
export function recordBufferedView(quoteId: string, baseViews: number): number {
  const currentPending = pendingViewsBuffer.get(quoteId) || 0
  const nextPending = currentPending + 1
  pendingViewsBuffer.set(quoteId, nextPending)

  // Update cached baseline so subsequent client lookups reflect real-time progress
  const cached = quoteResolutionCache.get(quoteId)
  if (cached) {
    cached.views = baseViews + nextPending
  }

  return baseViews + nextPending
}

/**
 * Atomically drains the in-memory view buffer and flushes batched increments to PostgreSQL.
 * Multiple views for the same quote are collapsed into a single atomic transaction.
 */
export async function flushPendingViews(): Promise<number> {
  if (isFlushing || pendingViewsBuffer.size === 0) {
    return 0
  }

  isFlushing = true
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }

  // Atomically snapshot and drain the buffer
  const batch = new Map(pendingViewsBuffer)
  pendingViewsBuffer.clear()

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  let totalFlushed = 0

  try {
    for (const [quoteId, count] of batch.entries()) {
      if (count <= 0) continue

      try {
        const [updatedQuote] = await prisma.$transaction([
          prisma.quote.update({
            where: { id: quoteId },
            data: {
              views: { increment: count },
              popularityScore: { increment: count },
              trendingViews24h: { increment: count },
              trendingScore: { increment: count },
            },
            select: {
              id: true,
              views: true,
            },
          }),
          prisma.quoteDailyStat.upsert({
            where: {
              quoteId_date: {
                quoteId,
                date: today,
              },
            },
            update: {
              views: { increment: count },
            },
            create: {
              quoteId,
              date: today,
              views: count,
            },
          }),
        ])

        // Keep the resolution cache synchronized with the latest database state
        const cached = quoteResolutionCache.get(quoteId)
        if (cached) {
          cached.views = updatedQuote.views
        }

        totalFlushed += count
      } catch (err) {
        console.error(`[ViewCounterBuffer] Failed to flush views for quote ${quoteId}:`, err)
        // In case of error, re-enqueue remaining items to avoid view loss
        const existing = pendingViewsBuffer.get(quoteId) || 0
        pendingViewsBuffer.set(quoteId, existing + count)
      }
    }
  } finally {
    isFlushing = false
  }

  return totalFlushed
}

/**
 * Schedules a debounced background flush or executes immediately if batch size threshold is reached.
 */
export function scheduleViewFlush(
  immediateThreshold = 25,
  debounceDelayMs = 3000
): void {
  // If accumulated views exceed batch threshold, flush immediately
  let totalPending = 0
  for (const count of pendingViewsBuffer.values()) {
    totalPending += count
  }

  if (totalPending >= immediateThreshold) {
    void flushPendingViews()
    return
  }

  // Otherwise, debounce flush timer
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null
      void flushPendingViews()
    }, debounceDelayMs)
  }
}

