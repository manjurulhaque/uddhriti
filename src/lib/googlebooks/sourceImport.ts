export type GoogleBooksWork = {
  title: string
  year: number | null
  description: string | null
  publisher: string | null
  externalUrl: string
  type: "BOOK" | "SPEECH" | "ARTICLE" | "INTERVIEW" | "SCRIPTURE" | "LETTER" | "OTHER"
}

type GoogleBooksItem = {
  id?: string
  volumeInfo?: {
    title?: string
    publishedDate?: string
    publisher?: string
    description?: string
    infoLink?: string
    canonicalVolumeLink?: string
  }
}

function normalizeIsbn(input?: string | null) {
  if (!input) return null
  const value = input.replace(/[^0-9Xx]/g, "").toUpperCase()
  if (value.length === 10 || value.length === 13) return value
  return null
}

function parseYear(raw?: string) {
  if (!raw) return null
  const match = raw.match(/^(\d{4})/)
  if (!match) return null
  const year = Number(match[1])
  return Number.isFinite(year) ? year : null
}

export async function importSourcesFromGoogleBooks(input: {
  query?: string | null
  authorName?: string | null
  title?: string | null
  isbn?: string | null
  limit?: number
}): Promise<GoogleBooksWork[]> {
  const query = input.query?.trim() || null
  const authorName = input.authorName?.trim() || null
  const title = input.title?.trim() || null
  const isbn = normalizeIsbn(input.isbn)
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 40)

  if (!query && !authorName && !title && !isbn) {
    throw new Error("Provide query, authorName, title, or isbn")
  }

  const searchParts: string[] = []
  if (isbn) {
    searchParts.push(`isbn:${isbn}`)
  } else {
    if (query) searchParts.push(query)
    if (authorName) searchParts.push(`inauthor:${authorName}`)
    if (title) searchParts.push(`intitle:${title}`)
  }

  const params = new URLSearchParams()
  params.set("q", searchParts.join(" "))
  params.set("maxResults", String(limit))
  params.set("printType", "books")

  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch Google Books results")
  }

  const json = await res.json()
  const items = Array.isArray(json?.items) ? (json.items as GoogleBooksItem[]) : []
  const seen = new Set<string>()
  const works: GoogleBooksWork[] = []

  for (const item of items) {
    const titleValue = item.volumeInfo?.title?.trim()
    if (!titleValue) continue

    const externalUrl =
      item.volumeInfo?.canonicalVolumeLink ||
      item.volumeInfo?.infoLink ||
      (item.id ? `https://books.google.com/books?id=${encodeURIComponent(item.id)}` : null)
    if (!externalUrl) continue

    const key = `${titleValue.toLowerCase()}|${item.id || externalUrl}`
    if (seen.has(key)) continue
    seen.add(key)

    works.push({
      title: titleValue,
      year: parseYear(item.volumeInfo?.publishedDate),
      publisher: item.volumeInfo?.publisher?.trim() || null,
      description: item.volumeInfo?.description?.trim() || null,
      externalUrl,
      type: "BOOK",
    })
  }

  return works
}

