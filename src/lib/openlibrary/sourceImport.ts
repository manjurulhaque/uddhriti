export type OpenLibraryWork = {
  title: string
  year: number | null
  description: string | null
  publisher: string | null
  externalUrl: string
  type: "BOOK" | "SPEECH" | "ARTICLE" | "INTERVIEW" | "SCRIPTURE" | "LETTER" | "OTHER"
}

function normalizeIsbn(input?: string | null) {
  if (!input) return null
  const value = input.replace(/[^0-9Xx]/g, "").toUpperCase()
  if (value.length === 10 || value.length === 13) return value
  return null
}

function toNumberYear(value: unknown) {
  if (typeof value !== "number") return null
  return Number.isFinite(value) ? Math.trunc(value) : null
}

function firstString(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && item.trim()) return item.trim()
    }
  }
  return null
}

export async function importSourcesFromOpenLibrary(input: {
  authorName?: string | null
  title?: string | null
  isbn?: string | null
  limit?: number
}): Promise<OpenLibraryWork[]> {
  const authorName = input.authorName?.trim() || null
  const title = input.title?.trim() || null
  const isbn = normalizeIsbn(input.isbn)
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200)

  if (!authorName && !title && !isbn) {
    throw new Error("Provide authorName, title, or isbn")
  }

  const params = new URLSearchParams()
  params.set("limit", String(limit))
  if (authorName) params.set("author", authorName)
  if (title) params.set("title", title)
  if (isbn) params.set("isbn", isbn)

  const res = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch Open Library search results")
  }

  const json = await res.json()
  const docs = Array.isArray(json?.docs) ? (json.docs as Array<Record<string, unknown>>) : []
  const works: OpenLibraryWork[] = []
  const seen = new Set<string>()

  for (const doc of docs) {
    const rawTitle = firstString(doc.title)
    if (!rawTitle) continue

    const key = firstString(doc.key) || ""
    const normalizedTitle = rawTitle.toLowerCase()
    const dedupe = `${normalizedTitle}|${key}`
    if (seen.has(dedupe)) continue
    seen.add(dedupe)

    const year = toNumberYear(doc.first_publish_year)
    const publisher = firstString(doc.publisher)
    const subjects = Array.isArray(doc.subject) ? doc.subject.slice(0, 4).filter((s) => typeof s === "string") : []
    const subjectText = subjects.length > 0 ? `Subjects: ${subjects.join(", ")}` : null

    const externalPath = key && key.startsWith("/") ? key : ""
    const externalUrl = externalPath ? `https://openlibrary.org${externalPath}` : "https://openlibrary.org"

    works.push({
      title: rawTitle,
      year,
      publisher,
      description: subjectText,
      externalUrl,
      type: "BOOK",
    })
  }

  return works
}

