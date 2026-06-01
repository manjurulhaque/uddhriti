import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import {
  createUniqueSourceSlug,
  importSourcesFromWikidataAuthor,
} from "@/lib/wikimedia/sourceImport"

export async function POST(req: Request) {
  const admin = await getAdmin()
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const authorId = typeof body?.authorId === "string" ? body.authorId : null
  const inputWikidataId = typeof body?.wikidataId === "string" ? body.wikidataId : null
  const inputWikipediaUrl = typeof body?.wikipediaUrl === "string" ? body.wikipediaUrl : null
  const limit =
    typeof body?.limit === "number" && Number.isFinite(body.limit) ? body.limit : 25

  let author:
    | {
        id: string
        wikidataId: string | null
        wikipediaUrl: string | null
      }
    | null = null

  if (authorId) {
    author = await prisma.author.findUnique({
      where: { id: authorId },
      select: { id: true, wikidataId: true, wikipediaUrl: true },
    })
    if (!author) {
      return NextResponse.json({ error: "Invalid authorId" }, { status: 400 })
    }
  }

  const wikidataId = inputWikidataId || author?.wikidataId || null
  const wikipediaUrl = inputWikipediaUrl || author?.wikipediaUrl || null

  let works: Awaited<ReturnType<typeof importSourcesFromWikidataAuthor>>
  try {
    works = await importSourcesFromWikidataAuthor({
      wikidataId,
      wikipediaUrl,
      limit,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auto import failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const existingSources = await prisma.source.findMany({
    select: { slug: true, title: true, authorId: true },
  })
  const usedSlugs = new Set(existingSources.map((s) => s.slug))
  const existingTitleAuthor = new Set(
    existingSources.map((s) => `${s.title.trim().toLowerCase()}|${s.authorId || ""}`)
  )

  const errors: string[] = []
  let created = 0
  let skipped = 0

  for (const work of works) {
    const titleKey = `${work.title.trim().toLowerCase()}|${authorId || ""}`
    if (existingTitleAuthor.has(titleKey)) {
      skipped += 1
      continue
    }

    const slug = createUniqueSourceSlug(work.title, usedSlugs)
    try {
      await prisma.source.create({
        data: {
          title: work.title,
          slug,
          type: work.type,
          year: work.year,
          yearApproximate: false,
          description: work.description,
          externalUrl: work.externalUrl,
          authorId: authorId || null,
        },
      })
      existingTitleAuthor.add(titleKey)
      created += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create source"
      errors.push(`${work.title}: ${message}`)
    }
  }

  return NextResponse.json({
    resolved: works.length,
    created,
    skipped,
    failed: errors.length,
    errors,
  })
}
