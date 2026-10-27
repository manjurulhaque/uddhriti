import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function RandomQuotePage() {
  try {
    const count = await prisma.quote.count({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
    })

    if (count === 0) {
      redirect("/quotes")
    }

    const skip = Math.floor(Math.random() * count)
    const randomQuote = await prisma.quote.findFirst({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
      skip,
      select: {
        id: true,
        slug: true,
      },
    })

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
