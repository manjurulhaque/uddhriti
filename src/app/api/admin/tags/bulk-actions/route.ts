import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { prisma } from "@/lib/prisma"
import { tagTypeOptions } from "@/lib/tags/catalog"

const payloadSchema = z.object({
  tagIds: z.array(z.string().uuid()).min(1).max(500),
  action: z.literal("setType"),
  type: z.enum(tagTypeOptions),
})

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "bulk")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  const parsed = payloadSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const result = await prisma.tag.updateMany({
    where: {
      id: { in: parsed.data.tagIds },
    },
    data: {
      type: parsed.data.type,
    },
  })

  return NextResponse.json({
    updated: result.count,
  })
}
