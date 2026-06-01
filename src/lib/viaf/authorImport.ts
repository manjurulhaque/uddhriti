import type { ImportedAuthor } from "@/lib/wikimedia/authorImport"

type ViafHeadingEntry = {
  text?: string
}

type ViafRecord = {
  mainHeadings?: {
    data?: ViafHeadingEntry | ViafHeadingEntry[]
  }
  birthDate?: string
  deathDate?: string
  nationalityOfEntity?: {
    data?: { text?: string } | Array<{ text?: string }>
  }
  xLinks?: string[] | string
}

function parseViafIdFromUrl(input: string) {
  try {
    const url = new URL(input)
    if (!url.hostname.endsWith("viaf.org")) return null
    const match = url.pathname.match(/\/viaf\/(\d+)/)
    return match?.[1] || null
  } catch {
    return null
  }
}

function normalizeViafId(input?: string | null) {
  if (!input) return null
  const trimmed = input.trim()
  return /^\d+$/.test(trimmed) ? trimmed : null
}

function firstText(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string" && entry.trim()) return entry.trim()
      if (entry && typeof entry === "object" && typeof (entry as { text?: unknown }).text === "string") {
        const text = (entry as { text: string }).text.trim()
        if (text) return text
      }
    }
  }
  if (value && typeof value === "object" && typeof (value as { text?: unknown }).text === "string") {
    const text = (value as { text: string }).text.trim()
    if (text) return text
  }
  return null
}

function extractYear(raw?: string | null) {
  if (!raw) return null
  const match = raw.match(/(\d{4})/)
  if (!match) return null
  const year = Number(match[1])
  return Number.isFinite(year) ? year : null
}

export async function importAuthorFromViaf(payload: {
  viafUrl?: string
  viafId?: string
}): Promise<ImportedAuthor> {
  const fromUrl = typeof payload.viafUrl === "string" ? parseViafIdFromUrl(payload.viafUrl) : null
  const fromId = normalizeViafId(payload.viafId)
  const viafId = fromId || fromUrl
  if (!viafId) {
    throw new Error("Provide viafId or a valid viafUrl")
  }

  const res = await fetch(`https://viaf.org/viaf/${encodeURIComponent(viafId)}/viaf.json`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch VIAF record")
  }

  const data = (await res.json()) as ViafRecord
  const name = firstText(data.mainHeadings?.data)
  if (!name) {
    throw new Error("VIAF record missing author name")
  }

  const nationality = firstText(data.nationalityOfEntity?.data)

  return {
    name,
    bio: null,
    birthYear: extractYear(data.birthDate || null),
    deathYear: extractYear(data.deathDate || null),
    dateOfBirth: null,
    dateOfDeath: null,
    nationality: nationality || null,
    profession: null,
    imageUrl: null,
    wikipediaUrl: null,
    wikidataId: null,
  }
}

