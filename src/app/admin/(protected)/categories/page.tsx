import Link from "next/link"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"

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
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/categories/bulk"
            className="bg-white border px-4 py-2 rounded"
          >
            Bulk Create
          </Link>
          <Link
            href="/admin/categories/new"
            className="bg-black text-white px-4 py-2 rounded"
          >
            + New Category
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500">Sort:</span>
        {Object.entries(sortLabels).map(([value, label]) => (
          <Link
            key={value}
            href={value === "newest" ? "/admin/categories" : `/admin/categories?sort=${value}`}
            className={`border px-3 py-1 rounded ${activeSort === value ? "bg-black text-white" : ""}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/admin/categories/${c.id}`}
            className="block rounded border p-4 hover:bg-gray-50"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-gray-500">
                Quotes: <span className="font-medium text-gray-900">{c.quoteCount}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
