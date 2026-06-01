import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"

export default async function CollectionsPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const collections = await prisma.collection.findMany({
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Collections</h1>
        <Link
          href="/admin/collections/new"
          className="bg-black text-white px-4 py-2 rounded"
        >
          + New Collection
        </Link>
      </div>

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
