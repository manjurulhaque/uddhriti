import Link from "next/link"
import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { prisma } from "@/lib/prisma"
import { DeletedQuotesManager } from "../DeletedQuotesManager"

export default async function DeletedQuotesPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const quotes = await prisma.quote.findMany({
    where: {
      deletedAt: {
        not: null,
      },
    },
    select: {
      id: true,
      content: true,
      status: true,
      deletedAt: true,
      authorName: true,
      author: { select: { name: true } },
      source: { select: { title: true } },
    },
    orderBy: { deletedAt: "desc" },
  })

  const normalizedQuotes = quotes
    .filter((quote) => quote.deletedAt)
    .map((quote) => ({
      id: quote.id,
      content: quote.content,
      status: quote.status,
      deletedAt: quote.deletedAt!.toISOString(),
      authorName: quote.author?.name ?? quote.authorName ?? null,
      sourceTitle: quote.source?.title ?? null,
    }))

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Deleted Quotes</h1>
          <p className="text-sm text-gray-500">Restore soft-deleted quotes or permanently remove them.</p>
        </div>
        <Link href="/admin/quotes" className="border border-gray-300 px-4 py-2 rounded">
          Back to Quotes
        </Link>
      </div>

      <DeletedQuotesManager quotes={normalizedQuotes} />
    </div>
  )
}
