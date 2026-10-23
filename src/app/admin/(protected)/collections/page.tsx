import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { PageHeader } from "@/components/admin"

export default async function CollectionsPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const collections = await prisma.collection.findMany({
    orderBy: { createdAt: "desc" },
  })

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


      <div className="space-y-2">
        {collections.map((collection) => (
          <Link
            key={collection.id}
            href={`/admin/collections/${collection.id}`}
            className="block border p-4 rounded bg-white hover:bg-gray-50"
          >
            <div className="font-semibold">{collection.title}</div>
            <div className="text-sm text-gray-500">
              {collection.visibility} - {collection.slug}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
