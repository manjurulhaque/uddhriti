import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { invalidJsonBodyResponse, mapPrismaRouteError, parseJsonObjectBody } from "@/lib/api/route-helpers"

// ✅ GET ALL AUTHORS
export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const authors = await prisma.author.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(authors)
}

// ✅ CREATE AUTHOR
import { authorSchema } from "@/lib/validation/author"

function normalizeAuthorName(name: string) {
  return name.trim().toLowerCase()
}

export async function POST(req: Request) {
  const { response } = await requireAdmin()
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
        ? raw.slug
        : typeof raw.name === "string"
          ? raw.name.trim().toLowerCase().replace(/\s+/g, "-")
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
