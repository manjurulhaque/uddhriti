import { z } from "zod"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { revalidatePublicSurfaces } from "@/lib/revalidation"
import { sanitizeSpreadsheetCell } from "@/lib/security/csv"
import { faqSchema } from "@/lib/validation/faq"

const bulkItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
  pageType: z.string(),
  pageSlug: z.string(),
  position: z.number().int().optional(),
})

const payloadSchema = z.object({
  items: z.array(bulkItemSchema).min(1).max(1000),
})

export async function POST(req: Request) {
  const { admin, response } = await requireSuperAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "bulk")
  if (rateLimited) return rateLimited

  const json = await req.json().catch(() => null)
  const parsedPayload = payloadSchema.safeParse(json)
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsedPayload.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.fAQ.findMany({
    select: { question: true, pageType: true, pageSlug: true },
  })
  const existingKeys = new Set(
    existing.map(
      (faq) => `${faq.question.trim().toLowerCase()}|${faq.pageType}|${faq.pageSlug.trim().toLowerCase()}`
    )
  )

  const seenInPayload = new Set<string>()
  const errors: string[] = []
  let skipped = 0

  const data = parsedPayload.data.items
    .map((item, index) => {
      const rowNo = index + 1
      const normalized = {
        question: sanitizeSpreadsheetCell(item.question.trim()),
        answer: sanitizeSpreadsheetCell(item.answer.trim()),
        pageType: item.pageType.trim().toUpperCase(),
        pageSlug: item.pageSlug.trim(),
        position: item.position ?? 0,
      }

      const parsed = faqSchema.safeParse(normalized)
      if (!parsed.success) {
        errors.push(`Row ${rowNo}: validation failed.`)
        return null
      }

      const key = `${parsed.data.question.trim().toLowerCase()}|${parsed.data.pageType}|${parsed.data.pageSlug.trim().toLowerCase()}`
      if (seenInPayload.has(key) || existingKeys.has(key)) {
        skipped += 1
        return null
      }

      seenInPayload.add(key)
      existingKeys.add(key)

      return {
        question: parsed.data.question,
        answer: parsed.data.answer,
        pageType: parsed.data.pageType,
        pageSlug: parsed.data.pageSlug,
        position: parsed.data.position ?? 0,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  if (data.length === 0) {
    return NextResponse.json(
      { error: "No valid FAQ rows to create.", errors, skipped },
      { status: 400 }
    )
  }

  const result = await prisma.fAQ.createMany({ data })

  if (result.count > 0) {
    revalidatePublicSurfaces()
  }

  return NextResponse.json({
    received: parsedPayload.data.items.length,
    created: result.count,
    skipped,
    failed: errors.length,
    errors,
  })
}

