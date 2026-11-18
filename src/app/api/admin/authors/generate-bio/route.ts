import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { isValidUuid } from "@/lib/api/route-helpers"
import {
  generateAuthorBio,
  streamAuthorBio,
  type AuthorBioInput,
  type BioTone,
  type BioLength,
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
    existingBio,
    tone,
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
    length: (length === "concise" || length === "comprehensive" || length === "balanced") ? length as BioLength : "balanced",
  }

  // If authorId is given, enrich with database footprint (known works, sample quotes)
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
          select: { title: true },
        },
        quotes: {
          take: 5,
          where: { deletedAt: null, status: "PUBLISHED" },
          select: { content: true },
        },
      },
    })

    if (dbAuthor) {
      bioInput = {
        name: bioInput.name || dbAuthor.name,
        profession: bioInput.profession || dbAuthor.profession,
        nationality: bioInput.nationality || dbAuthor.nationality,
        birthYear: bioInput.birthYear ?? dbAuthor.birthYear,
        deathYear: bioInput.deathYear ?? dbAuthor.deathYear,
        existingBio: bioInput.existingBio || dbAuthor.bio,
        knownWorks: dbAuthor.sources.map((s) => s.title),
        sampleQuotes: dbAuthor.quotes.map((q) => q.content),
        tone: bioInput.tone,
        length: bioInput.length,
      }
    }
  }

  if (!bioInput.name) {
    return NextResponse.json({ error: "Author name is required to generate biography" }, { status: 400 })
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
