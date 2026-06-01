import Link from "next/link"
import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { prisma } from "@/lib/prisma"
import  QuoteForm  from "./QuoteForm"

export default async function NewQuotePage() {
  const admin = await getAdmin()

  if (!admin || admin.role !== "SUPER_ADMIN") {
    redirect("/admin/login")
  }

  const [authors, categories, sources, tags] = await Promise.all([
    prisma.author.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.source.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.tag.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true, description: true },
    }),
  ])

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create Quote</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add a single quote here, or switch to bulk upload for JSON, CSV, or source-page imports.
          </p>
        </div>
        <Link
          href="/admin/quotes/bulk"
          className="inline-flex items-center justify-center rounded border border-gray-300 px-4 py-2 text-sm"
        >
          Open Bulk Upload
        </Link>
      </div>
      <QuoteForm
        authors={authors}
        categories={categories}
        sources={sources}
        tags={tags}
      />
    </div>
  )
}
