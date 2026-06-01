import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"

export default async function FaqsPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin/login")

  const faqs = await prisma.fAQ.findMany({
    orderBy: [{ pageType: "asc" }, { pageSlug: "asc" }, { position: "asc" }],
  })

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">FAQs</h1>
        <div className="flex gap-2">
          <Link href="/admin/faqs/bulk" className="border px-4 py-2 rounded bg-white">
            Bulk Import
          </Link>
          <Link href="/admin/faqs/new" className="bg-black text-white px-4 py-2 rounded">
            + New FAQ
          </Link>
        </div>
      </div>

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
