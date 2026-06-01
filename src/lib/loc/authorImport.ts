import type { ImportedAuthor } from "@/lib/wikimedia/authorImport"

function parseLocIdFromUrl(input: string) {
  try {
    const url = new URL(input)
    if (!url.hostname.endsWith("id.loc.gov")) return null
    const match = url.pathname.match(/\/authorities\/names\/([A-Za-z0-9-]+)/)
    return match?.[1] || null
  } catch {
    return null
  }
}

function normalizeLocId(input?: string | null) {
  if (!input) return null
  const trimmed = input.trim()
  return /^[A-Za-z0-9-]+$/.test(trimmed) ? trimmed : null
}

function findFirstStringByKey(value: unknown, keyIncludes: string[]): string | null {
  if (!value) return null
  if (typeof value === "string") return value.trim() || null
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstStringByKey(item, keyIncludes)
      if (found) return found
    }
    return null
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>
    for (const [key, val] of Object.entries(obj)) {
      const lowered = key.toLowerCase()
      if (keyIncludes.some((needle) => lowered.includes(needle))) {
        const direct = findFirstStringByKey(val, [])
        if (direct) return direct
      }
    }
    for (const nested of Object.values(obj)) {
      const found = findFirstStringByKey(nested, keyIncludes)
      if (found) return found
    }
  }
  return null
}

function extractYearsFromLabel(label: string) {
  const match = label.match(/(\d{4})\s*-\s*(\d{4})?/)
  if (!match) return { birthYear: null, deathYear: null }
  const birthYear = Number(match[1])
  const deathYear = match[2] ? Number(match[2]) : null
  return {
    birthYear: Number.isFinite(birthYear) ? birthYear : null,
    deathYear: deathYear && Number.isFinite(deathYear) ? deathYear : null,
  }
}

async function fetchAuthorityById(id: string) {
  const res = await fetch(`https://id.loc.gov/authorities/names/${encodeURIComponent(id)}.json`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch LoC Name Authority record")
  }
  return res.json()
}

async function searchAuthorityByName(name: string) {
  const params = new URLSearchParams()
  params.set("q", name)
  const res = await fetch(`https://id.loc.gov/authorities/names/suggest2/?${params.toString()}`, {
    cache: "no-store",
  })
  if (!res.ok) return null
  const data = await res.json()
  const hits = Array.isArray(data?.hits) ? data.hits : []
  const first = hits[0] as { uri?: unknown } | undefined
  if (!first || typeof first.uri !== "string") return null
  const id = parseLocIdFromUrl(first.uri)
  return id || null
}

export async function importAuthorFromLocAuthority(payload: {
  locAuthorityUrl?: string
  locAuthorityId?: string
  name?: string
}): Promise<ImportedAuthor> {
  const fromUrl =
    typeof payload.locAuthorityUrl === "string" ? parseLocIdFromUrl(payload.locAuthorityUrl) : null
  const fromId = normalizeLocId(payload.locAuthorityId)
  let authorityId = fromId || fromUrl

  if (!authorityId && payload.name?.trim()) {
    authorityId = await searchAuthorityByName(payload.name.trim())
  }
  if (!authorityId) {
    throw new Error("Provide locAuthorityUrl/locAuthorityId or a name for LoC search")
  }

  const data = await fetchAuthorityById(authorityId)
  const label =
    findFirstStringByKey(data, ["authoritativelabel"]) ||
    findFirstStringByKey(data, ["prefLabel".toLowerCase()]) ||
    findFirstStringByKey(data, ["label"])

  if (!label) {
    throw new Error("LoC authority record missing label")
  }

  const { birthYear, deathYear } = extractYearsFromLabel(label)

  return {
    name: label,
    bio: null,
    birthYear,
    deathYear,
    dateOfBirth: null,
    dateOfDeath: null,
    nationality: null,
    profession: null,
    imageUrl: null,
    wikipediaUrl: null,
    wikidataId: null,
  }
}

