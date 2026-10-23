import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { PageHeader } from "@/components/admin"

export default async function FaqsPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const faqs = await prisma.fAQ.findMany({
    orderBy: [{ pageType: "asc" }, { pageSlug: "asc" }, { position: "asc" }],
  })

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


      <div className="space-y-2">
        {faqs.map((faq) => (
          <Link
            key={faq.id}
            href={`/admin/faqs/${faq.id}`}
            className="block border p-4 rounded bg-white hover:bg-gray-50"
          >
            <div className="font-medium">{faq.question}</div>
            <div className="text-sm text-gray-500">
              {faq.pageType} - {faq.pageSlug} - Position {faq.position}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
