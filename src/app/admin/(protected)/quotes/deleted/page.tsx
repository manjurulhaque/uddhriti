import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { prisma } from "@/lib/prisma"
import { DeletedQuotesManager } from "../DeletedQuotesManager"
import { PageHeader } from "@/components/admin"

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
    orderBy: [{ deletedAt: "desc" }, { id: "asc" }],
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Deleted Quotes"
        description="Restore soft-deleted quotes or permanently remove them."
        backHref="/admin/quotes"
        backLabel="Back to Quotes"
      />


      <DeletedQuotesManager quotes={normalizedQuotes} />
    </div>
  )
}
