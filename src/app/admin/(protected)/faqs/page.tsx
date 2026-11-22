import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { PageHeader } from "@/components/admin"
import { FaqsListManager } from "./FaqsListManager"

export default async function FaqsPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const faqs = await prisma.fAQ.findMany({
    orderBy: [{ pageType: "asc" }, { pageSlug: "asc" }, { position: "asc" }, { id: "asc" }],
    select: {
      id: true,
      question: true,
      answer: true,
      pageType: true,
      pageSlug: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const normalizedFaqs = faqs.map((faq) => ({
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    pageType: faq.pageType,
    pageSlug: faq.pageSlug,
    position: faq.position,
    createdAt: faq.createdAt.toISOString(),
    updatedAt: faq.updatedAt.toISOString(),
  }))

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="FAQs"
        description="Frequently asked questions displayed across quotation surfaces."
        secondaryAction={{
          label: "Bulk Import",
          href: "/admin/faqs/bulk",
        }}
        primaryAction={{
          label: "+ New FAQ",
          href: "/admin/faqs/new",
        }}
      />

      <FaqsListManager faqs={normalizedFaqs} />
    </div>
  )
}
