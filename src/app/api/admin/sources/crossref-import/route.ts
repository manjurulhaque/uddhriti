import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/api/admin-auth"
import { enforceAdminRateLimit } from "@/lib/api/rate-limit"
import { createUniqueSourceSlug, getExistingSourceLookup } from "@/lib/wikimedia/sourceImport"
import { importSourcesFromCrossref } from "@/lib/crossref/sourceImport"
import { revalidatePublicSurfaces } from "@/lib/revalidation"
import { recordAuditLog } from "@/lib/audit"

export async function POST(req: Request) {
  const { admin, response } = await requireSuperAdmin()
  if (response) return response

  const rateLimited = enforceAdminRateLimit(admin.id, "import")
  if (rateLimited) return rateLimited

  const body = await req.json().catch(() => null)
  const authorId = typeof body?.authorId === "string" ? body.authorId : null
  const inputAuthorName = typeof body?.authorName === "string" ? body.authorName : null
  const query = typeof body?.query === "string" ? body.query : null
  const title = typeof body?.title === "string" ? body.title : null
  const doi = typeof body?.doi === "string" ? body.doi : null
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

  let works: Awaited<ReturnType<typeof importSourcesFromCrossref>>
  try {
    works = await importSourcesFromCrossref({
      query,
      authorName,
      title,
      doi,
      limit,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Crossref import failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { usedSlugs, existingTitleAuthor } = await getExistingSourceLookup(works, authorId)

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

  if (!preview && created > 0) {
    revalidatePublicSurfaces()
    await recordAuditLog({
      action: "IMPORT",
      entityType: "SOURCE",
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      details: {
        provider: "crossref",
        authorId,
        resolved: works.length,
        created,
        skipped,
        failed: errors.length,
      },
      req,
    })
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
