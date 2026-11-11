import { redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { getQuoteEditorOptions } from "@/lib/quotes/editorOptions"
import { PageHeader } from "@/components/admin"
import QuoteForm from "./QuoteForm"

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
    <div className="max-w-6xl mx-auto p-8 space-y-6">
      <PageHeader
        title="Create Quote"
        description="Add a single quote here, or switch to bulk upload for JSON, CSV, or source-page imports."
        backHref="/admin/quotes"
        backLabel="Back to Quotes"
        secondaryAction={{
          label: "Open Bulk Upload",
          href: "/admin/quotes/bulk",
        }}
      />
      <QuoteForm
        authors={authors}
        categories={categories}
        sources={sources}
        tags={tags}
      />
    </div>
  )
}

