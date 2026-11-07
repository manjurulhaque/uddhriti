import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { redirect } from "next/navigation"
import { SourcesListManager } from "./SourcesListManager"
import { PageHeader } from "@/components/admin"

export default async function SourcesPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const sources = await prisma.source.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      type: true,
      year: true,
      yearLabel: true,
      yearApproximate: true,
      quoteCount: true,
      createdAt: true,
      author: { select: { name: true } },
    },
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
      <PageHeader
        title="Sources"
        description="Books, speeches, letters, interviews, and scripture catalog."
        secondaryAction={{
          label: "Bulk Import",
          href: "/admin/sources/bulk",
        }}
        primaryAction={{
          label: "+ New Source",
          href: "/admin/sources/new",
        }}
      />


      <SourcesListManager sources={normalizedSources} />
    </div>
  )
}
