import slugify from "slugify"
import { z } from "zod"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdmin } from "@/lib/auth/getAdmin"
import { authorSchema } from "@/lib/validation/author"
import {
  importAuthorFromWikipediaOrWikidata,
  importAuthorSeedsFromCategory,
  importAuthorFromWikiquote,
  importAuthorSeedsFromWikiquoteUrl,
} from "@/lib/wikimedia/authorImport"

const itemSchema = z.object({
  name: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  bio: z.string().optional().nullable(),
  birthYear: z.number().int().optional().nullable(),
  deathYear: z.number().int().optional().nullable(),
  dateOfBirth: z.union([z.string().trim(), z.date()]).optional().nullable(),
  dateOfDeath: z.union([z.string().trim(), z.date()]).optional().nullable(),
  profession: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  wikipediaUrl: z.string().trim().optional(),
  wikidataId: z.string().trim().optional(),
  wikiquoteUrl: z.string().trim().optional(),
  wikipediaCategoryUrl: z.string().trim().optional(),
  wikiquoteCategoryUrl: z.string().trim().optional(),
  wikidataCategoryId: z.string().trim().optional(),
  categoryLimit: z.number().int().min(1).max(500).optional(),
})

const payloadSchema = z.object({
  items: z.array(itemSchema).max(1000).optional(),
  wikiquoteUrls: z.array(z.string().trim()).max(1000).optional(),
  wikipediaCategoryUrl: z.string().trim().optional(),
  wikiquoteCategoryUrl: z.string().trim().optional(),
  wikidataCategoryId: z.string().trim().optional(),
  categoryLimit: z.number().int().min(1).max(500).optional(),
})

function uniqueSlug(baseSlug: string, usedSlugs: Set<string>) {
  const safeBase = baseSlug || "author"
  let candidate = safeBase
  let suffix = 2

  while (usedSlugs.has(candidate)) {
    candidate = `${safeBase}-${suffix}`
    suffix += 1
  }

  usedSlugs.add(candidate)
  return candidate
}

function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

function hasManualAuthorFields(item: z.infer<typeof itemSchema>) {
  return Boolean(
    item.name ||
      item.slug ||
      item.bio ||
      item.birthYear != null ||
      item.deathYear != null ||
      item.dateOfBirth ||
      item.dateOfDeath ||
      item.profession ||
      item.nationality ||
      item.imageUrl
  )
}

function normalizeImportedForSchema(
  data: Awaited<ReturnType<typeof importAuthorFromWikipediaOrWikidata>> | Awaited<ReturnType<typeof importAuthorFromWikiquote>>
) {
  return {
    name: data.name,
    slug: slugify(data.name, { lower: true, strict: true }),
    bio: data.bio || null,
    birthYear: data.birthYear,
    deathYear: data.deathYear,
    dateOfBirth: data.dateOfBirth || null,
    dateOfDeath: data.dateOfDeath || null,
    profession: data.profession || null,
    nationality: data.nationality || null,
    imageUrl: data.imageUrl || null,
    wikipediaUrl: data.wikipediaUrl || null,
    wikidataId: data.wikidataId || null,
  }
}

function normalizeManualForSchema(item: z.infer<typeof itemSchema>) {
  const name = item.name?.trim() || ""

  return {
    name,
    slug: slugify((item.slug || name).trim(), { lower: true, strict: true }),
    bio: item.bio || null,
    birthYear: item.birthYear ?? null,
    deathYear: item.deathYear ?? null,
    dateOfBirth: item.dateOfBirth || null,
    dateOfDeath: item.dateOfDeath || null,
    profession: item.profession || null,
    nationality: item.nationality || null,
    imageUrl: item.imageUrl || null,
    wikipediaUrl: item.wikipediaUrl || null,
    wikidataId: item.wikidataId || null,
  }
}

