import { prisma } from "@/lib/prisma"
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
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bulk Upload Quotes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload JSON or CSV files, paste manual rows, or import from Wikiquote, Gutenberg, and Wikisource.
          </p>
        </div>
      </div>

      <BulkImportForm authors={authors} categories={categories} tags={tags} />
    </div>
  )
}
