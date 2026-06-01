export type ImportPayload = {
  wikipediaUrl?: string
  wikidataId?: string
  wikiquoteUrl?: string
  wikipediaCategoryUrl?: string
  wikiquoteCategoryUrl?: string
  wikidataCategoryId?: string
}

export type ImportedAuthor = {
  name: string
  bio: string | null
  birthYear: number | null
  deathYear: number | null
  dateOfBirth: string | null
  dateOfDeath: string | null
  nationality: string | null
  profession: string | null
  imageUrl: string | null
  wikipediaUrl: string | null
  wikidataId: string | null
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
      normalizedUrl: `${url.protocol}//${url.hostname}${url.pathname}`,
    }
  } catch {
    return null
  }
}

function parseWikiquoteUrl(input: string) {
  try {
    const url = new URL(input)
    if (!url.hostname.endsWith("wikiquote.org")) {
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
      normalizedUrl: `${url.protocol}//${url.hostname}${url.pathname}`,
    }
  } catch {
    return null
  }
}

function parseWikipediaCategoryUrl(input: string) {
  const parsed = parseWikiUrl(input)
  if (!parsed) return null
  if (!parsed.title.startsWith("Category:")) return null
  return parsed
}

function parseWikiquoteCategoryUrl(input: string) {
  const parsed = parseWikiquoteUrl(input)
  if (!parsed) return null
  if (!parsed.title.startsWith("Category:")) return null
  return parsed
}

function isWikiquotePeopleListTitle(title: string) {
  const normalized = title.replaceAll("_", " ").trim().toLowerCase()
  return normalized === "list of people" || normalized === "list of peoples"
}

function toIsoDateFromWikidataTime(time?: string) {
  if (!time) return null
  const match = time.match(/^([+-]\d{4,})-(\d{2})-(\d{2})T/)
  if (!match) return null
  const [, yearRaw, month, day] = match
  if (yearRaw.startsWith("-")) return null
  const year = yearRaw.startsWith("+") ? yearRaw.slice(1) : yearRaw
  if (year.length !== 4) return null
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  if (!Number.isInteger(monthNumber) || !Number.isInteger(dayNumber)) return null
  if (monthNumber < 1 || monthNumber > 12) return null
  if (dayNumber < 1 || dayNumber > 31) return null
  return `${year}-${month}-${day}`
}

function yearFromWikidataTime(time?: string | null) {
  if (!time) return null
  const match = time.match(/^([+-]?\d{1,16})-\d{2}-\d{2}T/)
  if (!match) return null
  const year = Number(match[1])
  return Number.isFinite(year) ? year : null
}

function normalizeWikidataId(input?: string) {
  if (!input) return null
  const trimmed = input.trim().toUpperCase()
  return /^Q\d+$/.test(trimmed) ? trimmed : null
}

async function fetchWikidataEntityRaw(wikidataId: string) {
  const data = await fetchJson(
    `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`
  ).catch(() => {
    throw new Error("Failed to fetch Wikidata entity")
  })
  const entity = data?.entities?.[wikidataId] as
    | {
        labels?: { en?: { value?: unknown } }
        descriptions?: { en?: { value?: unknown } }
        claims?: Record<string, unknown>
        sitelinks?: { enwiki?: { title?: unknown } }
      }
    | undefined

  if (!entity) {
    throw new Error("Wikidata entity not found")
  }

  return entity
}

function extractEntityIdArray(claims: Record<string, unknown> | undefined, property: string) {
  const claimList = claims?.[property]
  if (!Array.isArray(claimList)) return []

  const ids: string[] = []
  for (const claim of claimList) {
    const mainsnak = (claim as { mainsnak?: { datavalue?: { value?: { id?: unknown } } } }).mainsnak
    const value = mainsnak?.datavalue?.value?.id
    if (typeof value === "string" && /^Q\d+$/.test(value)) {
      ids.push(value)
    }
  }
  return ids
}

function extractFirstTime(claims: Record<string, unknown> | undefined, property: string) {
  const claimList = claims?.[property]
  if (!Array.isArray(claimList) || claimList.length === 0) return null

  const first = claimList[0] as { mainsnak?: { datavalue?: { value?: { time?: unknown } } } }
  const time = first.mainsnak?.datavalue?.value?.time
  return typeof time === "string" ? time : null
}

function extractImageFileName(claims: Record<string, unknown> | undefined) {
  const claimList = claims?.P18
  if (!Array.isArray(claimList) || claimList.length === 0) return null

  const first = claimList[0] as { mainsnak?: { datavalue?: { value?: unknown } } }
  const value = first.mainsnak?.datavalue?.value
  return typeof value === "string" ? value : null
}

