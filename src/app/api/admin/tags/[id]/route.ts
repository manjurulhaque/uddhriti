import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { isValidUuid, mapPrismaRouteError } from "@/lib/api/route-helpers"
import { tagSchema } from "@/lib/validation/tag"
import { revalidatePublicSurfaces, revalidateTagPage } from "@/lib/revalidation"
import { recordAuditLog } from "@/lib/audit"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"

type Context = {
  params: Promise<{ id: string }>
}

function normalizeTagName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

export async function GET(
  _req: Request,
  context: Context
) {
  const { id } = await context.params
  if (!isValidUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { response } = await requireAdmin()
  if (response) return response

  const tag = await prisma.tag.findUnique({
    where: { id },
  })

  if (!tag) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(tag)
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
  const parsed = tagSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const normalizedName = normalizeTagName(parsed.data.name)
  const existing = await prisma.tag.findFirst({
    where: {
      NOT: { id },
      OR: [
        { slug: parsed.data.slug },
        { name: { equals: parsed.data.name, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, slug: true },
  })

  if (existing && (existing.slug === parsed.data.slug || normalizeTagName(existing.name) === normalizedName)) {
    return NextResponse.json(
      { error: "A tag with this name or slug already exists." },
      { status: 409 }
    )
  }

  try {
    const previous = await prisma.tag.findUnique({
      where: { id },
      select: { slug: true },
    })

    const updated = await prisma.tag.update({
      where: { id },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        type: parsed.data.type,
        description: parsed.data.description || null,
      },
    })

    revalidatePublicSurfaces()
    revalidateTagPage(updated.slug, previous?.slug)

    await recordAuditLog({
      action: "UPDATE",
      entityType: "TAG",
      entityId: updated.id,
      entityName: updated.name,
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      details: { slug: updated.slug, previousSlug: previous?.slug, type: updated.type },
      req,
    })

    return NextResponse.json(updated)
  } catch (error) {
    const response = mapPrismaRouteError(error, {
      unique: "A tag with this name or slug already exists.",
    })
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

  let deletedSlug: string | null = null
  let deletedName: string | null = null
  try {
    const deleted = await prisma.tag.delete({
      where: { id },
      select: { slug: true, name: true },
    })
    deletedSlug = deleted.slug
    deletedName = deleted.name
  } catch (error) {
    const response = mapPrismaRouteError(error, {
      foreignKey: "Tag cannot be deleted while it is still referenced by other records.",
    })
    if (response) {
      return response
    }

    throw error
  }

  revalidatePublicSurfaces()
  if (deletedSlug) {
    revalidateTagPage(deletedSlug)
  }

  await recordAuditLog({
    action: "DELETE",
    entityType: "TAG",
    entityId: id,
    entityName: deletedName,
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.name,
    req,
  })

  return NextResponse.json({ success: true })
}
