import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/api/admin-auth"
import { fetchWithTimeout } from "@/lib/security/fetch"
import { normalizeWikimediaThumbnailUrl } from "@/lib/wikimedia/authorImport"

export type WikipediaCandidate = {
  title: string
  snippet: string
  wikipediaUrl: string
  wikidataId?: string | null
  thumbnailUrl?: string | null
}

interface WikiPageItem {
  pageid?: number
  title?: string
  extract?: string
  fullurl?: string
  pageprops?: { wikibase_item?: string }
  thumbnail?: { source?: string; width?: number; height?: number }
}

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin()
  if (response) return response

  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json({ candidates: [] })
  }

  try {
    // 1. Query Wikipedia Search with page images and summary extracts
    const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query
    )}&gsrlimit=6&prop=pageimages|extracts|info|pageprops&ppprop=wikibase_item&inprop=url&exintro=1&explaintext=1&exchars=240&piprop=thumbnail&pithumbsize=240&format=json&origin=*`

    const res = await fetchWithTimeout(
      wikiSearchUrl,
      {
        headers: {
          "User-Agent": "QuotzenBot/1.0 (https://quotzen.com; admin-import@quotzen.com)",
        },
      },
      10_000
    )

    if (!res.ok) {
      return NextResponse.json({ candidates: [] })
    }

    const data = await res.json()
    const pages = data?.query?.pages

    if (!pages || typeof pages !== "object") {
      return NextResponse.json({ candidates: [] })
    }

    const candidates: WikipediaCandidate[] = Object.values(pages as Record<string, WikiPageItem>).map((p) => ({
      title: p.title || "",
      snippet: p.extract ? p.extract.replace(/\n+/g, " ").trim() : "",
      wikipediaUrl: p.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent((p.title || "").replace(/ /g, "_"))}`,
      wikidataId: p.pageprops?.wikibase_item || null,
      thumbnailUrl: normalizeWikimediaThumbnailUrl(p.thumbnail?.source || null),
    }))

    // Sort by relevance / presence of thumbnail or length of snippet
    candidates.sort((a, b) => {
      const aScore = (a.thumbnailUrl ? 2 : 0) + (a.wikidataId ? 1 : 0)
      const bScore = (b.thumbnailUrl ? 2 : 0) + (b.wikidataId ? 1 : 0)
      return bScore - aScore
    })

    return NextResponse.json({ candidates })
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      console.warn(`[search-wikipedia] Wikipedia search request timed out for query: "${query}"`)
    } else {
      console.error("[search-wikipedia] Error fetching Wikipedia candidates:", error)
    }
    return NextResponse.json({ candidates: [] })
  }
}
