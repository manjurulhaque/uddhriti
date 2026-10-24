import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { PageHeader, AdminEntityCard } from "@/components/admin"
import { Badge, EmptyState } from "@/components/ui"

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

      {faqs.length === 0 ? (
        <EmptyState
          title="No FAQs found"
          description="Create frequently asked questions to display on entity pages."
          action={{
            label: "+ New FAQ",
            href: "/admin/faqs/new",
          }}
        />
      ) : (
        <div className="space-y-2.5">
          {faqs.map((faq) => (
            <AdminEntityCard
              key={faq.id}
              href={`/admin/faqs/${faq.id}`}
              title={faq.question}
              subtitle={`Target: /${faq.pageSlug}`}
              badge={
                <Badge variant="neutral" size="sm">
                  {faq.pageType} • Pos {faq.position}
                </Badge>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
