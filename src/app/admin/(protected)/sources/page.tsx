import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { redirect } from "next/navigation"
import { SourcesListManager } from "./SourcesListManager"

export default async function SourcesPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const sources = await prisma.source.findMany({
    include: {
      author: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const normalizedSources = sources.map((source) => ({
    id: source.id,
    title: source.title,
    type: source.type,
    year: source.year,
    yearLabel: source.yearLabel,
    yearApproximate: source.yearApproximate,
    authorName: source.author?.name ?? null,
    quoteCount: source.quoteCount,
    createdAt: source.createdAt.toISOString(),
  }))

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Sources</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/sources/bulk"
            className="bg-white border px-4 py-2 rounded"
          >
            Bulk Import
          </Link>
          <Link
            href="/admin/sources/new"
            className="bg-black text-white px-4 py-2 rounded"
          >
            + New Source
          </Link>
        </div>
      </div>

      <SourcesListManager sources={normalizedSources} />
    </div>
  )
}
