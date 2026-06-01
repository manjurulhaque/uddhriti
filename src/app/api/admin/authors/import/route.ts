import { NextResponse } from "next/server"
import { getAdmin } from "@/lib/auth/getAdmin"
import { importAuthorFromWikipediaOrWikidata, importAuthorFromWikiquote } from "@/lib/wikimedia/authorImport"
import { importAuthorFromOpenLibrary } from "@/lib/openlibrary/authorImport"
import { importAuthorFromViaf } from "@/lib/viaf/authorImport"
import { importAuthorFromLocAuthority } from "@/lib/loc/authorImport"

type Provider = "wikimedia" | "wikiquote" | "openlibrary" | "viaf" | "loc" | "auto"

type ImportRequestPayload = {
  wikipediaUrl?: string
  wikidataId?: string
  wikiquoteUrl?: string
  openLibraryUrl?: string
  openLibraryId?: string
  viafUrl?: string
  viafId?: string
  locAuthorityUrl?: string
  locAuthorityId?: string
  name?: string
  provider?: Provider
}

function parseWikidataIdFromUrl(input?: string) {
  const value = trimToUndefined(input)
  if (!value) return undefined

  try {
    const url = new URL(value)
    if (!url.hostname.toLowerCase().endsWith("wikidata.org")) return undefined

    const pathMatch = url.pathname.match(/\/wiki\/(Q\d+)\/?$/i)
    if (pathMatch) return pathMatch[1].toUpperCase()

    const title = url.searchParams.get("title")
    if (title && /^Q\d+$/i.test(title.trim())) {
      return title.trim().toUpperCase()
    }
  } catch {
    return undefined
  }

  return undefined
}

function trimToUndefined(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function inferProviderFromUrl(input?: string): Exclude<Provider, "auto"> | null {
  const value = trimToUndefined(input)
  if (!value) return null

  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()

    if (host.endsWith("wikiquote.org")) return "wikiquote"
    if (host.endsWith("wikipedia.org") || host.endsWith("wikidata.org")) return "wikimedia"
    if (host === "openlibrary.org") return "openlibrary"
    if (host === "viaf.org") return "viaf"
    if (host === "id.loc.gov") return "loc"
  } catch {
    return null
  }

  return null
}

function normalizePayload(raw: ImportRequestPayload): ImportRequestPayload {
  const payload: ImportRequestPayload = {
    wikipediaUrl: trimToUndefined(raw.wikipediaUrl),
    wikidataId: trimToUndefined(raw.wikidataId),
    wikiquoteUrl: trimToUndefined(raw.wikiquoteUrl),
    openLibraryUrl: trimToUndefined(raw.openLibraryUrl),
    openLibraryId: trimToUndefined(raw.openLibraryId),
    viafUrl: trimToUndefined(raw.viafUrl),
    viafId: trimToUndefined(raw.viafId),
    locAuthorityUrl: trimToUndefined(raw.locAuthorityUrl),
    locAuthorityId: trimToUndefined(raw.locAuthorityId),
    name: trimToUndefined(raw.name),
    provider: raw.provider,
  }

  const wikipediaFieldProvider = inferProviderFromUrl(payload.wikipediaUrl)
  if (wikipediaFieldProvider === "wikiquote" && !payload.wikiquoteUrl) {
    payload.wikiquoteUrl = payload.wikipediaUrl
    payload.wikipediaUrl = undefined
  } else if (wikipediaFieldProvider === "wikimedia") {
    const wikidataId = parseWikidataIdFromUrl(payload.wikipediaUrl)
    if (wikidataId && !payload.wikidataId) {
      payload.wikidataId = wikidataId
      payload.wikipediaUrl = undefined
    }
  } else if (wikipediaFieldProvider === "openlibrary" && !payload.openLibraryUrl) {
    payload.openLibraryUrl = payload.wikipediaUrl
    payload.wikipediaUrl = undefined
  } else if (wikipediaFieldProvider === "viaf" && !payload.viafUrl) {
    payload.viafUrl = payload.wikipediaUrl
    payload.wikipediaUrl = undefined
  } else if (wikipediaFieldProvider === "loc" && !payload.locAuthorityUrl) {
    payload.locAuthorityUrl = payload.wikipediaUrl
    payload.wikipediaUrl = undefined
  }

  return payload
}

function resolveProvider(payload: ImportRequestPayload): Provider {
  if (payload.provider && payload.provider !== "auto") {
    return payload.provider
  }

  return (
    inferProviderFromUrl(payload.locAuthorityUrl) ||
    inferProviderFromUrl(payload.viafUrl) ||
    inferProviderFromUrl(payload.openLibraryUrl) ||
    inferProviderFromUrl(payload.wikiquoteUrl) ||
    inferProviderFromUrl(payload.wikipediaUrl) ||
    (payload.locAuthorityId ? "loc" : null) ||
    (payload.viafId ? "viaf" : null) ||
    (payload.openLibraryId ? "openlibrary" : null) ||
    (payload.wikiquoteUrl ? "wikiquote" : null) ||
    (payload.wikipediaUrl || payload.wikidataId ? "wikimedia" : null) ||
    "auto"
  )
}

export async function POST(req: Request) {
  const admin = await getAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: ImportRequestPayload
  try {
    payload = normalizePayload((await req.json()) as ImportRequestPayload)
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  try {
    const provider = resolveProvider(payload)
    const hasWikiquoteInput = Boolean(payload.wikiquoteUrl)
    const hasOpenLibraryInput = Boolean(payload.openLibraryUrl) || Boolean(payload.openLibraryId)
    const hasViafInput = Boolean(payload.viafUrl) || Boolean(payload.viafId)
    const hasLocInput = Boolean(payload.locAuthorityUrl) || Boolean(payload.locAuthorityId)
    const canSearchByName = Boolean(payload.name)

    let imported
    if (provider === "openlibrary") {
      imported = await importAuthorFromOpenLibrary(payload)
    } else if (provider === "viaf") {
      imported = await importAuthorFromViaf(payload)
    } else if (provider === "loc") {
      imported = await importAuthorFromLocAuthority(payload)
    } else if (provider === "wikiquote") {
      imported = await importAuthorFromWikiquote(payload)
    } else if (provider === "wikimedia") {
      imported = await importAuthorFromWikipediaOrWikidata(payload)
    } else {
      try {
        if (hasWikiquoteInput) {
          imported = await importAuthorFromWikiquote(payload)
        } else {
          imported = await importAuthorFromWikipediaOrWikidata(payload)
        }
      } catch (error) {
        if (hasOpenLibraryInput || canSearchByName) {
          try {
            imported = await importAuthorFromOpenLibrary(payload)
          } catch {
            if (hasViafInput) {
              try {
                imported = await importAuthorFromViaf(payload)
              } catch {
                if (!(hasLocInput || canSearchByName)) throw error
                imported = await importAuthorFromLocAuthority(payload)
              }
            } else if (hasLocInput || canSearchByName) {
              imported = await importAuthorFromLocAuthority(payload)
            } else {
              throw error
            }
          }
        } else if (hasViafInput) {
          try {
            imported = await importAuthorFromViaf(payload)
          } catch {
            if (!(hasLocInput || canSearchByName)) throw error
            imported = await importAuthorFromLocAuthority(payload)
          }
        } else if (hasLocInput || canSearchByName) {
          imported = await importAuthorFromLocAuthority(payload)
        } else {
          throw error
        }
      }
    }

    return NextResponse.json(imported)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
