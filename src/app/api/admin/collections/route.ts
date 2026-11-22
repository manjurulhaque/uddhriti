import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { collectionSchema } from "@/lib/validation/collection"
import { revalidatePublicSurfaces } from "@/lib/revalidation"
import { recordAuditLog } from "@/lib/audit"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const collections = await prisma.collection.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(collections)
}

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  const parsed = collectionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const collection = await prisma.collection.create({
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        visibility: parsed.data.visibility,
      },
    })
    revalidatePublicSurfaces()

    await recordAuditLog({
      action: "CREATE",
      entityType: "COLLECTION",
      entityId: collection.id,
      entityName: collection.title,
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      details: { slug: collection.slug, visibility: collection.visibility },
      req,
    })

    return NextResponse.json(collection, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Unable to create collection. Slug may already exist." },
      { status: 409 }
    )
  }
}
