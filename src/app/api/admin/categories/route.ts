import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { mapPrismaRouteError } from "@/lib/api/route-helpers"
import { categorySchema } from "@/lib/validation/category"

// GET all categories
export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(categories)
}

// CREATE category
export async function POST(req: Request) {
  const { response } = await requireAdmin()
  if (response) return response

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
