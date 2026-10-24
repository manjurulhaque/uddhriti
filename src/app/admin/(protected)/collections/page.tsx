import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { PageHeader, AdminEntityCard } from "@/components/admin"
import { Badge, EmptyState } from "@/components/ui"

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

      {collections.length === 0 ? (
        <EmptyState
          title="No collections found"
          description="Create your first curated collection or anthology of quotations."
          action={{
            label: "+ New Collection",
            href: "/admin/collections/new",
          }}
        />
      ) : (
        <div className="space-y-2.5">
          {collections.map((collection) => (
            <AdminEntityCard
              key={collection.id}
              href={`/admin/collections/${collection.id}`}
              title={collection.title}
              subtitle={collection.slug ? `/${collection.slug}` : undefined}
              badge={
                <Badge
                  variant={collection.visibility === "PUBLIC" ? "success" : "neutral"}
                  size="sm"
                  dot
                >
                  {collection.visibility}
                </Badge>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
