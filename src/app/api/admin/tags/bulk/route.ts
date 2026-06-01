import slugify from "slugify"
import { z } from "zod"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { tagTypeOptions } from "@/lib/tags/catalog"

const tagTypeSchema = z.enum(tagTypeOptions)

const itemSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  slug: z.string().trim().optional(),
  type: tagTypeSchema.optional(),
  description: z.string().optional().nullable(),
})

const payloadSchema = z.object({
  items: z.array(itemSchema).min(1).max(500),
})

function normalizeTagName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function normalizeSlug(name: string, slug?: string) {
  const base = (slug || name).trim()
  return slugify(base, { lower: true, strict: true })
}

function uniqueSlug(baseSlug: string, usedSlugs: Set<string>) {
  const safeBase = baseSlug || "tag"
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

  const existing = await prisma.tag.findMany({
    select: { slug: true, name: true },
  })
  const usedSlugs = new Set(existing.map((t) => t.slug))
  const usedNames = new Set(existing.map((t) => normalizeTagName(t.name)))
  const errors: string[] = []
  const seenInPayload = new Set<string>()

  const data = parsed.data.items
    .map((item, index) => {
      const normalizedName = normalizeTagName(item.name)
      if (usedNames.has(normalizedName) || seenInPayload.has(normalizedName)) {
        errors.push(`Row ${index + 1}: tag "${item.name.trim()}" already exists.`)
        return null
      }

      const baseSlug = normalizeSlug(item.name, item.slug)
      if (!baseSlug) {
        errors.push(`Row ${index + 1}: name/slug produced an empty slug.`)
        return null
      }

      if (usedSlugs.has(baseSlug)) {
        errors.push(`Row ${index + 1}: tag slug "${baseSlug}" already exists.`)
        return null
      }

      usedNames.add(normalizedName)
      seenInPayload.add(normalizedName)

      return {
        name: item.name.trim(),
        slug: uniqueSlug(baseSlug, usedSlugs),
        type: item.type || "TOPIC",
        description: item.description || null,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  if (data.length === 0) {
    return NextResponse.json(
      { error: "No valid tag rows to create.", errors },
      { status: 400 }
    )
  }

  const result = await prisma.tag.createMany({ data })

  return NextResponse.json({
    received: parsed.data.items.length,
    created: result.count,
    failed: errors.length,
    errors,
  })
}
