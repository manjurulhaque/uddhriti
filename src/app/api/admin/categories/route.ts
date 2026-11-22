import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { mapPrismaRouteError } from "@/lib/api/route-helpers"
import { categorySchema } from "@/lib/validation/category"
import { revalidatePublicSurfaces } from "@/lib/revalidation"
import { recordAuditLog } from "@/lib/audit"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"

// GET all categories (supports ?select=minimal)
export async function GET(req: Request) {
  const { response } = await requireAdmin()
  if (response) return response

  const { searchParams } = new URL(req.url)
  const isMinimal = searchParams.get("select") === "minimal" || searchParams.get("fields") === "minimal"

  if (isMinimal) {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(categories)
  }

  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(categories)
}

// CREATE category
export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const category = await prisma.category.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        metaTitle: parsed.data.metaTitle || null,
        metaDescription: parsed.data.metaDescription || null,
      },
    })

    revalidatePublicSurfaces()

    await recordAuditLog({
      action: "CREATE",
      entityType: "CATEGORY",
      entityId: category.id,
      entityName: category.name,
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      details: { slug: category.slug },
      req,
    })

    return NextResponse.json(category)
  } catch (error) {
    const response = mapPrismaRouteError(error, {
      unique: "A category with this slug already exists.",
    })
    if (response) {
      return response
    }

    throw error
  }
}
