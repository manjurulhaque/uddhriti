import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { PageHeader } from "@/components/admin"
import { CollectionsListManager } from "./CollectionsListManager"

export default async function CollectionsPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const collections = await prisma.collection.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      visibility: true,
      quoteCount: true,
      createdAt: true,
    },
  })

  const normalizedCollections = collections.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    description: c.description,
    visibility: c.visibility,
    quoteCount: c.quoteCount,
    createdAt: c.createdAt.toISOString(),
  }))

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Collections"
        description="Curated thematic anthologies and editorial selections."
        primaryAction={{
          label: "+ New Collection",
          href: "/admin/collections/new",
        }}
      />

      <CollectionsListManager collections={normalizedCollections} />
    </div>
  )
}
