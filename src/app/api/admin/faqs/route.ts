import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { faqSchema } from "@/lib/validation/faq"

export async function GET() {
  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const faqs = await prisma.fAQ.findMany({
    orderBy: [{ pageType: "asc" }, { pageSlug: "asc" }, { position: "asc" }],
  })

  return NextResponse.json(faqs)
}

export async function POST(req: Request) {
  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

  return NextResponse.json(faq, { status: 201 })
}
