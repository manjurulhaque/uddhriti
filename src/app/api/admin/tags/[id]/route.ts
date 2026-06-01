import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { mapPrismaRouteError } from "@/lib/api/route-helpers"
import { tagSchema } from "@/lib/validation/tag"

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

  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
    const updated = await prisma.tag.update({
      where: { id },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        type: parsed.data.type,
        description: parsed.data.description || null,
      },
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
  _req: Request,
  context: Context
) {
  const { id } = await context.params

  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.tag.delete({
      where: { id },
    })
  } catch (error) {
    const response = mapPrismaRouteError(error, {
      foreignKey: "Tag cannot be deleted while it is still referenced by other records.",
    })
    if (response) {
      return response
    }

    throw error
  }

  return NextResponse.json({ success: true })
}