function commonsFileUrl(fileName: string) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`
}

function mediaWikiHeaders() {
  return {
    Accept: "application/json",
    "User-Agent": "quotations-author-import/1.0",
  }
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: mediaWikiHeaders(),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(body.trim() || `Request failed with status ${res.status}`)
  }

  return res.json()
}

async function fetchWikipediaSummary(wikipediaUrl: string) {
  const parsed = parseWikiUrl(wikipediaUrl)
  if (!parsed) {
    throw new Error("Invalid Wikipedia URL")
  }

  const actionApiUrl =
    `https://${parsed.host}/w/api.php` +
    `?action=query&prop=pageprops|extracts|pageimages&redirects=1&format=json` +
    `&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=600` +
    `&titles=${encodeURIComponent(parsed.title)}`

  try {
    const data = await fetchJson(actionApiUrl)
    const pages = data?.query?.pages
    const firstPage = pages ? (Object.values(pages)[0] as Record<string, unknown>) : null
    if (!firstPage || (firstPage as { missing?: unknown }).missing !== undefined) {
      throw new Error("Wikipedia page not found")
    }

    const pageprops = firstPage.pageprops as { wikibase_item?: unknown } | undefined
    const extract = firstPage.extract
    const title = firstPage.title
    const thumbnail = firstPage.thumbnail as { source?: unknown } | undefined

    return {
      title: typeof title === "string" ? title : null,
      bio: typeof extract === "string" ? extract : null,
      imageUrl: typeof thumbnail?.source === "string" ? thumbnail.source : null,
      wikidataId: typeof pageprops?.wikibase_item === "string" ? pageprops.wikibase_item : null,
      wikipediaUrl: parsed.normalizedUrl,
    }
  } catch {
    const restSummaryUrl = `https://${parsed.host}/api/rest_v1/page/summary/${encodeURIComponent(parsed.title)}`
    const summary = await fetchJson(restSummaryUrl)

    if (summary?.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found") {
      throw new Error("Wikipedia page not found")
    }

    const pageTitle = typeof summary?.title === "string" ? summary.title : null
    const contentUrl = summary?.content_urls?.desktop?.page
    const normalizedWikipediaUrl =
      typeof contentUrl === "string" && contentUrl.trim() ? contentUrl : parsed.normalizedUrl

    let wikidataId: string | null = null
    try {
      const propsUrl =
        `https://${parsed.host}/w/api.php` +
        `?action=query&prop=pageprops&redirects=1&format=json` +
        `&titles=${encodeURIComponent(pageTitle || parsed.title)}`
      const propsData = await fetchJson(propsUrl)
      const propsPages = propsData?.query?.pages
      const propsFirstPage = propsPages ? (Object.values(propsPages)[0] as Record<string, unknown>) : null
      const pageprops = propsFirstPage?.pageprops as { wikibase_item?: unknown } | undefined
      wikidataId = typeof pageprops?.wikibase_item === "string" ? pageprops.wikibase_item : null
    } catch {
      wikidataId = null
    }

    return {
      title: pageTitle,
      bio: typeof summary?.extract === "string" ? summary.extract : null,
      imageUrl:
        typeof summary?.thumbnail?.source === "string" ? summary.thumbnail.source : null,
      wikidataId,
      wikipediaUrl: normalizedWikipediaUrl,
    }
  }
}

async function fetchWikiquoteMetadata(wikiquoteUrl: string) {
  const parsed = parseWikiquoteUrl(wikiquoteUrl)
  if (!parsed) {
    throw new Error("Invalid Wikiquote URL")
  }

  const apiUrl =
    `https://${parsed.host}/w/api.php` +
    `?action=query&prop=pageprops&redirects=1&format=json` +
    `&titles=${encodeURIComponent(parsed.title)}`

  const data = await fetchJson(apiUrl).catch(() => {
    throw new Error("Failed to fetch Wikiquote page")
  })
  const pages = data?.query?.pages
  const firstPage = pages ? (Object.values(pages)[0] as Record<string, unknown>) : null
  if (!firstPage || (firstPage as { missing?: unknown }).missing !== undefined) {
    throw new Error("Wikiquote page not found")
  }

  const pageprops = firstPage.pageprops as { wikibase_item?: unknown } | undefined
  const title = typeof firstPage.title === "string" ? firstPage.title : parsed.title

  return {
    title,
    wikiquoteUrl: parsed.normalizedUrl,
    wikidataId: typeof pageprops?.wikibase_item === "string" ? pageprops.wikibase_item : null,
  }
}

