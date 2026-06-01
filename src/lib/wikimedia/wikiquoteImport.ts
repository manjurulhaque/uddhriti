type ParsedWikiquoteUrl = {
  host: string
  title: string
  normalizedUrl: string
}

function parseWikiquoteUrl(input: string): ParsedWikiquoteUrl | null {
  try {
    const url = new URL(input)
    if (!url.hostname.endsWith("wikiquote.org")) {
      return null
    }

    const marker = "/wiki/"
    if (!url.pathname.startsWith(marker)) {
      return null
    }

    const title = decodeURIComponent(url.pathname.slice(marker.length)).trim()
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

function removeTemplates(input: string) {
  let output = ""
  let depth = 0

  for (let i = 0; i < input.length; i += 1) {
    const curr = input[i]
    const next = input[i + 1]

    if (curr === "{" && next === "{") {
      depth += 1
      i += 1
      continue
    }
    if (curr === "}" && next === "}" && depth > 0) {
      depth -= 1
      i += 1
      continue
    }

    if (depth === 0) {
      output += curr
    }
  }

  return output
}

function decodeEntities(input: string) {
  return input
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ")
}

function cleanWikitextLine(input: string) {
  let value = input
  value = value.replace(/<!--[\s\S]*?-->/g, "")
  value = value.replace(/<ref[\s\S]*?<\/ref>/gi, "")
  value = value.replace(/<ref[^>]*\/>/gi, "")
  value = removeTemplates(value)
  value = value.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
  value = value.replace(/\[\[([^\]]+)\]\]/g, "$1")
  value = value.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, "$2")
  value = value.replace(/\[(https?:\/\/[^\s\]]+)\]/g, "")
  value = value.replace(/<[^>]+>/g, "")
  value = value.replace(/''+/g, "")
  value = decodeEntities(value)
  value = value.replace(/\s+/g, " ").trim()
  return value
}

function titleToAuthorName(title: string) {
  const withoutNamespace = title.includes(":") ? title.split(":").slice(1).join(":") : title
  return withoutNamespace.replaceAll("_", " ").trim()
}

type ExtractedQuote = {
  content: string
  verified: boolean
}

function isAttributionSubBullet(line: string) {
  const trimmed = line.trim()
  if (!/^\*+(?:\s*[:#*])/.test(trimmed)) return false
  const cleaned = cleanWikitextLine(trimmed.replace(/^\*+(?:\s*[:#*])+\s*/, ""))
  if (!cleaned) return false
  return cleaned.length >= 4
}

function hasInlineCitation(line: string) {
  return /<ref[\s>]/i.test(line) || /\[\d+\]$/.test(line.trim()) || /\(\d{4}\)/.test(line)
}

function extractQuoteLines(wikitext: string, maxQuotes: number, verifiedOnly: boolean) {
  const results: ExtractedQuote[] = []
  const seen = new Set<string>()
  const lines = wikitext.split(/\r?\n/)

  for (let idx = 0; idx < lines.length; idx += 1) {
    const rawLine = lines[idx]
    const line = rawLine.trim()
    if (!line.startsWith("*")) continue
    if (line.startsWith("*:") || line.startsWith("*#")) continue

    const withoutBullets = line.replace(/^\*+\s*/, "")
    if (!withoutBullets || withoutBullets.startsWith("=")) continue

    const cleaned = cleanWikitextLine(withoutBullets)
    if (cleaned.length < 8) continue
    if (!/[A-Za-z]/.test(cleaned)) continue

    const dedupeKey = cleaned.toLowerCase()
    if (seen.has(dedupeKey)) continue

    const nextLine = lines[idx + 1] ?? ""
    const verified = hasInlineCitation(rawLine) || isAttributionSubBullet(nextLine)
    if (verifiedOnly && !verified) continue

    seen.add(dedupeKey)
    results.push({ content: cleaned, verified })

    if (results.length >= maxQuotes) break
  }

  return results
}

export async function importQuotesFromWikiquoteUrl(input: {
  wikiquoteUrl: string
  maxQuotesPerPage?: number
  verifiedOnly?: boolean
}) {
  const parsed = parseWikiquoteUrl(input.wikiquoteUrl)
  if (!parsed) {
    throw new Error("Invalid Wikiquote URL")
  }

  const maxQuotesPerPage = Math.min(Math.max(input.maxQuotesPerPage ?? 80, 1), 200)

  const apiUrl =
    `https://${parsed.host}/w/api.php?action=query&format=json&redirects=1` +
    `&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(parsed.title)}`

  const res = await fetch(apiUrl, { cache: "no-store" })
  if (!res.ok) {
    throw new Error("Failed to fetch Wikiquote page")
  }

  const data = await res.json()
  const pages = data?.query?.pages as Record<string, unknown> | undefined
  const firstPage = pages ? (Object.values(pages)[0] as Record<string, unknown>) : null
  if (!firstPage || (firstPage as { missing?: unknown }).missing !== undefined) {
    throw new Error("Wikiquote page not found")
  }

  const revisions = firstPage.revisions as
    | Array<{
        slots?: {
          main?: {
            "*": unknown
            content?: unknown
          }
        }
      }>
    | undefined
  const content = revisions?.[0]?.slots?.main?.["*"] ?? revisions?.[0]?.slots?.main?.content
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Wikiquote page has no readable content")
  }

  const pageTitle = typeof firstPage.title === "string" ? firstPage.title : parsed.title
  const authorName = titleToAuthorName(pageTitle)
  const quotes = extractQuoteLines(content, maxQuotesPerPage, input.verifiedOnly !== false)

  return {
    pageTitle,
    authorName,
    wikiquoteUrl: parsed.normalizedUrl,
    quotes,
  }
}
