import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import Link from "next/link"
import { TagsListManager } from "@/app/admin/(protected)/tags/TagsListManager"

export default async function TagsPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const tags = await prisma.tag.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      quoteCount: true,
    },
  })

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Tags</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/tags/bulk"
            className="bg-white border px-4 py-2 rounded"
          >
            Bulk Create
          </Link>
          <Link
            href="/admin/tags/new"
            className="bg-black text-white px-4 py-2 rounded"
          >
            + New Tag
          </Link>
        </div>
      </div>
      <TagsListManager tags={tags} />
    </div>
  )
}