export async function POST(req: Request) {
  const admin = await getAdmin()
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = payloadSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data

  if (
    (!data.items || data.items.length === 0) &&
    (!data.wikiquoteUrls || data.wikiquoteUrls.length === 0) &&
    !data.wikipediaCategoryUrl &&
    !data.wikiquoteCategoryUrl &&
    !data.wikidataCategoryId
  ) {
    return NextResponse.json(
      { error: "Provide items, wikiquoteUrls, or a category source (wikipediaCategoryUrl/wikiquoteCategoryUrl/wikidataCategoryId)." },
      { status: 400 }
    )
  }

  const existingAuthors = await prisma.author.findMany({
      select: { slug: true, nameNormalized: true, wikipediaUrl: true, wikidataId: true },
  })
  const usedSlugs = new Set(existingAuthors.map((a) => a.slug))
  const usedNames = new Set(existingAuthors.map((a) => a.nameNormalized))
  const usedWikiUrls = new Set(existingAuthors.map((a) => a.wikipediaUrl).filter(Boolean))
  const usedWikidataIds = new Set(existingAuthors.map((a) => a.wikidataId).filter(Boolean))

  const errors: string[] = []
  let created = 0
  const queue: Array<
    | {
        kind: "import"
        wikipediaUrl?: string
        wikidataId?: string
        wikiquoteUrl?: string
        rowLabel: string
      }
    | {
        kind: "manual"
        item: z.infer<typeof itemSchema>
        rowLabel: string
      }
  > = []

  async function addWikiquoteSeed(wikiquoteUrl: string, rowLabel: string, limit?: number) {
    const seeds = await importAuthorSeedsFromWikiquoteUrl({
      wikiquoteUrl,
      limit: limit ?? data.categoryLimit ?? 100,
    })

    for (const seed of seeds) {
      queue.push({ kind: "import", ...seed, rowLabel })
    }
  }

  if (data.wikipediaCategoryUrl || data.wikiquoteCategoryUrl || data.wikidataCategoryId) {
    try {
      const seeds = await importAuthorSeedsFromCategory({
        wikipediaCategoryUrl: data.wikipediaCategoryUrl,
        wikiquoteCategoryUrl: data.wikiquoteCategoryUrl,
        wikidataCategoryId: data.wikidataCategoryId,
        limit: data.categoryLimit ?? 100,
      })
      for (const seed of seeds) {
        queue.push({ kind: "import", ...seed, rowLabel: "Category seed" })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Category import failed"
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  for (const entry of data.wikiquoteUrls || []) {
    const wikiquoteUrl = entry.trim()
    if (!wikiquoteUrl) continue
    try {
      await addWikiquoteSeed(wikiquoteUrl, "Wikiquote list item")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wikiquote import seed failed"
      errors.push(`Wikiquote list item: ${message}`)
    }
  }

  const items = data.items || []
  for (let i = 0; i < items.length; i += 1) {
    const row = items[i]
    const rowNo = i + 1

    if (row.wikipediaCategoryUrl || row.wikiquoteCategoryUrl || row.wikidataCategoryId) {
      try {
        const seeds = await importAuthorSeedsFromCategory({
          wikipediaCategoryUrl: row.wikipediaCategoryUrl,
          wikiquoteCategoryUrl: row.wikiquoteCategoryUrl,
          wikidataCategoryId: row.wikidataCategoryId,
          limit: row.categoryLimit ?? data.categoryLimit ?? 100,
        })
        for (const seed of seeds) {
          queue.push({ kind: "import", ...seed, rowLabel: `Row ${rowNo} category seed` })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Category import failed"
        errors.push(`Row ${rowNo}: ${message}`)
      }
      continue
    }

    if (hasManualAuthorFields(row)) {
      queue.push({
        kind: "manual",
        item: row,
        rowLabel: `Row ${rowNo}`,
      })
      continue
    }

    if (row.wikiquoteUrl) {
      try {
        await addWikiquoteSeed(row.wikiquoteUrl, `Row ${rowNo}`, row.categoryLimit)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Wikiquote import seed failed"
        errors.push(`Row ${rowNo}: ${message}`)
      }
      continue
    }

    queue.push({
      kind: "import",
      wikipediaUrl: row.wikipediaUrl,
      wikidataId: row.wikidataId,
      rowLabel: `Row ${rowNo}`,
    })
  }

  const seen = new Set<string>()
  const dedupedQueue = queue.filter((entry) => {
    const key =
      entry.kind === "manual"
        ? `manual|${normalizeName(entry.item.name || "")}|${entry.item.wikipediaUrl || ""}|${entry.item.wikidataId || ""}|${entry.item.wikiquoteUrl || ""}`
        : `import|${entry.wikipediaUrl || ""}|${entry.wikidataId || ""}|${entry.wikiquoteUrl || ""}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (dedupedQueue.length > 1000) {
    return NextResponse.json(
      { error: "Too many authors resolved. Limit to 1000 per request." },
      { status: 400 }
    )
  }

  for (let i = 0; i < dedupedQueue.length; i += 1) {
    const row = dedupedQueue[i]
    const rowLabel = row.rowLabel || `Item ${i + 1}`

    try {
      const normalized =
        row.kind === "manual"
          ? normalizeManualForSchema(row.item)
          : normalizeImportedForSchema(
              row.wikiquoteUrl
                ? await importAuthorFromWikiquote({
                    wikiquoteUrl: row.wikiquoteUrl,
                  })
                : await importAuthorFromWikipediaOrWikidata({
                    wikipediaUrl: row.wikipediaUrl,
                    wikidataId: row.wikidataId,
                  })
            )

      if (!normalized.name.trim()) {
        errors.push(`${rowLabel}: missing author name.`)
        continue
      }

      if (normalized.wikipediaUrl && usedWikiUrls.has(normalized.wikipediaUrl)) {
        errors.push(`${rowLabel}: author with this Wikipedia URL already exists.`)
        continue
      }
      if (normalized.wikidataId && usedWikidataIds.has(normalized.wikidataId)) {
        errors.push(`${rowLabel}: author with this Wikidata ID already exists.`)
        continue
      }

      const validated = authorSchema.safeParse(normalized)
      if (!validated.success) {
        errors.push(`${rowLabel}: validation failed.`)
        continue
      }

      const nameNormalized = normalizeName(validated.data.name)
      if (usedNames.has(nameNormalized)) {
        errors.push(`${rowLabel}: author "${validated.data.name}" already exists.`)
        continue
      }

      const slug = uniqueSlug(validated.data.slug, usedSlugs)

      await prisma.author.create({
        data: {
          ...validated.data,
          slug,
          nameNormalized,
        },
      })

      usedNames.add(nameNormalized)
      if (validated.data.wikipediaUrl) usedWikiUrls.add(validated.data.wikipediaUrl)
      if (validated.data.wikidataId) usedWikidataIds.add(validated.data.wikidataId)
      created += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed"
      errors.push(`${rowLabel}: ${message}`)
    }
  }

  return NextResponse.json({
    received: dedupedQueue.length,
    created,
    failed: errors.length,
    errors,
  })
}
