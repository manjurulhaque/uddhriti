import { prisma } from "@/lib/prisma"
import { registerPublicDataInvalidator } from "@/lib/revalidation"

export interface QuoteEditorOptions {
  authors: Array<{
    id: string
    name: string
    slug?: string
    profession?: string | null
    birthYear?: number | null
    deathYear?: number | null
    quoteCount?: number
  }>
  categories: Array<{ id: string; name: string; slug: string }>
  sources: Array<{
    id: string
    title: string
    slug?: string
    type?: string
    year?: number | null
    authorId?: string | null
    quoteCount?: number
  }>
  tags: Array<{ id: string; name: string; type: string; description: string | null }>
}

let cachedOptions: { data: QuoteEditorOptions; timestamp: number } | null = null
const CACHE_TTL_MS = 60 * 1000 // 60 seconds

registerPublicDataInvalidator(() => {
  cachedOptions = null
})

export async function getQuoteEditorOptions(): Promise<QuoteEditorOptions> {
  const now = Date.now()
  if (cachedOptions && now - cachedOptions.timestamp < CACHE_TTL_MS) {
    return cachedOptions.data
  }

  const [authors, categories, sources, tags] = await Promise.all([
    prisma.author.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        profession: true,
        birthYear: true,
        deathYear: true,
        quoteCount: true,
      },
    }),
    prisma.category.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
    prisma.source.findMany({
      orderBy: [{ quoteCount: "desc" }, { title: "asc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        year: true,
        authorId: true,
        quoteCount: true,
      },
    }),
    prisma.tag.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, type: true, description: true },
    }),
  ])

  const data: QuoteEditorOptions = { authors, categories, sources, tags }
  cachedOptions = { data, timestamp: now }
  return data
}

