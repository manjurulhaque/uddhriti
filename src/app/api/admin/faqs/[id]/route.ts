import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { isValidUuid, mapPrismaRouteError } from "@/lib/api/route-helpers"
import { faqSchema } from "@/lib/validation/faq"
import { revalidatePublicSurfaces } from "@/lib/revalidation"
import { recordAuditLog } from "@/lib/audit"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(
  _req: Request,
  context: Context
) {
  const { id } = await context.params
  if (!isValidUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { response } = await requireAdmin()
  if (response) return response

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
  if (!isValidUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

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

    revalidatePublicSurfaces()

    await recordAuditLog({
      action: "UPDATE",
      entityType: "FAQ",
      entityId: updated.id,
      entityName: updated.question,
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      details: { pageType: updated.pageType, pageSlug: updated.pageSlug, position: updated.position },
      req,
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
  req: Request,
  context: Context
) {
  const { id } = await context.params
  if (!isValidUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  let deleted: { id: string; question: string } | null = null
  try {
    deleted = await prisma.fAQ.delete({
      where: { id },
      select: { id: true, question: true },
    })
  } catch (error) {
    const response = mapPrismaRouteError(error)
    if (response) {
      return response
    }

    throw error
  }

  revalidatePublicSurfaces()

  await recordAuditLog({
    action: "DELETE",
    entityType: "FAQ",
    entityId: id,
    entityName: deleted?.question,
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.name,
    req,
  })

  return NextResponse.json({ success: true })
}
