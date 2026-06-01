import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { collectionSchema } from "@/lib/validation/collection"

export async function GET() {
  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const collections = await prisma.collection.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(collections)
}

export async function POST(req: Request) {
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
    const collection = await prisma.collection.create({
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        visibility: parsed.data.visibility,
      },
    })
    return NextResponse.json(collection, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Unable to create collection. Slug may already exist." },
      { status: 409 }
    )
  }
}
