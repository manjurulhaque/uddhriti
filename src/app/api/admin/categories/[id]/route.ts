import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { isValidUuid, mapPrismaRouteError } from "@/lib/api/route-helpers"
import { categorySchema } from "@/lib/validation/category"
import { revalidatePublicSurfaces, revalidateCategory } from "@/lib/revalidation"

type Context = {
  params: Promise<{ id: string }>
}

// GET single category
export async function GET(
  _req: Request,
  context: Context
) {
  const { id } = await context.params
  if (!isValidUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { response } = await requireAdmin()
  if (response) return response

  const category = await prisma.category.findUnique({
    where: { id },
  })

  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(category)
}

// UPDATE
export async function PATCH(
  req: Request,
  context: Context
) {
  const { id } = await context.params
  if (!isValidUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

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
    const previous = await prisma.category.findUnique({
      where: { id },
      select: { slug: true },
    })

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        metaTitle: parsed.data.metaTitle || null,
        metaDescription: parsed.data.metaDescription || null,
      },
    })

    revalidatePublicSurfaces()
    revalidateCategory(updated.slug, previous?.slug)

    return NextResponse.json(updated)
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

// DELETE
export async function DELETE(
  _req: Request,
  context: Context
) {
  const { id } = await context.params
  if (!isValidUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { response } = await requireAdmin()
  if (response) return response

  let deletedSlug: string | null = null
  try {
    const deleted = await prisma.category.delete({
      where: { id },
      select: { slug: true },
    })
    deletedSlug = deleted.slug
  } catch (error) {
    const response = mapPrismaRouteError(error, {
      foreignKey: "Category cannot be deleted while it is still referenced by other records.",
    })
    if (response) {
      return response
    }

    throw error
  }

  revalidatePublicSurfaces()
  if (deletedSlug) {
    revalidateCategory(deletedSlug)
  }

  return NextResponse.json({ success: true })
}
