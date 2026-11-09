import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getClientIp, rateLimit, RATE_LIMITS } from "@/lib/api/rate-limit"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function fetchRandomQuote(): Promise<{ id: string; slug: string | null } | null> {
  const targetKey = Math.random()

  // O(log N) indexed B-Tree seek using randomKey column
  let randomQuote = await prisma.quote.findFirst({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      randomKey: { gte: targetKey },
    },
    orderBy: { randomKey: "asc" },
    select: {
      id: true,
      slug: true,
    },
  })

  // If targetKey is near 1.0, wrap around to the smallest key
  if (!randomQuote) {
    randomQuote = await prisma.quote.findFirst({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        randomKey: { lt: targetKey },
      },
      orderBy: { randomKey: "asc" },
      select: {
        id: true,
        slug: true,
      },
    })
  }

  return randomQuote
}

export default async function RandomQuotePage() {
  const headerList = await headers()
  const ip = getClientIp(headerList)
  const rateLimitResult = rateLimit(`randomQuote:${ip}`, RATE_LIMITS.randomQuote)

  if (!rateLimitResult.ok) {
    return (
      <main className="min-h-screen bg-[#faf9f5] flex items-center justify-center p-6 text-stone-900">
        <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200/80 p-8 text-center shadow-lg">
          <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wider mb-4">
            Rate Limited
          </span>
          <h1 className="text-xl font-bold font-serif mb-2 text-stone-900">
            Exploring Reflections Too Quickly
          </h1>
          <p className="text-sm text-stone-600 mb-6 leading-relaxed">
            You are exploring random quotations too quickly. Please pause for {rateLimitResult.retryAfter} seconds before trying again.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/quotes"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 transition-colors"
            >
              Browse All Quotations
            </Link>
            <Link
              href="/quotes/random"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-stone-300 text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors"
            >
              Try Again
            </Link>
          </div>
        </div>
      </main>
    )
  }

  try {
    const randomQuote = await fetchRandomQuote()

    if (randomQuote) {
      redirect(`/quotes/${randomQuote.slug || randomQuote.id}`)
    }
  } catch (error) {
    // If redirect throws (NEXT_REDIRECT), allow it to propagate
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error
    }
    console.error("Failed to fetch random quote", error)
  }

  redirect("/quotes")
}