async function fetchEntityLabels(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>()

  const unique = Array.from(new Set(ids))
  const data = await fetchJson(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en&props=labels&ids=${unique.join("|")}`
  ).catch(() => null)
  if (!data) return new Map<string, string>()
  const entities = data?.entities as Record<string, { labels?: { en?: { value?: unknown } } }> | undefined
  const map = new Map<string, string>()

  if (!entities) return map
  for (const id of unique) {
    const label = entities[id]?.labels?.en?.value
    if (typeof label === "string" && label.trim()) {
      map.set(id, label.trim())
    }
  }
  return map
}

async function fetchWikidataEntity(wikidataId: string) {
  const entity = await fetchWikidataEntityRaw(wikidataId)

  const birthTime = extractFirstTime(entity.claims, "P569") || undefined
  const deathTime = extractFirstTime(entity.claims, "P570") || undefined
  const birthIso = toIsoDateFromWikidataTime(birthTime)
  const deathIso = toIsoDateFromWikidataTime(deathTime)

  const nationalityIds = extractEntityIdArray(entity.claims, "P27")
  const ethnicityIds = extractEntityIdArray(entity.claims, "P172")
  const professionIds = extractEntityIdArray(entity.claims, "P106")
  const labelMap = await fetchEntityLabels([...nationalityIds, ...ethnicityIds, ...professionIds])

  const nationality =
    nationalityIds.map((id) => labelMap.get(id)).filter(Boolean).join(", ") ||
    ethnicityIds.map((id) => labelMap.get(id)).filter(Boolean).join(", ") ||
    null
  const profession = professionIds.map((id) => labelMap.get(id)).filter(Boolean).join(", ") || null

  const imageFile = extractImageFileName(entity.claims)
  const enwikiTitle = entity.sitelinks?.enwiki?.title

  return {
    name: typeof entity.labels?.en?.value === "string" ? entity.labels.en.value : null,
    bio:
      typeof entity.descriptions?.en?.value === "string"
        ? entity.descriptions.en.value
        : null,
    dateOfBirth: birthIso,
    dateOfDeath: deathIso,
    birthYear: yearFromWikidataTime(birthTime),
    deathYear: yearFromWikidataTime(deathTime),
    nationality,
    profession,
    imageUrl: imageFile ? commonsFileUrl(imageFile) : null,
    wikipediaUrl:
      typeof enwikiTitle === "string"
        ? `https://en.wikipedia.org/wiki/${encodeURIComponent(enwikiTitle.replace(/ /g, "_"))}`
        : null,
    wikidataId,
  }
}

