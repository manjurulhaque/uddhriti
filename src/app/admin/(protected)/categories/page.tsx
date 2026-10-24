import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { PageHeader, SortTabs, AdminEntityCard, AdminEntityCountBadge } from "@/components/admin"
import { EmptyState } from "@/components/ui"

type CategorySort = "newest" | "oldest" | "name-asc" | "name-desc" | "quotes-desc" | "quotes-asc"

const sortLabels: Record<CategorySort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  "name-asc": "Name A-Z",
  "name-desc": "Name Z-A",
  "quotes-desc": "Most quotes",
  "quotes-asc": "Fewest quotes",
}

function getCategorySort(value: string | string[] | undefined): CategorySort {
  if (typeof value !== "string") return "newest"
  if (value === "oldest") return "oldest"
  if (value === "name-asc") return "name-asc"
  if (value === "name-desc") return "name-desc"
  if (value === "quotes-desc") return "quotes-desc"
  if (value === "quotes-asc") return "quotes-asc"
  return "newest"
}

function getOrderBy(sort: CategorySort): Prisma.CategoryOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }]
    case "name-asc":
      return [{ name: "asc" }]
    case "name-desc":
      return [{ name: "desc" }]
    case "quotes-desc":
      return [{ quoteCount: "desc" }, { name: "asc" }]
    case "quotes-asc":
      return [{ quoteCount: "asc" }, { name: "asc" }]
    case "newest":
    default:
      return [{ createdAt: "desc" }]
  }
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const resolvedSearchParams = (await searchParams) ?? {}
  const activeSort = getCategorySort(resolvedSearchParams.sort)

  const categories = await prisma.category.findMany({
    orderBy: getOrderBy(activeSort),
  })

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


      <SortTabs<CategorySort>
        activeValue={activeSort}
        items={Object.entries(sortLabels).map(([value, label]) => ({
          value: value as CategorySort,
          label,
          href: value === "newest" ? "/admin/categories" : `/admin/categories?sort=${value}`,
        }))}
      />

      {categories.length === 0 ? (
        <EmptyState
          title="No categories found"
          description="Create your first category to start organizing quotes into themes."
          action={{
            label: "+ New Category",
            href: "/admin/categories/new",
          }}
        />
      ) : (
        <div className="space-y-2.5">
          {categories.map((c) => (
            <AdminEntityCard
              key={c.id}
              href={`/admin/categories/${c.id}`}
              title={c.name}
              subtitle={c.slug ? `/${c.slug}` : undefined}
              badge={<AdminEntityCountBadge count={c.quoteCount} />}
            />
          ))}
        </div>
      )}
    </div>
  )
}
