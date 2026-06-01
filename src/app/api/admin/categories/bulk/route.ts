import slugify from "slugify"
import { z } from "zod"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"

const itemSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  slug: z.string().trim().optional(),
  description: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
})

const payloadSchema = z.object({
  items: z.array(itemSchema).min(1).max(500),
})

function normalizeSlug(name: string, slug?: string) {
  const base = (slug || name).trim()
  return slugify(base, { lower: true, strict: true })
}

function uniqueSlug(baseSlug: string, usedSlugs: Set<string>) {
  const safeBase = baseSlug || "category"
  let candidate = safeBase
  let suffix = 2

  while (usedSlugs.has(candidate)) {
    candidate = `${safeBase}-${suffix}`
    suffix += 1
  }

  usedSlugs.add(candidate)
  return candidate
}

export async function POST(req: Request) {
  const admin = await getAdmin()
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = payloadSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.category.findMany({
    select: { slug: true },
  })
  const usedSlugs = new Set(existing.map((c) => c.slug))
  const errors: string[] = []

  const data = parsed.data.items
    .map((item, index) => {
      const baseSlug = normalizeSlug(item.name, item.slug)
      if (!baseSlug) {
        errors.push(`Row ${index + 1}: name/slug produced an empty slug.`)
        return null
      }

      return {
        name: item.name.trim(),
        slug: uniqueSlug(baseSlug, usedSlugs),
        description: item.description || null,
        metaTitle: item.metaTitle || null,
        metaDescription: item.metaDescription || null,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  if (data.length === 0) {
    return NextResponse.json(
      { error: "No valid category rows to create.", errors },
      { status: 400 }
    )
  }

  const result = await prisma.category.createMany({ data })

  return NextResponse.json({
    received: parsed.data.items.length,
    created: result.count,
    failed: errors.length,
    errors,
  })
}
