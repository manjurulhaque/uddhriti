import { notFound, redirect } from "next/navigation"
import { getAdmin } from "@/lib/auth/getAdmin"
import { formatDateTimeLocalInAppTimeZone } from "@/lib/datetime"
import { prisma } from "@/lib/prisma"
import { getQuoteEditorOptions } from "@/lib/quotes/editorOptions"
import { PageHeader } from "@/components/admin"
import QuoteEditorForm from "../QuoteEditorForm"

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const admin = await getAdmin()
  if (!admin) {
    redirect("/admin/login")
  }

  const { id } = await params

  const [quote, options] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      select: {
        id: true,
        content: true,
        meaning: true,
        historicalContext: true,
        modernRelevance: true,
        authorId: true,
        categoryId: true,
        sourceId: true,
        language: true,
        status: true,
        publishedAt: true,
        isFeatured: true,
        isVerified: true,
        attributionStatus: true,
        verificationNote: true,
        deletedAt: true,
        tags: {
          select: {
            tagId: true,
          },
        },
      },
    }),
    getQuoteEditorOptions(),
  ])

  if (!quote || quote.deletedAt) {
    notFound()
  }

  const { authors, categories, sources, tags } = options

  return (
    <div className="mx-auto max-w-6xl p-8 space-y-6">
      <PageHeader
        title="Edit Quote"
        description="Modify quote content, citations, taxonomies, and publication status."
        backHref="/admin/quotes"
        backLabel="Back to Quotes"
      />
      <QuoteEditorForm
        mode="edit"
        quoteId={quote.id}
        authors={authors}
        categories={categories}
        sources={sources}
        tags={tags}
        initialForm={{
          content: quote.content || "",
          meaning: quote.meaning || "",
          historicalContext: quote.historicalContext || "",
          modernRelevance: quote.modernRelevance || "",
          authorId: quote.authorId || "",
          categoryId: quote.categoryId || "",
          sourceId: quote.sourceId || "",
          sourceTitle: "",
          sourceType: "BOOK",
          language: quote.language || "en",
          status: quote.status || "DRAFT",
          tagIds: quote.tags.map((entry) => entry.tagId),
          publishedAt: quote.publishedAt ? formatDateTimeLocalInAppTimeZone(quote.publishedAt) : "",
          isFeatured: Boolean(quote.isFeatured),
          isVerified: Boolean(quote.isVerified),
          attributionStatus: quote.attributionStatus || "UNKNOWN",
          verificationNote: quote.verificationNote || "",
        }}
      />
    </div>
  )
}
