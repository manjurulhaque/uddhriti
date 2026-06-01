import type { ImportedAuthor } from "@/lib/wikimedia/authorImport"

type OpenLibraryAuthor = {
  key?: string
  name?: string
  bio?: string | { value?: string }
  birth_date?: string
  death_date?: string
  photos?: number[]
  links?: Array<{ title?: string; url?: string }>
}

function extractYear(raw?: string | null) {
  if (!raw) return null
  const match = raw.match(/(\d{4})/)
  if (!match) return null
  const year = Number(match[1])
  return Number.isFinite(year) ? year : null
}

function toIsoDate(raw?: string | null) {
  if (!raw) return null
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (ymd) return raw
  return null
}

function parseOpenLibraryAuthorUrl(input: string) {
  try {
    const url = new URL(input)
    if (!url.hostname.endsWith("openlibrary.org")) return null
    const match = url.pathname.match(/\/authors\/(OL\d+A)/i)
    if (!match) return null
    return match[1].toUpperCase()
  } catch {
    return null
  }
}

async function fetchAuthorById(olid: string): Promise<OpenLibraryAuthor> {
  const res = await fetch(`https://openlibrary.org/authors/${encodeURIComponent(olid)}.json`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch Open Library author")
  }
  return (await res.json()) as OpenLibraryAuthor
}

async function searchAuthorByName(name: string): Promise<OpenLibraryAuthor | null> {
  const params = new URLSearchParams()
  params.set("q", name)
  params.set("limit", "1")
  const res = await fetch(`https://openlibrary.org/search/authors.json?${params.toString()}`, {
    cache: "no-store",
  })
  if (!res.ok) return null
  const data = await res.json()
  const docs = Array.isArray(data?.docs) ? data.docs : []
  const first = docs[0] as { key?: string; name?: string } | undefined
  if (!first?.key) return null
  const match = first.key.match(/\/authors\/(OL\d+A)/i)
  if (!match) return null
  return fetchAuthorById(match[1].toUpperCase())
}

function toImportedAuthor(author: OpenLibraryAuthor): ImportedAuthor {
  const bio =
    typeof author.bio === "string"
      ? author.bio.trim() || null
      : typeof author.bio?.value === "string"
        ? author.bio.value.trim() || null
        : null

  const openLibraryId = typeof author.key === "string" ? author.key.match(/\/authors\/(OL\d+A)/i)?.[1] : null
  const wikipedia = Array.isArray(author.links)
    ? author.links.find((entry) => {
        const url = entry?.url || ""
        return typeof url === "string" && url.includes("wikipedia.org/wiki/")
      })?.url || null
    : null

  return {
    name: author.name?.trim() || "",
    bio,
    birthYear: extractYear(author.birth_date || null),
    deathYear: extractYear(author.death_date || null),
    dateOfBirth: toIsoDate(author.birth_date || null),
    dateOfDeath: toIsoDate(author.death_date || null),
    nationality: null,
    profession: null,
    imageUrl:
      openLibraryId && Array.isArray(author.photos) && author.photos.length > 0
        ? `https://covers.openlibrary.org/a/olid/${encodeURIComponent(openLibraryId)}-L.jpg`
        : null,
    wikipediaUrl: wikipedia,
    wikidataId: null,
  }
}

export async function importAuthorFromOpenLibrary(payload: {
  openLibraryUrl?: string
  openLibraryId?: string
  name?: string
}): Promise<ImportedAuthor> {
  const openLibraryIdFromUrl =
    typeof payload.openLibraryUrl === "string" ? parseOpenLibraryAuthorUrl(payload.openLibraryUrl) : null
  const openLibraryIdRaw = typeof payload.openLibraryId === "string" ? payload.openLibraryId.trim().toUpperCase() : ""
  const openLibraryId = /^OL\d+A$/.test(openLibraryIdRaw) ? openLibraryIdRaw : openLibraryIdFromUrl

  let author: OpenLibraryAuthor | null = null
  if (openLibraryId) {
    author = await fetchAuthorById(openLibraryId)
  } else if (payload.name?.trim()) {
    author = await searchAuthorByName(payload.name.trim())
  }

  if (!author) {
    throw new Error("Provide openLibraryUrl/openLibraryId or a name for Open Library search")
  }

  const imported = toImportedAuthor(author)
  if (!imported.name) {
    throw new Error("Open Library author profile is missing a name")
  }
  return imported
}

