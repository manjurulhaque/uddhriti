import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { mapPrismaRouteError } from "@/lib/api/route-helpers"
import { faqSchema } from "@/lib/validation/faq"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(
  _req: Request,
  context: Context
) {
  const { id } = await context.params

  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const faq = await prisma.fAQ.findUnique({
    where: { id },
  })

  if (!faq) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(faq)
}

export async function PATCH(
  req: Request,
  context: Context
) {
  const { id } = await context.params

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

  try {
    const updated = await prisma.fAQ.update({
      where: { id },
      data: {
        question: parsed.data.question,
        answer: parsed.data.answer,
        pageType: parsed.data.pageType,
        pageSlug: parsed.data.pageSlug,
        position: parsed.data.position ?? 0,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    const response = mapPrismaRouteError(error)
    if (response) {
      return response
    }

    throw error
  }
}

export async function DELETE(
  _req: Request,
  context: Context
) {
  const { id } = await context.params

  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.fAQ.delete({
      where: { id },
    })
  } catch (error) {
    const response = mapPrismaRouteError(error)
    if (response) {
      return response
    }

    throw error
  }

  return NextResponse.json({ success: true })
}
