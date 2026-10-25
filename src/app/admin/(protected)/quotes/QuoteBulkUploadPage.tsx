import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/admin/page-header"
import BulkImportForm from "./import/BulkImportForm"

export async function QuoteBulkUploadPage() {
  const [authors, categories, tags] = await Promise.all([
    prisma.author.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ])

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8 space-y-6">
      <PageHeader
        title="Bulk Upload Quotes"
        description="Ingest structured JSON or CSV datasets, paste batch quotations, or harvest verified quotations from Wikiquote, Project Gutenberg, and Wikisource."
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/admin/quotes"
              className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-700 shadow-2xs hover:bg-stone-50 transition-all"
            >
              Back to Quotes
            </Link>
            <Link
              href="/admin/quotes/new"
              className="inline-flex items-center justify-center rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-xs hover:bg-black transition-all"
            >
              Create Single Quote
            </Link>
          </div>
        }
      />

      <BulkImportForm authors={authors} categories={categories} tags={tags} />
    </div>
  )
}
