import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { isValidUuid, mapPrismaRouteError } from "@/lib/api/route-helpers"
import { sourceSchema } from "@/lib/validation/source"
import { normalizeSourceYearInput, parseSourceYearInput } from "@/lib/sourceYear"
import { revalidatePublicSurfaces } from "@/lib/revalidation"
import { recordAuditLog } from "@/lib/audit"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"

function getSourceYearLabel(raw: { year?: unknown; yearLabel?: unknown } | null) {
  return normalizeSourceYearInput(raw?.yearLabel) ?? normalizeSourceYearInput(raw?.year)
}

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

  const source = await prisma.source.findUnique({
    where: { id },
  })

  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(source)
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

  const raw = await req.json().catch(() => null)
  const parsedYear = parseSourceYearInput(raw?.year, raw?.yearApproximate)
  if (parsedYear.invalid) {
    return NextResponse.json(
      { error: "Invalid year format. Use 1595 or c. 1595-1596." },
      { status: 400 }
    )
  }

  const parsed = sourceSchema.safeParse({
    ...raw,
    year: parsedYear.year,
    yearLabel: getSourceYearLabel(raw),
    yearApproximate: parsedYear.approximate,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  if (parsed.data.authorId) {
    const author = await prisma.author.findUnique({
      where: { id: parsed.data.authorId },
      select: { id: true },
    })
    if (!author) {
      return NextResponse.json(
        { error: "Invalid authorId" },
        { status: 400 }
      )
    }
  }

  try {
    const updated = await prisma.source.update({
      where: { id },
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        type: parsed.data.type,
        year: parsed.data.year ?? null,
        yearLabel: parsed.data.yearLabel ?? null,
        yearApproximate: parsed.data.yearApproximate ?? false,
        publisher: parsed.data.publisher || null,
        location: parsed.data.location || null,
        description: parsed.data.description || null,
        externalUrl: parsed.data.externalUrl || null,
        authorId: parsed.data.authorId || null,
      },
    })

    revalidatePublicSurfaces()

    await recordAuditLog({
      action: "UPDATE",
      entityType: "SOURCE",
      entityId: updated.id,
      entityName: updated.title,
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      details: { type: updated.type, authorId: updated.authorId },
      req,
    })

    return NextResponse.json(updated)
  } catch (error) {
    const response = mapPrismaRouteError(error, {
      unique: "A source with this slug already exists.",
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

  let deleted: { id: string; title: string } | null = null
  try {
    deleted = await prisma.source.delete({
      where: { id },
      select: { id: true, title: true },
    })
  } catch (error) {
    const response = mapPrismaRouteError(error, {
      foreignKey: "Source cannot be deleted while it is still referenced by other records.",
    })
    if (response) {
      return response
    }

    throw error
  }

  revalidatePublicSurfaces()

  await recordAuditLog({
    action: "DELETE",
    entityType: "SOURCE",
    entityId: id,
    entityName: deleted?.title,
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.name,
    req,
  })

  return NextResponse.json({ success: true })
}
