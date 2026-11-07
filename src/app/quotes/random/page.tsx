import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function RandomQuotePage() {
  try {
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
