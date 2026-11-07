import Link from "next/link"
import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { getQuoteEditorOptions } from "@/lib/quotes/editorOptions"
import  QuoteForm  from "./QuoteForm"

export default async function NewQuotePage() {
  const admin = await getAdmin()

  if (!admin) {
    redirect("/admin/login")
  }

  if (admin.role !== "SUPER_ADMIN") {
    redirect("/")
  }

  const { authors, categories, sources, tags } = await getQuoteEditorOptions()

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
