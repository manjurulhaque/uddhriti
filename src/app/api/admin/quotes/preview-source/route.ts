import { NextResponse } from "next/server"
import { getAdmin } from "@/lib/auth/getAdmin"
import { importQuotesFromWikiquoteUrl } from "@/lib/wikimedia/wikiquoteImport"
import { importQuotesFromWikisourceUrl } from "@/lib/wikimedia/wikisourceImport"
import { importQuotesFromGutenbergUrl } from "@/lib/import/gutenbergImport"

type PreviewRequest = {
  wikiquoteUrls?: string[]
  gutenbergUrls?: string[]
  wikisourceUrls?: string[]
  maxQuotesPerPage?: number
  verifiedOnly?: boolean
}

type PreviewItem = {
  sourceType: "WIKIQUOTE" | "GUTENBERG" | "WIKISOURCE"
  sourceUrl: string
  sourceTitle: string
  authorName: string | null
  language: string
  candidates: Array<{
    content: string
    verified: boolean
    citation?: string
  }>
}

function uniqueUrls(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const normalized = input
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
  return Array.from(new Set(normalized))
}

export async function POST(req: Request) {
  const admin = await getAdmin()
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: PreviewRequest
  try {
    body = (await req.json()) as PreviewRequest
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const wikiquoteUrls = uniqueUrls(body.wikiquoteUrls)
  const gutenbergUrls = uniqueUrls(body.gutenbergUrls)
  const wikisourceUrls = uniqueUrls(body.wikisourceUrls)

  if (wikiquoteUrls.length + gutenbergUrls.length + wikisourceUrls.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one source URL for preview." },
      { status: 400 }
    )
  }

  if (wikiquoteUrls.length > 20 || gutenbergUrls.length > 20 || wikisourceUrls.length > 20) {
    return NextResponse.json(
      { error: "Preview supports up to 20 URLs per source type per request." },
      { status: 400 }
    )
  }

  const maxQuotesPerPage = Math.min(Math.max(body.maxQuotesPerPage ?? 20, 1), 50)
  const verifiedOnly = body.verifiedOnly !== false

  const items: PreviewItem[] = []
  const errors: string[] = []

  for (let i = 0; i < wikiquoteUrls.length; i += 1) {
    const url = wikiquoteUrls[i]
    try {
      const imported = await importQuotesFromWikiquoteUrl({
        wikiquoteUrl: url,
        maxQuotesPerPage,
        verifiedOnly,
      })
      items.push({
        sourceType: "WIKIQUOTE",
        sourceUrl: imported.wikiquoteUrl,
        sourceTitle: imported.pageTitle,
        authorName: imported.authorName || null,
        language: "en",
        candidates: imported.quotes.map((quote) => ({
          content: quote.content,
          verified: quote.verified,
        })),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Preview failed"
      errors.push(`Wikiquote ${i + 1}: ${message}`)
    }
  }

  for (let i = 0; i < gutenbergUrls.length; i += 1) {
    const url = gutenbergUrls[i]
    try {
      const imported = await importQuotesFromGutenbergUrl({
        gutenbergUrl: url,
        maxQuotesPerPage,
      })
      items.push({
        sourceType: "GUTENBERG",
        sourceUrl: imported.gutenbergUrl,
        sourceTitle: imported.pageTitle,
        authorName: imported.authorName || null,
        language: imported.language || "en",
        candidates: imported.quotes.map((quote) => ({
          content: quote.content,
          verified: quote.verified,
          citation: quote.citation,
        })),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Preview failed"
      errors.push(`Gutenberg ${i + 1}: ${message}`)
    }
  }

  for (let i = 0; i < wikisourceUrls.length; i += 1) {
    const url = wikisourceUrls[i]
    try {
      const imported = await importQuotesFromWikisourceUrl({
        wikisourceUrl: url,
        maxQuotesPerPage,
        verifiedOnly,
      })
      items.push({
        sourceType: "WIKISOURCE",
        sourceUrl: imported.wikisourceUrl,
        sourceTitle: imported.pageTitle,
        authorName: imported.authorName || null,
        language: imported.language || "en",
        candidates: imported.quotes.map((quote) => ({
          content: quote.content,
          verified: quote.verified,
          citation: quote.citation,
        })),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Preview failed"
      errors.push(`Wikisource ${i + 1}: ${message}`)
    }
  }

  const totalCandidates = items.reduce((sum, item) => sum + item.candidates.length, 0)

  return NextResponse.json({
    totalSources: items.length,
    totalCandidates,
    verifiedOnly,
    items,
    errors,
  })
}

