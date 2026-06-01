export type LocWork = {
  title: string
  year: number | null
  description: string | null
  publisher: string | null
  externalUrl: string
  type: "BOOK" | "SPEECH" | "ARTICLE" | "INTERVIEW" | "SCRIPTURE" | "LETTER" | "OTHER"
}

type LocResult = Record<string, unknown>

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function parseYear(raw: unknown) {
  if (typeof raw !== "string") return null
  const match = raw.match(/(\d{4})/)
  if (!match) return null
  const year = Number(match[1])
  return Number.isFinite(year) ? year : null
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

function normalizeIsbn(input?: string | null) {
  if (!input) return null
  const value = input.replace(/[^0-9Xx]/g, "").toUpperCase()
  if (value.length === 10 || value.length === 13) return value
  return null
}

export async function importSourcesFromLoc(input: {
  query?: string | null
  title?: string | null
  authorName?: string | null
  isbn?: string | null
  limit?: number
}): Promise<LocWork[]> {
  const query = input.query?.trim() || null
  const title = input.title?.trim() || null
  const authorName = input.authorName?.trim() || null
  const isbn = normalizeIsbn(input.isbn)
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100)

  if (!query && !title && !authorName && !isbn) {
    throw new Error("Provide query, title, authorName, or isbn")
  }

  const parts: string[] = []
  if (query) parts.push(query)
  if (title) parts.push(title)
  if (authorName) parts.push(authorName)
  if (isbn) parts.push(isbn)

  const params = new URLSearchParams()
  params.set("fo", "json")
  params.set("q", parts.join(" "))
  params.set("c", String(limit))

  const res = await fetch(`https://www.loc.gov/books/?${params.toString()}`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch Library of Congress results")
  }

  const json = await res.json()
  const results = Array.isArray(json?.results) ? (json.results as LocResult[]) : []
  const works: LocWork[] = []
  const seen = new Set<string>()

  for (const item of results) {
    const nested = asObject(item.item)
    const titleValue =
      firstString(item.title) ||
      firstString(nested?.title) ||
      firstString(item.group) ||
      null
    if (!titleValue) continue

    const externalUrl =
      firstString(item.id) ||
      firstString(item.url) ||
      firstString(nested?.id) ||
      null
    if (!externalUrl) continue

    const dedupe = `${titleValue.toLowerCase()}|${externalUrl}`
    if (seen.has(dedupe)) continue
    seen.add(dedupe)

    const publisher =
      firstString(item.publisher) ||
      firstString(nested?.publisher) ||
      null
    const dateValue = firstString(item.date) || firstString(nested?.date)
    const year = parseYear(dateValue)
    const description =
      firstString(item.description) ||
      firstString(item.subject) ||
      firstString(nested?.description) ||
      null

    works.push({
      title: titleValue,
      year,
      publisher,
      description,
      externalUrl,
      type: "BOOK",
    })
  }

  return works
}
