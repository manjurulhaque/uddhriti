import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { isValidUuid } from "@/lib/api/route-helpers"
import { slugify } from "@/lib/slug"
import { recordAuditLog } from "@/lib/audit"
import { revalidatePublicSurfaces } from "@/lib/revalidation"
import {
  findPrimarySource,
  sanitizeWorkType,
  type SourceRecord,
  type WorkType,
} from "@/lib/quotes/source-finder"

// In-memory cache for source lookups (60s TTL)
let cachedSources: { data: SourceRecord[]; timestamp: number } | null = null
const CACHE_TTL_MS = 60 * 1000

async function getSourcesForLookup(): Promise<SourceRecord[]> {
  const now = Date.now()
  if (cachedSources && now - cachedSources.timestamp < CACHE_TTL_MS) {
    return cachedSources.data
  }

  const sources = await prisma.source.findMany({
    orderBy: [{ quoteCount: "desc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      year: true,
      authorId: true,
      quoteCount: true,
    },
  })

  cachedSources = { data: sources, timestamp: now }
  return sources
}

async function generateUniqueSourceSlug(title: string): Promise<string> {
  const baseSlug = slugify(title) || "source"
  let candidate = baseSlug
  let counter = 2

  while (true) {
    const existing = await prisma.source.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
    candidate = `${baseSlug}-${counter}`
    counter += 1
  }
}

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
  }

  const {
    action,
    content,
    authorName,
    authorId,
    categoryName,
    quoteId,
    title,
    type,
    year,
    description,
  } = body as {
    action?: unknown
    content?: unknown
    authorName?: unknown
    authorId?: unknown
    categoryName?: unknown
    quoteId?: unknown
    title?: unknown
    type?: unknown
    year?: unknown
    description?: unknown
  }

  // Action: Create and link new primary source in DB
  if (action === "createAndLink") {
    const rawTitle = typeof title === "string" ? title.trim() : ""
    if (!rawTitle) {
      return NextResponse.json({ error: "Source title is required" }, { status: 400 })
    }

    const workType: WorkType = sanitizeWorkType(type)
    const validAuthorId =
      typeof authorId === "string" && isValidUuid(authorId.trim()) ? authorId.trim() : null

    if (validAuthorId) {
      const author = await prisma.author.findUnique({
        where: { id: validAuthorId },
        select: { id: true },
      })
      if (!author) {
        return NextResponse.json({ error: "Author not found" }, { status: 404 })
      }
    }

    const parsedYear =
      typeof year === "number" && Number.isInteger(year)
        ? year
        : typeof year === "string" && !isNaN(parseInt(year, 10))
        ? parseInt(year, 10)
        : null

    const slug = await generateUniqueSourceSlug(rawTitle)

    try {
      const newSource = await prisma.source.create({
        data: {
          title: rawTitle,
          slug,
          type: workType,
          year: parsedYear,
          yearLabel: parsedYear ? (parsedYear < 0 ? `${Math.abs(parsedYear)} BCE` : `${parsedYear}`) : null,
          authorId: validAuthorId,
          description: typeof description === "string" ? description.trim() : null,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          year: true,
          authorId: true,
          quoteCount: true,
        },
      })

      // Invalidate source cache
      cachedSources = null
      await recordAuditLog({
        adminId: admin.id,
        action: "CREATE",
        entityType: "SOURCE",
        entityId: newSource.id,
        entityName: newSource.title,
        details: {
          title: newSource.title,
          createdVia: "AI Primary Source Finder",
        },
      })
      revalidatePublicSurfaces()

      return NextResponse.json({
        success: true,
        source: newSource,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create source"
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  // Action: Discover and identify primary source
  let quoteContent = typeof content === "string" ? content.trim() : ""
  let quoteAuthorName = typeof authorName === "string" ? authorName.trim() : ""
  let quoteAuthorId =
    typeof authorId === "string" && isValidUuid(authorId.trim()) ? authorId.trim() : undefined

  if (!quoteContent && typeof quoteId === "string" && isValidUuid(quoteId.trim())) {
    const existingQuote = await prisma.quote.findUnique({
      where: { id: quoteId.trim() },
      select: {
        content: true,
        authorName: true,
        authorId: true,
        author: { select: { name: true } },
      },
    })
    if (existingQuote) {
      quoteContent = existingQuote.content
      quoteAuthorName = quoteAuthorName || existingQuote.author?.name || existingQuote.authorName || ""
      quoteAuthorId = quoteAuthorId || existingQuote.authorId || undefined
    }
  }

  if (!quoteContent) {
    return NextResponse.json(
      { error: "Content is required to find primary source" },
      { status: 400 }
    )
  }

  const dbSources = await getSourcesForLookup()
  const result = await findPrimarySource(
    {
      content: quoteContent,
      authorName: quoteAuthorName,
      authorId: quoteAuthorId,
      categoryName: typeof categoryName === "string" ? categoryName.trim() : undefined,
    },
    dbSources
  )

  return NextResponse.json({
    success: true,
    primarySource: result.primarySource,
    candidates: result.candidates,
    provider: result.provider,
  })
}