async function fetchWikipediaCategoryMembers(
  host: string,
  categoryTitle: string,
  limit: number
) {
  const members: string[] = []
  let continuation: string | undefined

  while (members.length < limit) {
    const remaining = limit - members.length
    const pageLimit = Math.min(remaining, 500)
    const continuePart = continuation ? `&cmcontinue=${encodeURIComponent(continuation)}` : ""
    const url =
      `https://${host}/w/api.php?action=query&format=json&list=categorymembers` +
      `&cmtitle=${encodeURIComponent(categoryTitle)}` +
      `&cmnamespace=0&cmtype=page&cmlimit=${pageLimit}${continuePart}`

    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      throw new Error("Failed to fetch category members from Wikipedia")
    }

    const data = await res.json()
    const categoryMembers = data?.query?.categorymembers as
      | Array<{ title?: unknown }>
      | undefined
    if (!Array.isArray(categoryMembers) || categoryMembers.length === 0) {
      break
    }

    for (const member of categoryMembers) {
      if (typeof member.title === "string" && member.title.trim()) {
        members.push(member.title)
        if (members.length >= limit) break
      }
    }

    const nextContinue = data?.continue?.cmcontinue
    if (typeof nextContinue === "string" && nextContinue) {
      continuation = nextContinue
    } else {
      break
    }
  }

  return members.map((title) => ({
    wikipediaUrl: `https://${host}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  }))
}

async function fetchWikiquoteCategoryMembers(
  host: string,
  categoryTitle: string,
  limit: number
) {
  const members: string[] = []
  let continuation: string | undefined

  while (members.length < limit) {
    const remaining = limit - members.length
    const pageLimit = Math.min(remaining, 500)
    const continuePart = continuation ? `&cmcontinue=${encodeURIComponent(continuation)}` : ""
    const url =
      `https://${host}/w/api.php?action=query&format=json&list=categorymembers` +
      `&cmtitle=${encodeURIComponent(categoryTitle)}` +
      `&cmnamespace=0&cmtype=page&cmlimit=${pageLimit}${continuePart}`

    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      throw new Error("Failed to fetch category members from Wikiquote")
    }

    const data = await res.json()
    const categoryMembers = data?.query?.categorymembers as
      | Array<{ title?: unknown }>
      | undefined
    if (!Array.isArray(categoryMembers) || categoryMembers.length === 0) {
      break
    }

    for (const member of categoryMembers) {
      if (typeof member.title === "string" && member.title.trim()) {
        members.push(member.title)
        if (members.length >= limit) break
      }
    }

    const nextContinue = data?.continue?.cmcontinue
    if (typeof nextContinue === "string" && nextContinue) {
      continuation = nextContinue
    } else {
      break
    }
  }

  return members.map((title) => ({
    wikiquoteUrl: `https://${host}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  }))
}

async function fetchWikiquotePageLinks(
  host: string,
  pageTitle: string,
  limit: number
) {
  const links: string[] = []
  let continuation: string | undefined

  while (links.length < limit) {
    const remaining = limit - links.length
    const pageLimit = Math.min(remaining, 500)
    const continuePart = continuation ? `&plcontinue=${encodeURIComponent(continuation)}` : ""
    const url =
      `https://${host}/w/api.php?action=query&format=json&prop=links` +
      `&titles=${encodeURIComponent(pageTitle)}` +
      `&plnamespace=0&pllimit=${pageLimit}${continuePart}`

    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      throw new Error("Failed to fetch links from Wikiquote page")
    }

    const data = await res.json()
    const pages = data?.query?.pages as Record<string, { links?: Array<{ title?: unknown }> }> | undefined
    const firstPage = pages ? Object.values(pages)[0] : null
    const pageLinks = firstPage?.links
    if (!Array.isArray(pageLinks) || pageLinks.length === 0) {
      break
    }

    for (const link of pageLinks) {
      if (typeof link.title !== "string" || !link.title.trim()) {
        continue
      }

      const title = link.title.trim()
      const normalized = title.replaceAll("_", " ").trim().toLowerCase()
      if (
        normalized.startsWith("list of ") ||
        normalized.startsWith("lists of ") ||
        normalized.startsWith("category:")
      ) {
        continue
      }

      links.push(title)
      if (links.length >= limit) break
    }

    const nextContinue = data?.continue?.plcontinue
    if (typeof nextContinue === "string" && nextContinue) {
      continuation = nextContinue
    } else {
      break
    }
  }

  return links.map((title) => ({
    wikiquoteUrl: `https://${host}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  }))
}

export async function importAuthorSeedsFromCategory(payload: {
  wikipediaCategoryUrl?: string
  wikiquoteCategoryUrl?: string
  wikidataCategoryId?: string
  limit?: number
}): Promise<Array<{ wikipediaUrl?: string; wikidataId?: string; wikiquoteUrl?: string }>> {
  const limit = Math.min(Math.max(payload.limit ?? 100, 1), 500)

  if (payload.wikipediaCategoryUrl) {
    const parsed = parseWikipediaCategoryUrl(payload.wikipediaCategoryUrl)
    if (!parsed) {
      throw new Error("Invalid Wikipedia category URL")
    }

    return fetchWikipediaCategoryMembers(parsed.host, parsed.title, limit)
  }

  if (payload.wikiquoteCategoryUrl) {
    const parsed = parseWikiquoteCategoryUrl(payload.wikiquoteCategoryUrl)
    if (!parsed) {
      throw new Error("Invalid Wikiquote category URL")
    }

    return fetchWikiquoteCategoryMembers(parsed.host, parsed.title, limit)
  }

  const wikidataCategoryId = normalizeWikidataId(payload.wikidataCategoryId)
  if (!wikidataCategoryId) {
    throw new Error("Provide wikipediaCategoryUrl, wikiquoteCategoryUrl, or wikidataCategoryId")
  }

  const entity = await fetchWikidataEntityRaw(wikidataCategoryId)
  const enwikiTitle = entity.sitelinks?.enwiki?.title
  if (typeof enwikiTitle !== "string" || !enwikiTitle.startsWith("Category:")) {
    throw new Error("Wikidata category does not have an enwiki category sitelink")
  }

  return fetchWikipediaCategoryMembers("en.wikipedia.org", enwikiTitle, limit)
}

export async function importAuthorSeedsFromWikiquoteUrl(payload: {
  wikiquoteUrl?: string
  limit?: number
}): Promise<Array<{ wikiquoteUrl?: string }>> {
  const wikiquoteUrl = payload.wikiquoteUrl?.trim()
  if (!wikiquoteUrl) {
    throw new Error("Provide wikiquoteUrl")
  }

  const parsed = parseWikiquoteUrl(wikiquoteUrl)
  if (!parsed) {
    throw new Error("Invalid Wikiquote URL")
  }

  const limit = Math.min(Math.max(payload.limit ?? 100, 1), 500)
  if (isWikiquotePeopleListTitle(parsed.title)) {
    return fetchWikiquotePageLinks(parsed.host, parsed.title, limit)
  }

  return [{ wikiquoteUrl: parsed.normalizedUrl }]
}

export async function importAuthorFromWikipediaOrWikidata(payload: ImportPayload): Promise<ImportedAuthor> {
  const wikidataIdInput = normalizeWikidataId(payload.wikidataId)
  const wikipediaUrlInput = payload.wikipediaUrl?.trim()

  if (!wikidataIdInput && !wikipediaUrlInput) {
    throw new Error("Provide wikipediaUrl or wikidataId")
  }

  let wikipediaData: Awaited<ReturnType<typeof fetchWikipediaSummary>> | null = null
  let wikidataId = wikidataIdInput

  if (!wikidataId && wikipediaUrlInput) {
    wikipediaData = await fetchWikipediaSummary(wikipediaUrlInput)
    wikidataId = normalizeWikidataId(wikipediaData.wikidataId || undefined)
  } else if (wikipediaUrlInput) {
    wikipediaData = await fetchWikipediaSummary(wikipediaUrlInput)
  }

  if (!wikidataId) {
    return {
      name: wikipediaData?.title || "",
      bio: wikipediaData?.bio || null,
      birthYear: null,
      deathYear: null,
      dateOfBirth: null,
      dateOfDeath: null,
      nationality: null,
      profession: null,
      imageUrl: wikipediaData?.imageUrl || null,
      wikipediaUrl: wikipediaData?.wikipediaUrl || wikipediaUrlInput || null,
      wikidataId: null,
    }
  }

  let wikidataData: Awaited<ReturnType<typeof fetchWikidataEntity>> | null = null
  try {
    wikidataData = await fetchWikidataEntity(wikidataId)
  } catch (error) {
    if (!wikipediaData) {
      throw error
    }
  }

  if (!wikidataData) {
    return {
      name: wikipediaData?.title || "",
      bio: wikipediaData?.bio || null,
      birthYear: null,
      deathYear: null,
      dateOfBirth: null,
      dateOfDeath: null,
      nationality: null,
      profession: null,
      imageUrl: wikipediaData?.imageUrl || null,
      wikipediaUrl: wikipediaData?.wikipediaUrl || wikipediaUrlInput || null,
      wikidataId,
    }
  }

  return {
    name: wikidataData.name || wikipediaData?.title || "",
    bio: wikipediaData?.bio || wikidataData.bio || null,
    birthYear: wikidataData.birthYear,
    deathYear: wikidataData.deathYear,
    dateOfBirth: wikidataData.dateOfBirth,
    dateOfDeath: wikidataData.dateOfDeath,
    nationality: wikidataData.nationality,
    profession: wikidataData.profession,
    imageUrl: wikipediaData?.imageUrl || wikidataData.imageUrl,
    wikipediaUrl:
      wikipediaData?.wikipediaUrl ||
      wikidataData.wikipediaUrl ||
      wikipediaUrlInput ||
      null,
    wikidataId: wikidataData.wikidataId,
  }
}

export async function importAuthorFromWikiquote(payload: { wikiquoteUrl?: string }): Promise<ImportedAuthor> {
  const wikiquoteUrl = payload.wikiquoteUrl?.trim()
  if (!wikiquoteUrl) {
    throw new Error("Provide wikiquoteUrl")
  }

  const wikiquoteData = await fetchWikiquoteMetadata(wikiquoteUrl)
  if (wikiquoteData.wikidataId) {
    return importAuthorFromWikipediaOrWikidata({ wikidataId: wikiquoteData.wikidataId })
  }

  return importAuthorFromWikipediaOrWikidata({
    wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiquoteData.title.replace(/ /g, "_"))}`,
  })
}
