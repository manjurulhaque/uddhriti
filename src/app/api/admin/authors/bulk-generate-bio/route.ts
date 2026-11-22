import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { recordAuditLog } from "@/lib/audit"
import { revalidatePublicSurfaces, revalidateAuthor } from "@/lib/revalidation"
import {
  generateAuthorBio,
  type BioTone,
  type BioLength,
  type BioPerspective,
} from "@/lib/authors/bio-generator"

export async function POST(req: Request) {
  const { admin, response } = await requireAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "adminMutation")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const {
    authorIds,
    onlyMissing = false,
    tone = "humanized",
    perspective = "literary",
    length = "balanced",
    limit = 25,
  } = body as {
    authorIds?: string[]
    onlyMissing?: boolean
    tone?: BioTone
    perspective?: BioPerspective
    length?: BioLength
    limit?: number
  }

  const maxBatch = Math.min(Math.max(1, limit || 25), 50)

  let authorsToProcess: Array<{
    id: string
    name: string
    slug: string
    profession: string | null
    nationality: string | null
    birthYear: number | null
    deathYear: number | null
    bio: string | null
    sources: Array<{ id: string; title: string; slug: string }>
    quotes: Array<{
      id: string
      content: string
      slug: string
      source: { title: string } | null
      category: { name: string; slug: string } | null
    }>
  }> = []

  if (Array.isArray(authorIds) && authorIds.length > 0) {
    authorsToProcess = await prisma.author.findMany({
      where: {
        id: { in: authorIds.slice(0, maxBatch) },
        ...(onlyMissing ? { OR: [{ bio: null }, { bio: "" }] } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        profession: true,
        nationality: true,
        birthYear: true,
        deathYear: true,
        bio: true,
        sources: {
          take: 5,
          orderBy: [{ quoteCount: "desc" }, { id: "asc" }],
          select: { id: true, title: true, slug: true },
        },
        quotes: {
          take: 5,
          where: { deletedAt: null, status: "PUBLISHED" },
          orderBy: [{ popularityScore: "desc" }, { id: "asc" }],
          select: {
            id: true,
            content: true,
            slug: true,
            source: { select: { title: true } },
            category: { select: { name: true, slug: true } },
          },
        },
      },
      take: maxBatch,
    })
  } else if (onlyMissing) {
    authorsToProcess = await prisma.author.findMany({
      where: {
        OR: [{ bio: null }, { bio: "" }],
      },
      orderBy: [{ quoteCount: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        profession: true,
        nationality: true,
        birthYear: true,
        deathYear: true,
        bio: true,
        sources: {
          take: 5,
          orderBy: [{ quoteCount: "desc" }, { id: "asc" }],
          select: { id: true, title: true, slug: true },
        },
        quotes: {
          take: 5,
          where: { deletedAt: null, status: "PUBLISHED" },
          orderBy: [{ popularityScore: "desc" }, { id: "asc" }],
          select: {
            id: true,
            content: true,
            slug: true,
            source: { select: { title: true } },
            category: { select: { name: true, slug: true } },
          },
        },
      },
      take: maxBatch,
    })
  }

  if (authorsToProcess.length === 0) {
    return NextResponse.json({
      success: true,
      processed: 0,
      updatedAuthors: [],
      message: "No authors matched the criteria for bio generation.",
    })
  }

  const updatedAuthors: Array<{
    id: string
    name: string
    slug: string
    bio: string
    wordCount: number
    provider: string
  }> = []

  const errors: Array<{ id: string; name: string; error: string }> = []

  // Process sequentially to be gentle on Gemini quota
  for (const author of authorsToProcess) {
    try {
      const primaryQuote = author.quotes[0]
        ? {
            content: author.quotes[0].content,
            slug: author.quotes[0].slug,
            sourceTitle: author.quotes[0].source?.title,
          }
        : undefined

      const linkedWorks = author.sources
        .filter((s) => s.slug && s.title)
        .map((s) => ({ title: s.title, slug: s.slug }))

      const categoryMap = new Map<string, { name: string; slug: string }>()
      for (const q of author.quotes) {
        if (q.category && !categoryMap.has(q.category.slug)) {
          categoryMap.set(q.category.slug, { name: q.category.name, slug: q.category.slug })
        }
      }
      const linkedCategories = Array.from(categoryMap.values()).slice(0, 3)

      const result = await generateAuthorBio({
        name: author.name,
        profession: author.profession,
        nationality: author.nationality,
        birthYear: author.birthYear,
        deathYear: author.deathYear,
        existingBio: author.bio,
        knownWorks: author.sources.map((s) => s.title),
        sampleQuotes: author.quotes.map((q) => q.content),
        primaryQuote,
        linkedWorks,
        linkedCategories,
        tone,
        perspective,
        length,
      })

      if (result.bio && result.bio.trim().length > 30) {
        await prisma.author.update({
          where: { id: author.id },
          data: { bio: result.bio },
        })

        revalidateAuthor(author.slug)

        updatedAuthors.push({
          id: author.id,
          name: author.name,
          slug: author.slug,
          bio: result.bio,
          wordCount: result.wordCount,
          provider: result.provider,
        })
      }
    } catch (err: unknown) {
      errors.push({
        id: author.id,
        name: author.name,
        error: err instanceof Error ? err.message : "Generation failed",
      })
    }
  }

  if (updatedAuthors.length > 0) {
    revalidatePublicSurfaces()

    await recordAuditLog({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "UPDATE",
      entityType: "AUTHOR",
      entityId: "bulk-generate-bio",
      details: {
        processedCount: updatedAuthors.length,
        errorCount: errors.length,
        authorIds: updatedAuthors.map((a) => a.id),
      },
    })
  }

  return NextResponse.json({
    success: true,
    processed: updatedAuthors.length,
    updatedAuthors,
    errors: errors.length > 0 ? errors : undefined,
  })
}
