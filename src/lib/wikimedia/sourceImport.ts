import slugify from "slugify"

type WorkItem = {
  title: string
  year: number | null
  description: string | null
  type: "BOOK" | "SPEECH" | "ARTICLE" | "INTERVIEW" | "SCRIPTURE" | "LETTER" | "OTHER"
  externalUrl: string
}

function normalizeWikidataId(input?: string | null) {
  if (!input) return null
  const trimmed = input.trim().toUpperCase()
  return /^Q\d+$/.test(trimmed) ? trimmed : null
}

function parseWikiUrl(input: string) {
  try {
    const url = new URL(input)
    if (!url.hostname.endsWith("wikipedia.org")) {
      return null
    }

    const marker = "/wiki/"
    if (!url.pathname.startsWith(marker)) {
      return null
    }

    const title = decodeURIComponent(url.pathname.slice(marker.length))
    if (!title) return null

    return {
      host: url.hostname,
      title,
    }
  } catch {
    return null
  }
}

async function resolveWikidataIdFromWikipediaUrl(wikipediaUrl: string) {
  const parsed = parseWikiUrl(wikipediaUrl)
  if (!parsed) {
    throw new Error("Invalid Wikipedia URL")
  }

  const apiUrl =
    `https://${parsed.host}/w/api.php` +
    `?action=query&prop=pageprops&redirects=1&format=json` +
    `&titles=${encodeURIComponent(parsed.title)}`

  const res = await fetch(apiUrl, { cache: "no-store" })
  if (!res.ok) {
    throw new Error("Failed to fetch Wikipedia page")
  }

  const data = await res.json()
  const pages = data?.query?.pages
  const firstPage = pages ? (Object.values(pages)[0] as Record<string, unknown>) : null
  if (!firstPage || (firstPage as { missing?: unknown }).missing !== undefined) {
    throw new Error("Wikipedia page not found")
  }

  const pageprops = firstPage.pageprops as { wikibase_item?: unknown } | undefined
  const wikidataId = typeof pageprops?.wikibase_item === "string" ? pageprops.wikibase_item : null
  return normalizeWikidataId(wikidataId || undefined)
}

function mapWorkType(label?: string | null): WorkItem["type"] {
  const value = (label || "").toLowerCase()
  if (value.includes("book") || value.includes("novel")) return "BOOK"
  if (value.includes("speech")) return "SPEECH"
  if (value.includes("article") || value.includes("essay")) return "ARTICLE"
  if (value.includes("interview")) return "INTERVIEW"
  if (value.includes("scripture")) return "SCRIPTURE"
  if (value.includes("letter") || value.includes("epistle")) return "LETTER"
  return "OTHER"
}

function parseYear(raw?: string | null) {
  if (!raw) return null
  const match = raw.match(/^\+?(\d{4})/)
  if (!match) return null
  const year = Number(match[1])
  return Number.isFinite(year) ? year : null
}

function extractEntityIdFromUri(uri: string) {
  const match = uri.match(/\/entity\/(Q\d+)$/)
  return match ? match[1] : null
}

export async function importSourcesFromWikidataAuthor(input: {
  wikidataId?: string | null
  wikipediaUrl?: string | null
  limit?: number
}): Promise<WorkItem[]> {
  let wikidataId = normalizeWikidataId(input.wikidataId || undefined)
  if (!wikidataId && input.wikipediaUrl) {
    wikidataId = await resolveWikidataIdFromWikipediaUrl(input.wikipediaUrl)
  }
  if (!wikidataId) {
    throw new Error("Provide valid wikidataId or wikipediaUrl")
  }

  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200)
  const sparql = `
    SELECT ?work ?workLabel ?publicationDate ?inception ?description ?workTypeLabel WHERE {
      ?work wdt:P50 wd:${wikidataId} .
      OPTIONAL { ?work wdt:P577 ?publicationDate. }
      OPTIONAL { ?work wdt:P571 ?inception. }
      OPTIONAL {
        ?work wdt:P31 ?workType .
        ?workType rdfs:label ?workTypeLabel .
        FILTER(LANG(?workTypeLabel) = "en")
      }
      OPTIONAL {
        ?work schema:description ?description .
        FILTER(LANG(?description) = "en")
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT ${limit}
  `

  const res = await fetch(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`,
    { cache: "no-store" }
  )
  if (!res.ok) {
    throw new Error("Failed to query Wikidata works")
  }

  const data = await res.json()
  const bindings = data?.results?.bindings as Array<Record<string, { value?: string }>> | undefined
  if (!Array.isArray(bindings)) {
    return []
  }

  const seen = new Set<string>()
  const items: WorkItem[] = []

  for (const row of bindings) {
    const title = row.workLabel?.value?.trim()
    const workUri = row.work?.value
    if (!title || !workUri) continue

    const externalId = extractEntityIdFromUri(workUri)
    if (!externalId) continue

    const key = `${title.toLowerCase()}|${externalId}`
    if (seen.has(key)) continue
    seen.add(key)

    const year = parseYear(row.publicationDate?.value || row.inception?.value || null)
    items.push({
      title,
      year,
      description: row.description?.value?.trim() || null,
      type: mapWorkType(row.workTypeLabel?.value || null),
      externalUrl: `https://www.wikidata.org/wiki/${externalId}`,
    })
  }

  return items
}

export function createUniqueSourceSlug(title: string, usedSlugs: Set<string>) {
  const base = slugify(title, { lower: true, strict: true }) || "source"
  let slug = base
  let suffix = 2
  while (usedSlugs.has(slug)) {
    slug = `${base}-${suffix}`
    suffix += 1
  }
  usedSlugs.add(slug)
  return slug
}
