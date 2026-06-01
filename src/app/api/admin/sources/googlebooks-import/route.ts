import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { createUniqueSourceSlug } from "@/lib/wikimedia/sourceImport"
import { importSourcesFromGoogleBooks } from "@/lib/googlebooks/sourceImport"

export async function POST(req: Request) {
  const admin = await getAdmin()
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const authorId = typeof body?.authorId === "string" ? body.authorId : null
  const inputAuthorName = typeof body?.authorName === "string" ? body.authorName : null
  const query = typeof body?.query === "string" ? body.query : null
  const title = typeof body?.title === "string" ? body.title : null
  const isbn = typeof body?.isbn === "string" ? body.isbn : null
  const preview = body?.preview === true
  const limit = typeof body?.limit === "number" && Number.isFinite(body.limit) ? body.limit : 25

  let author:
    | {
        id: string
        name: string
      }
    | null = null

  if (authorId) {
    author = await prisma.author.findUnique({
      where: { id: authorId },
      select: { id: true, name: true },
    })
    if (!author) {
      return NextResponse.json({ error: "Invalid authorId" }, { status: 400 })
    }
  }

  const authorName = inputAuthorName || author?.name || null

  let works: Awaited<ReturnType<typeof importSourcesFromGoogleBooks>>
  try {
    works = await importSourcesFromGoogleBooks({
      query,
      authorName,
      title,
      isbn,
      limit,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Books import failed"
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
  const previewItems: Array<{
    title: string
    year: number | null
    publisher: string | null
    externalUrl: string
    duplicate: boolean
  }> = []

  for (const work of works) {
    const titleKey = `${work.title.trim().toLowerCase()}|${authorId || ""}`
    if (existingTitleAuthor.has(titleKey)) {
      skipped += 1
      if (preview) {
        previewItems.push({
          title: work.title,
          year: work.year,
          publisher: work.publisher,
          externalUrl: work.externalUrl,
          duplicate: true,
        })
      }
      continue
    }

    if (preview) {
      previewItems.push({
        title: work.title,
        year: work.year,
        publisher: work.publisher,
        externalUrl: work.externalUrl,
        duplicate: false,
      })
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
          publisher: work.publisher,
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
    preview,
    resolved: works.length,
    created,
    skipped,
    failed: errors.length,
    errors,
    items: preview ? previewItems : undefined,
  })
}

