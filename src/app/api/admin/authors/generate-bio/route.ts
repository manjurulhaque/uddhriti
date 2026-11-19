import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { isValidUuid } from "@/lib/api/route-helpers"
import { importAuthorFromWikipediaOrWikidata } from "@/lib/wikimedia/authorImport"
import {
  generateAuthorBio,
  streamAuthorBio,
  regenerateAuthorBioParagraph,
  type AuthorBioInput,
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
    authorId,
    name,
    profession,
    nationality,
    birthYear,
    deathYear,
    dateOfBirth,
    dateOfDeath,
    wikipediaUrl,
    wikidataId,
    existingBio,
    currentBio,
    paragraphIndex,
    instruction,
    tone,
    perspective,
    length,
    stream,
  } = body as Record<string, unknown>

  let bioInput: AuthorBioInput = {
    name: typeof name === "string" ? name.trim() : "",
    profession: typeof profession === "string" ? profession.trim() : undefined,
    nationality: typeof nationality === "string" ? nationality.trim() : undefined,
    birthYear:
      typeof birthYear === "number"
        ? birthYear
        : typeof birthYear === "string" && !isNaN(Number(birthYear))
        ? Number(birthYear)
        : undefined,
    deathYear:
      typeof deathYear === "number"
        ? deathYear
        : typeof deathYear === "string" && !isNaN(Number(deathYear))
        ? Number(deathYear)
        : undefined,
    dateOfBirth: typeof dateOfBirth === "string" ? dateOfBirth.trim() : undefined,
    dateOfDeath: typeof dateOfDeath === "string" ? dateOfDeath.trim() : undefined,
    existingBio: typeof existingBio === "string" ? existingBio.trim() : undefined,
    tone: (tone === "philosophical" || tone === "punchy" || tone === "humanized") ? tone as BioTone : "humanized",
    perspective: (perspective === "crucible" || perspective === "modern" || perspective === "paradox" || perspective === "literary") ? perspective as BioPerspective : "literary",
    length: (length === "concise" || length === "comprehensive" || length === "balanced") ? length as BioLength : "balanced",
  }

  // If authorId is given, enrich with database footprint (known works, top quotes, categories)
  if (typeof authorId === "string" && isValidUuid(authorId)) {
    const dbAuthor = await prisma.author.findUnique({
      where: { id: authorId },
      select: {
        name: true,
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
    })

    if (dbAuthor) {
      const primaryQuote = dbAuthor.quotes[0]
        ? {
            content: dbAuthor.quotes[0].content,
            slug: dbAuthor.quotes[0].slug,
            sourceTitle: dbAuthor.quotes[0].source?.title,
          }
        : undefined

      const linkedWorks = dbAuthor.sources
        .filter((s) => s.slug && s.title)
        .map((s) => ({ title: s.title, slug: s.slug }))

      const categoryMap = new Map<string, { name: string; slug: string }>()
      for (const q of dbAuthor.quotes) {
        if (q.category && !categoryMap.has(q.category.slug)) {
          categoryMap.set(q.category.slug, { name: q.category.name, slug: q.category.slug })
        }
      }
      const linkedCategories = Array.from(categoryMap.values()).slice(0, 3)

      bioInput = {
        name: bioInput.name || dbAuthor.name,
        profession: bioInput.profession || dbAuthor.profession,
        nationality: bioInput.nationality || dbAuthor.nationality,
        birthYear: bioInput.birthYear ?? dbAuthor.birthYear,
        deathYear: bioInput.deathYear ?? dbAuthor.deathYear,
        existingBio: bioInput.existingBio || dbAuthor.bio,
        knownWorks: dbAuthor.sources.map((s) => s.title),
        sampleQuotes: dbAuthor.quotes.map((q) => q.content),
        primaryQuote,
        linkedWorks,
        linkedCategories,
        tone: bioInput.tone,
        perspective: bioInput.perspective,
        length: bioInput.length,
      }
    }
  }

  // Cold-start authority grounding for new authors when Wikipedia/Wikidata credentials are provided
  const wikiUrl = typeof wikipediaUrl === "string" ? wikipediaUrl.trim() : undefined
  const wikiId = typeof wikidataId === "string" ? wikidataId.trim() : undefined
  if (!bioInput.primaryQuote && (wikiUrl || wikiId)) {
    try {
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500))
      const fetchPromise = importAuthorFromWikipediaOrWikidata({
        wikipediaUrl: wikiUrl,
        wikidataId: wikiId,
      })
      const imported = await Promise.race([fetchPromise, timeoutPromise])
      if (imported) {
        if (imported.bio) bioInput.authorityGroundingSummary = imported.bio
        if (!bioInput.profession && imported.profession) bioInput.profession = imported.profession
        if (!bioInput.nationality && imported.nationality) bioInput.nationality = imported.nationality
        if (bioInput.birthYear == null && imported.birthYear != null) bioInput.birthYear = imported.birthYear
        if (bioInput.deathYear == null && imported.deathYear != null) bioInput.deathYear = imported.deathYear
      }
    } catch {
      // Graceful fallback if Wikimedia fetch fails
    }
  }

  if (!bioInput.name) {
    return NextResponse.json({ error: "Author name is required to generate biography" }, { status: 400 })
  }

  // Handle single-paragraph interactive regeneration
  if (typeof paragraphIndex === "number" && Number.isInteger(paragraphIndex)) {
    const fullBio =
      typeof currentBio === "string" && currentBio.trim()
        ? currentBio.trim()
        : typeof existingBio === "string"
        ? existingBio.trim()
        : ""

    if (!fullBio) {
      return NextResponse.json(
        { error: "currentBio is required to regenerate a specific paragraph" },
        { status: 400 }
      )
    }

    const regenResult = await regenerateAuthorBioParagraph({
      authorName: bioInput.name,
      profession: bioInput.profession,
      paragraphIndex,
      currentBio: fullBio,
      instruction: typeof instruction === "string" ? instruction.trim() : undefined,
      tone: bioInput.tone,
      perspective: bioInput.perspective,
      primaryQuote: bioInput.primaryQuote,
      linkedWorks: bioInput.linkedWorks,
    })

    return NextResponse.json({
      success: true,
      ...regenResult,
    })
  }

  const wantsStream =
    stream === true ||
    req.headers.get("accept")?.includes("text/event-stream") ||
    new URL(req.url).searchParams.get("stream") === "true"

  if (wantsStream) {
    const sseStream = streamAuthorBio(bioInput, { signal: req.signal })
    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  }

  const result = await generateAuthorBio(bioInput)

  return NextResponse.json({
    success: true,
    ...result,
  })
}
