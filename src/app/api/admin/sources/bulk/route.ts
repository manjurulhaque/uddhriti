import slugify from "slugify"
import { z } from "zod"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { sanitizeSpreadsheetCell } from "@/lib/security/csv"
import { getExistingSourceLookup } from "@/lib/wikimedia/sourceImport"
import { revalidatePublicSurfaces } from "@/lib/revalidation"
import { recordAuditLog } from "@/lib/audit"

const workTypeSchema = z.enum([
  "BOOK",
  "SPEECH",
  "ARTICLE",
  "INTERVIEW",
  "SCRIPTURE",
  "LETTER",
  "OTHER",
])

const itemSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z.string().trim().optional(),
  type: workTypeSchema.optional(),
  year: z.number().int().nullable().optional(),
  yearApproximate: z.boolean().optional(),
  publisher: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
  authorId: z.string().uuid().optional().nullable(),
})

const payloadSchema = z.object({
  items: z.array(itemSchema).min(1).max(500),
})

function normalizeSlug(title: string, slug?: string) {
  return slugify((slug || title).trim(), { lower: true, strict: true })
}

function uniqueSlug(baseSlug: string, usedSlugs: Set<string>) {
  const safeBase = baseSlug || "source"
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
  const { admin, response } = await requireSuperAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "bulk")
  if (rateLimited) return rateLimited

  const json = await req.json().catch(() => null)
  const parsed = payloadSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { usedSlugs, existingTitleAuthor } = await getExistingSourceLookup(parsed.data.items)

  const authorIds = Array.from(
    new Set(
      parsed.data.items
        .map((item) => item.authorId)
        .filter((id): id is string => Boolean(id))
    )
  )

  const authorSet = new Set<string>()
  if (authorIds.length > 0) {
    const authors = await prisma.author.findMany({
      where: { id: { in: authorIds } },
      select: { id: true },
    })
    for (const author of authors) {
      authorSet.add(author.id)
    }
  }

  const errors: string[] = []
  const seenInPayload = new Set<string>()
  let skipped = 0

  const data = parsed.data.items
    .map((item, index) => {
      if (item.authorId && !authorSet.has(item.authorId)) {
        errors.push(`Row ${index + 1}: invalid authorId.`)
        return null
      }

      const duplicateKey = `${item.title.trim().toLowerCase()}|${item.authorId || ""}`
      if (seenInPayload.has(duplicateKey) || existingTitleAuthor.has(duplicateKey)) {
        skipped += 1
        return null
      }
      seenInPayload.add(duplicateKey)
      existingTitleAuthor.add(duplicateKey)

      const baseSlug = normalizeSlug(item.title, item.slug)
      if (!baseSlug) {
        errors.push(`Row ${index + 1}: title/slug produced an empty slug.`)
        return null
      }

      return {
        title: sanitizeSpreadsheetCell(item.title.trim()),
        slug: uniqueSlug(baseSlug, usedSlugs),
        type: item.type || "BOOK",
        year: item.year ?? null,
        yearApproximate: item.yearApproximate ?? false,
        publisher: item.publisher ? sanitizeSpreadsheetCell(item.publisher.trim()) : null,
        location: item.location ? sanitizeSpreadsheetCell(item.location.trim()) : null,
        description: item.description ? sanitizeSpreadsheetCell(item.description.trim()) : null,
        externalUrl: item.externalUrl || null,
        authorId: item.authorId || null,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  if (data.length === 0) {
    return NextResponse.json(
      { error: "No valid source rows to create.", errors },
      { status: 400 }
    )
  }

  const result = await prisma.source.createMany({ data })

  if (result.count > 0) {
    revalidatePublicSurfaces()
  }

  await recordAuditLog({
    action: "IMPORT",
    entityType: "SOURCE",
    adminId: admin.id,
    adminEmail: admin.email,
    adminName: admin.name,
    details: {
      received: parsed.data.items.length,
      created: result.count,
      skipped,
      failed: errors.length,
    },
    req,
  })

  return NextResponse.json({
    received: parsed.data.items.length,
    created: result.count,
    skipped,
    failed: errors.length,
    errors,
  })
}
