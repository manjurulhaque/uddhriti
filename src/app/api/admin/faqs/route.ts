import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { faqSchema } from "@/lib/validation/faq"
import { revalidatePublicSurfaces } from "@/lib/revalidation"
import { recordAuditLog } from "@/lib/audit"

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const faqs = await prisma.fAQ.findMany({
    orderBy: [{ pageType: "asc" }, { pageSlug: "asc" }, { position: "asc" }],
  })

  return NextResponse.json(faqs)
}

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const body = await req.json().catch(() => null)
  const parsed = faqSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const faq = await prisma.fAQ.create({
    data: {
      question: parsed.data.question,
      answer: parsed.data.answer,
      pageType: parsed.data.pageType,
      pageSlug: parsed.data.pageSlug,
      position: parsed.data.position ?? 0,
    },
  })

  revalidatePublicSurfaces()

  await recordAuditLog({
    action: "CREATE",
    entityType: "FAQ",
    entityId: faq.id,
    entityName: faq.question,
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.name,
    details: { pageType: faq.pageType, pageSlug: faq.pageSlug, position: faq.position },
    req,
  })

  return NextResponse.json(faq, { status: 201 })
}
