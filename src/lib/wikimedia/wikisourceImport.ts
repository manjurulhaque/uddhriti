type ParsedWikisourceUrl = {
  host: string
  title: string
  normalizedUrl: string
  language: string
}

type ExtractedQuote = {
  content: string
  verified: boolean
  citation: string
}

function parseWikisourceUrl(input: string): ParsedWikisourceUrl | null {
  try {
    const url = new URL(input)
    if (!url.hostname.endsWith("wikisource.org")) {
      return null
    }

    const marker = "/wiki/"
    if (!url.pathname.startsWith(marker)) {
      return null
    }

    const title = decodeURIComponent(url.pathname.slice(marker.length)).trim()
    if (!title) return null

    const language = url.hostname.split(".")[0]?.toLowerCase() || "en"

    return {
      host: url.hostname,
      title,
      language,
      normalizedUrl: `${url.protocol}//${url.hostname}${url.pathname}`,
    }
  } catch {
    return null
  }
}

function cleanWikitextLine(input: string) {
  let value = input
  value = value.replace(/<!--[\s\S]*?-->/g, "")
  value = value.replace(/<ref[\s\S]*?<\/ref>/gi, "")
  value = value.replace(/<ref[^>]*\/>/gi, "")
  value = value.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
  value = value.replace(/\[\[([^\]]+)\]\]/g, "$1")
  value = value.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, "$2")
  value = value.replace(/\[(https?:\/\/[^\s\]]+)\]/g, "")
  value = value.replace(/<[^>]+>/g, "")
  value = value.replace(/''+/g, "")
  value = value.replace(/\s+/g, " ").trim()
  return value
}

function parseAuthorFromWikitext(wikitext: string) {
  const directMatch = wikitext.match(/\[\[\s*Author:([^|\]]+)/i)
  if (directMatch?.[1]) return directMatch[1].trim()

  const creatorMatch = wikitext.match(/\|\s*author\s*=\s*([^\n|]+)/i)
  if (creatorMatch?.[1]) return cleanWikitextLine(creatorMatch[1])

  return null
}

function extractPassages(wikitext: string, maxQuotes: number, verifiedOnly: boolean) {
  const lines = wikitext.split(/\r?\n/)
  const output: ExtractedQuote[] = []
  const seen = new Set<string>()
  let currentSection = "Text"

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const raw = lines[lineIndex].trim()
    if (!raw) continue

    const headingMatch = raw.match(/^==+\s*(.+?)\s*==+$/)
    if (headingMatch?.[1]) {
      currentSection = cleanWikitextLine(headingMatch[1]) || "Text"
      continue
    }

    if (
      raw.startsWith("{{") ||
      raw.startsWith("}}") ||
      raw.startsWith("{|") ||
      raw.startsWith("|}") ||
      raw.startsWith("[[Category:")
    ) {
      continue
    }

    const cleaned = cleanWikitextLine(raw)
    if (cleaned.length < 60 || cleaned.length > 320) continue
    if (!/[A-Za-z]/.test(cleaned)) continue
    if (!/[.!?;:]$/.test(cleaned)) continue

    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const citation = `${currentSection}, line ${lineIndex + 1}`
    const verified = Boolean(currentSection) || /\(\d{4}\)/.test(cleaned)
    if (verifiedOnly && !verified) continue

    output.push({
      content: cleaned,
      verified,
      citation,
    })

    if (output.length >= maxQuotes) break
  }

  return output
}

export async function importQuotesFromWikisourceUrl(input: {
  wikisourceUrl: string
  maxQuotesPerPage?: number
  verifiedOnly?: boolean
}) {
  const parsed = parseWikisourceUrl(input.wikisourceUrl)
  if (!parsed) {
    throw new Error("Invalid Wikisource URL")
  }

  const maxQuotesPerPage = Math.min(Math.max(input.maxQuotesPerPage ?? 80, 1), 200)

  const apiUrl =
    `https://${parsed.host}/w/api.php?action=query&format=json&redirects=1` +
    `&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(parsed.title)}`

  const res = await fetch(apiUrl, { cache: "no-store" })
  if (!res.ok) {
    throw new Error("Failed to fetch Wikisource page")
  }

  const data = await res.json()
  const pages = data?.query?.pages as Record<string, unknown> | undefined
  const firstPage = pages ? (Object.values(pages)[0] as Record<string, unknown>) : null
  if (!firstPage || (firstPage as { missing?: unknown }).missing !== undefined) {
    throw new Error("Wikisource page not found")
  }

  const revisions = firstPage.revisions as Array<{ slots?: { main?: { "*": unknown } } }> | undefined
  const content = revisions?.[0]?.slots?.main?.["*"]
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Wikisource page has no readable content")
  }

  const pageTitle = typeof firstPage.title === "string" ? firstPage.title : parsed.title
  const authorName = parseAuthorFromWikitext(content)
  const quotes = extractPassages(content, maxQuotesPerPage, input.verifiedOnly !== false)

  return {
    pageTitle,
    authorName,
    language: parsed.language || "en",
    wikisourceUrl: parsed.normalizedUrl,
    quotes,
  }
}

