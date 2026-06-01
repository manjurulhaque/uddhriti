export type CrossrefWork = {
  title: string
  year: number | null
  description: string | null
  publisher: string | null
  externalUrl: string
  type: "BOOK" | "SPEECH" | "ARTICLE" | "INTERVIEW" | "SCRIPTURE" | "LETTER" | "OTHER"
}

type CrossrefItem = {
  DOI?: string
  URL?: string
  title?: string[]
  publisher?: string
  type?: string
  issued?: { "date-parts"?: number[][] }
  created?: { "date-parts"?: number[][] }
  containerTitle?: string[]
}

function normalizeDoi(input?: string | null) {
  if (!input) return null
  const value = input.trim()
  if (!value) return null
  return value.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
}

function toYear(item: CrossrefItem) {
  const yearFromIssued = item.issued?.["date-parts"]?.[0]?.[0]
  if (typeof yearFromIssued === "number" && Number.isFinite(yearFromIssued)) {
    return Math.trunc(yearFromIssued)
  }
  const yearFromCreated = item.created?.["date-parts"]?.[0]?.[0]
  if (typeof yearFromCreated === "number" && Number.isFinite(yearFromCreated)) {
    return Math.trunc(yearFromCreated)
  }
  return null
}

function mapCrossrefType(type?: string): CrossrefWork["type"] {
  const value = (type || "").toLowerCase()
  if (value.includes("book")) return "BOOK"
  if (value.includes("article") || value.includes("journal")) return "ARTICLE"
  if (value.includes("proceedings")) return "ARTICLE"
  if (value.includes("report")) return "ARTICLE"
  return "OTHER"
}

export async function importSourcesFromCrossref(input: {
  query?: string | null
  authorName?: string | null
  title?: string | null
  doi?: string | null
  limit?: number
}): Promise<CrossrefWork[]> {
  const query = input.query?.trim() || null
  const authorName = input.authorName?.trim() || null
  const title = input.title?.trim() || null
  const doi = normalizeDoi(input.doi)
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100)

  if (!query && !authorName && !title && !doi) {
    throw new Error("Provide query, authorName, title, or doi")
  }

  let endpoint = ""
  if (doi) {
    endpoint = `https://api.crossref.org/works/${encodeURIComponent(doi)}`
  } else {
    const params = new URLSearchParams()
    params.set("rows", String(limit))
    if (query) params.set("query", query)
    if (authorName) params.set("query.author", authorName)
    if (title) params.set("query.title", title)
    endpoint = `https://api.crossref.org/works?${params.toString()}`
  }

  const res = await fetch(endpoint, { cache: "no-store" })
  if (!res.ok) {
    throw new Error("Failed to fetch Crossref results")
  }

  const json = await res.json()
  const items: CrossrefItem[] = doi
    ? [json?.message as CrossrefItem]
    : (Array.isArray(json?.message?.items) ? json.message.items : [])

  const works: CrossrefWork[] = []
  const seen = new Set<string>()

  for (const item of items) {
    if (!item || typeof item !== "object") continue
    const titleValue = Array.isArray(item.title) ? item.title.find((v) => typeof v === "string" && v.trim()) : null
    if (!titleValue) continue

    const externalUrl = item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : null)
    if (!externalUrl) continue

    const key = `${titleValue.trim().toLowerCase()}|${item.DOI || externalUrl}`
    if (seen.has(key)) continue
    seen.add(key)

    const container = Array.isArray(item.containerTitle)
      ? item.containerTitle.find((v) => typeof v === "string" && v.trim()) || null
      : null

    works.push({
      title: titleValue.trim(),
      year: toYear(item),
      publisher: item.publisher?.trim() || null,
      description: container ? `Container: ${container}` : null,
      externalUrl,
      type: mapCrossrefType(item.type),
    })
  }

  return works
}

