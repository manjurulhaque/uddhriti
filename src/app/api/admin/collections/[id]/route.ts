import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { mapPrismaRouteError } from "@/lib/api/route-helpers"
import { collectionSchema } from "@/lib/validation/collection"

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

  const collection = await prisma.collection.findUnique({
    where: { id },
  })

  if (!collection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(collection)
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
  const parsed = collectionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const updated = await prisma.collection.update({
      where: { id },
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        visibility: parsed.data.visibility,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    const response = mapPrismaRouteError(error, {
      unique: "A collection with this slug already exists.",
    })
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
    await prisma.collection.delete({
      where: { id },
    })
  } catch (error) {
    const response = mapPrismaRouteError(error, {
      foreignKey: "Collection cannot be deleted while it is still referenced by other records.",
    })
    if (response) {
      return response
    }

    throw error
  }

  return NextResponse.json({ success: true })
}
