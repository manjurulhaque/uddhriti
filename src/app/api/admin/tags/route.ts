import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { tagSchema } from "@/lib/validation/tag"
import { revalidatePublicSurfaces } from "@/lib/revalidation"

function normalizeTagName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

export async function GET(req: Request) {
  const { response } = await requireAdmin()
  if (response) return response

  const { searchParams } = new URL(req.url)
  const isMinimal = searchParams.get("select") === "minimal" || searchParams.get("fields") === "minimal"

  if (isMinimal) {
    const tags = await prisma.tag.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(tags)
  }

  const tags = await prisma.tag.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(tags)
}

export async function POST(req: Request) {
  const { response } = await requireAdmin()
  if (response) return response

  const body = await req.json()
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
    const tag = await prisma.tag.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        type: parsed.data.type,
        description: parsed.data.description || null,
      },
    })

    revalidatePublicSurfaces()

    return NextResponse.json(tag, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Unable to create tag. Slug may already exist." },
      { status: 409 }
    )
  }
}
