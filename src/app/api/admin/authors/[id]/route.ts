import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { invalidJsonBodyResponse, mapPrismaRouteError, parseJsonObjectBody } from "@/lib/api/route-helpers"
import { authorSchema } from "@/lib/validation/author"

type Context = {
  params: Promise<{ id: string }>
}

function normalizeAuthorName(name: string) {
  return name.trim().toLowerCase()
}

function authorConflictMessage(existing: { name: string; slug: string }, next: { name: string; slug: string }) {
  const nameConflicts = normalizeAuthorName(existing.name) === normalizeAuthorName(next.name)
  const slugConflicts = existing.slug === next.slug

  if (nameConflicts && slugConflicts) {
    return `Another author already uses the name "${next.name}" and slug "${next.slug}".`
  }

  if (nameConflicts) {
    return `Another author already uses the name "${next.name}".`
  }

  return `Another author already uses the slug "${next.slug}".`
}

// ✅ GET
export async function GET(
  _req: Request,
  context: Context
) {
  const { id } = await context.params

  const { response } = await requireAdmin()
  if (response) return response

  const author = await prisma.author.findUnique({
    where: { id },
  })

  if (!author) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(author)
}

// ✅ PATCH
export async function PATCH(
  req: Request,
  context: Context
) {
  const { id } = await context.params

  const { response } = await requireAdmin()
  if (response) return response

  const raw = await parseJsonObjectBody(req)
  if (!raw) {
    return invalidJsonBodyResponse()
  }

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
      id: { not: id },
      OR: [
        { slug: parsed.data.slug },
        { nameNormalized: normalizedName },
      ],
    },
    select: { name: true, slug: true },
  })

  if (existing) {
    return NextResponse.json(
      { error: authorConflictMessage(existing, parsed.data) },
      { status: 409 }
    )
  }

  try {
    const updated = await prisma.author.update({
      where: { id },
      data: {
        ...parsed.data,
        nameNormalized: normalizedName,
      },
    })

    return NextResponse.json(updated)
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

// ✅ DELETE
export async function DELETE(
  _req: Request,
  context: Context
) {
  const { id } = await context.params

  const { response } = await requireAdmin()
  if (response) return response

  try {
    await prisma.author.delete({
      where: { id },
    })
  } catch (error) {
    const response = mapPrismaRouteError(error, {
      foreignKey: "Author cannot be deleted while it is still referenced by other records.",
    })
    if (response) {
      return response
    }

    throw error
  }

  return NextResponse.json({ success: true })
}
