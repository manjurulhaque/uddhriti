import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { invalidJsonBodyResponse, mapPrismaRouteError, parseJsonObjectBody } from "@/lib/api/route-helpers"
import { slugify } from "@/lib/slug"
import { revalidatePublicSurfaces } from "@/lib/revalidation"
import { recordAuditLog } from "@/lib/audit"

// ✅ GET ALL AUTHORS (supports ?select=minimal)
export async function GET(req: Request) {
  const { response } = await requireAdmin()
  if (response) return response

  const { searchParams } = new URL(req.url)
  const isMinimal = searchParams.get("select") === "minimal" || searchParams.get("fields") === "minimal"

  if (isMinimal) {
    const authors = await prisma.author.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    })
    return NextResponse.json(authors)
  }

  const authors = await prisma.author.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      profession: true,
      nationality: true,
      birthYear: true,
      deathYear: true,
      quoteCount: true,
      createdAt: true,
    },
  })

  return NextResponse.json(authors)
}

// ✅ CREATE AUTHOR
import { authorSchema } from "@/lib/validation/author"

function normalizeAuthorName(name: string) {
  return name.trim().toLowerCase()
}

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const raw = await parseJsonObjectBody(req)
  if (!raw) {
    return invalidJsonBodyResponse()
  }

  // Normalize empty strings → null
  const normalized = {
    ...raw,
    slug:
      typeof raw.slug === "string" && raw.slug.trim()
        ? slugify(raw.slug)
        : typeof raw.name === "string"
          ? slugify(raw.name)
          : undefined,
    birthYear: raw.birthYear ? Number(raw.birthYear) : null,
    deathYear: raw.deathYear ? Number(raw.deathYear) : null,
    bio: raw.bio || null,
    profession: raw.profession || null,
    nationality: raw.nationality || null,
    dateOfBirth: raw.dateOfBirth || null,
    dateOfDeath: raw.dateOfDeath || null,
    imageUrl: raw.imageUrl || null,
    wikipediaUrl: raw.wikipediaUrl || null,
    wikidataId: raw.wikidataId || null,
  }

  const parsed = authorSchema.safeParse(normalized)

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const normalizedName = normalizeAuthorName(parsed.data.name)
  const existing = await prisma.author.findFirst({
    where: {
      OR: [
        { slug: parsed.data.slug },
        { nameNormalized: normalizedName },
      ],
    },
    select: { id: true, name: true, slug: true },
  })

  if (existing) {
    return NextResponse.json(
      { error: "An author with this name or slug already exists." },
      { status: 409 }
    )
  }

  try {
    const author = await prisma.author.create({
      data: {
        ...parsed.data,
        nameNormalized: normalizedName,
      },
    })

    revalidatePublicSurfaces()

    await recordAuditLog({
      action: "CREATE",
      entityType: "AUTHOR",
      entityId: author.id,
      entityName: author.name,
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      details: { slug: author.slug },
      req,
    })

    return NextResponse.json(author, { status: 201 })
  } catch (error) {
    const response = mapPrismaRouteError(error, {
      unique: "An author with this name or slug already exists.",
    })
    if (response) {
      return response
    }

    throw error
  }
}
