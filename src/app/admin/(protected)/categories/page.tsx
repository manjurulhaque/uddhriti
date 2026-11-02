import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { PageHeader } from "@/components/admin"
import { CategoriesListManager } from "./CategoriesListManager"

export default async function CategoriesPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      quoteCount: true,
      createdAt: true,
    },
  })

  const normalizedCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    quoteCount: c.quoteCount,
    createdAt: c.createdAt.toISOString(),
  }))

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Categories"
        description="Organize quotes into themes, subjects, and topics."
        secondaryAction={{
          label: "Bulk Create",
          href: "/admin/categories/bulk",
        }}
        primaryAction={{
          label: "+ New Category",
          href: "/admin/categories/new",
        }}
      />

      <CategoriesListManager categories={normalizedCategories} />
    </div>
  )
}
