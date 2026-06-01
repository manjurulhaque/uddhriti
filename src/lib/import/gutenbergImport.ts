type ParsedGutenbergUrl = {
  bookId: number
  normalizedUrl: string
}

type GutendexBook = {
  id: number
  title?: string
  authors?: Array<{ name?: string }>
  languages?: string[]
  formats?: Record<string, string>
}

type ExtractedQuote = {
  content: string
  verified: boolean
  citation: string
}

function parseGutenbergUrl(input: string): ParsedGutenbergUrl | null {
  try {
    const url = new URL(input)
    const host = url.hostname.toLowerCase()
    if (!host.endsWith("gutenberg.org")) return null

    const pathname = url.pathname
    const patterns = [
      /\/ebooks\/(\d+)/,
      /\/files\/(\d+)/,
      /\/epub\/(\d+)/,
      /\/cache\/epub\/(\d+)/,
      /\/(\d+)(?:-\d+)?\.txt/i,
    ]

    for (const pattern of patterns) {
      const match = pathname.match(pattern)
      if (!match) continue
      const bookId = Number(match[1])
      if (!Number.isFinite(bookId) || bookId <= 0) return null
      return {
        bookId,
        normalizedUrl: `https://www.gutenberg.org/ebooks/${bookId}`,
      }
    }

    return null
  } catch {
    return null
  }
}

async function fetchBookMetadata(bookId: number) {
  const res = await fetch(`https://gutendex.com/books/${bookId}`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error("Failed to fetch Gutenberg metadata")
  }

  const data = (await res.json()) as GutendexBook
  if (!data || typeof data.id !== "number") {
    throw new Error("Gutenberg book not found")
  }

  return data
}

function pickPlainTextUrl(formats: Record<string, string> | undefined) {
  if (!formats) return null
  const keys = Object.keys(formats)
  const preferred = keys.find((k) => k.startsWith("text/plain; charset=utf-8"))
    || keys.find((k) => k.startsWith("text/plain; charset=us-ascii"))
    || keys.find((k) => k.startsWith("text/plain"))
  if (!preferred) return null
  return formats[preferred]
}

async function fetchBookText(textUrl: string) {
  const res = await fetch(textUrl, { cache: "no-store" })
  if (!res.ok) {
    throw new Error("Failed to fetch Gutenberg text")
  }
  return res.text()
}

function stripGutenbergBoilerplate(text: string) {
  const normalized = text.replace(/\r\n/g, "\n")
  const startPattern = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i
  const endPattern = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i

  const startMatch = normalized.match(startPattern)
  const endMatch = normalized.match(endPattern)

  const startIndex = startMatch ? startMatch.index! + startMatch[0].length : 0
  const endIndex = endMatch ? endMatch.index! : normalized.length
  return normalized.slice(startIndex, endIndex).trim()
}

function cleanQuote(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, "")
    .trim()
}

function extractQuotedPassages(text: string, maxQuotes: number) {
  const output: ExtractedQuote[] = []
  const seen = new Set<string>()

  const lines = text.split("\n")
  const quoteRegex = /"([^"\n]{40,320})"|“([^”\n]{40,320})”/g

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]
    let match: RegExpExecArray | null
    while ((match = quoteRegex.exec(line))) {
      const raw = match[1] || match[2] || ""
      const content = cleanQuote(raw)
      if (content.length < 40 || content.length > 320) continue
      if (!/[A-Za-z]/.test(content)) continue
      if (!/[.!?]$/.test(content)) continue

      const key = content.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      output.push({
        content,
        verified: true,
        citation: `Line ${lineIndex + 1}`,
      })

      if (output.length >= maxQuotes) return output
    }
  }

  return output
}

export async function importQuotesFromGutenbergUrl(input: {
  gutenbergUrl: string
  maxQuotesPerPage?: number
}) {
  const parsed = parseGutenbergUrl(input.gutenbergUrl)
  if (!parsed) {
    throw new Error("Invalid Gutenberg URL")
  }

  const maxQuotesPerPage = Math.min(Math.max(input.maxQuotesPerPage ?? 80, 1), 200)
  const metadata = await fetchBookMetadata(parsed.bookId)
  const textUrl = pickPlainTextUrl(metadata.formats)
  if (!textUrl) {
    throw new Error("No plain text format found for this Gutenberg title")
  }

  const rawText = await fetchBookText(textUrl)
  const text = stripGutenbergBoilerplate(rawText)
  const quotes = extractQuotedPassages(text, maxQuotesPerPage)

  const authorName = metadata.authors?.[0]?.name?.trim() || null
  const language = metadata.languages?.[0]?.trim().toLowerCase() || "en"
  const pageTitle = metadata.title?.trim() || `Project Gutenberg #${parsed.bookId}`

  return {
    pageTitle,
    authorName,
    language,
    gutenbergUrl: parsed.normalizedUrl,
    quotes,
  }
}

