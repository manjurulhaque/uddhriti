import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { TagsListManager } from "@/app/admin/(protected)/tags/TagsListManager"
import { PageHeader } from "@/components/admin"

export default async function TagsPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const tags = await prisma.tag.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
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
      <PageHeader
        title="Tags"
        description="Faceted taxonomies for mood, topic, movement, era, and form."
        secondaryAction={{
          label: "Bulk Create",
          href: "/admin/tags/bulk",
        }}
        primaryAction={{
          label: "+ New Tag",
          href: "/admin/tags/new",
        }}
      />

      <TagsListManager tags={tags} />
    </div>
  )
}
