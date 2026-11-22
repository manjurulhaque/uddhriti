/**
 * AI Unstructured Text to Quotes Extractor
 *
 * Scans raw articles, book excerpts, transcripts, speeches, or unstructured notes
 * and extracts distinct, memorable, standalone quotations with author, source, category,
 * meaning, and balanced tags using Google Gemini AI.
 */

import { prisma } from "@/lib/prisma"
import { callGeminiGenerateContent } from "@/lib/gemini"
import { findMatchingDbAuthor, calculateSimilarity } from "./author-matcher"
import { balanceTagsToDistribution } from "./tag-selector"

export interface UnstructuredExtractInput {
  text: string
  hintAuthorName?: string | null
  hintSourceTitle?: string | null
  hintCategoryName?: string | null
  maxQuotes?: number
}

export interface ExtractedQuoteCandidate {
  id: string
  content: string
  authorName: string
  authorId: string | null
  isNewAuthor: boolean
  categoryName: string
  categoryId: string
  sourceTitle: string | null
  sourceType: string
  tags: string[]
  tagIds: string[]
  meaning: string | null
  confidence: number
}

export interface UnstructuredExtractResult {
  success: boolean
  provider: "gemini" | "heuristic"
  totalExtracted: number
  candidates: ExtractedQuoteCandidate[]
}

interface RawExtractedItem {
  content?: string
  authorName?: string
  sourceTitle?: string | null
  sourceType?: string
  category?: string
  tags?: string[]
  meaning?: string | null
  confidence?: number
}

export async function extractQuotesFromUnstructuredText(
  input: UnstructuredExtractInput
): Promise<UnstructuredExtractResult> {
  const rawText = input.text.trim()
  if (!rawText) {
    throw new Error("Input text cannot be empty for quote extraction")
  }

  // Safety cap input to prevent excessive token usage
  const boundedText = rawText.slice(0, 30_000)

  // 1. Fetch available taxonomy from database
  const [dbCategories, dbAuthors, dbTags] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.author.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        profession: true,
        nationality: true,
        birthYear: true,
        deathYear: true,
        quoteCount: true,
      },
      orderBy: { quoteCount: "desc" },
    }),
    prisma.tag.findMany({
      select: { id: true, name: true, slug: true, type: true },
    }),
  ])

  if (dbCategories.length === 0) {
    throw new Error("No categories found in database to map quotations")
  }

  const categoryNamesList = dbCategories.map((c) => c.name).join(", ")
  const maxQuotes = Math.min(Math.max(input.maxQuotes || 25, 1), 50)
  const apiKey = process.env.GEMINI_API_KEY?.trim()

  let rawItems: RawExtractedItem[] = []
  let provider: "gemini" | "heuristic" = "heuristic"

  if (apiKey) {
    const authorHintInstruction = input.hintAuthorName?.trim()
      ? `If the author is not explicitly stated per quote, default to: "${input.hintAuthorName.trim()}".`
      : `Detect the exact speaker or author for each quotation.`

    const sourceHintInstruction = input.hintSourceTitle?.trim()
      ? `If the primary work is not explicitly stated per quote, default to: "${input.hintSourceTitle.trim()}".`
      : `Identify the specific book, speech, essay, or publication title for each quotation where available.`

    const prompt = `You are an expert quotation anthologist and literary archivist.
Scan the following unstructured text (article, book excerpt, interview, or notes) and extract up to ${maxQuotes} distinct, standalone, memorable quotations.

Source Text:
"""
${boundedText}
"""

Guidelines:
- Extract ONLY genuine, insightful quotations (maxims, aphorisms, memorable thoughts, philosophical observations).
- Ignore casual conversational chatter, procedural remarks, narrative filler, or non-quotable text.
- Clean verbatim quotation text (strip leading/trailing quotation marks or bullet markers).
- ${authorHintInstruction}
- ${sourceHintInstruction}
- Available Categories: [${categoryNamesList}]

Return a valid JSON array of objects, each containing:
1. "content": Verbatim quotation text without quotation marks.
2. "authorName": Standard full canonical name of the speaker/author.
3. "sourceTitle": Specific title of the speech, book, poem, or publication, or null.
4. "sourceType": One of "BOOK", "SPEECH", "ARTICLE", "LETTER", "ESSAY", "POEM", "INTERVIEW", or "OTHER".
5. "category": The single best matching category strictly chosen from Available Categories.
6. "tags": Array of 3 to 5 lowercase thematic tags.
7. "meaning": 1 concise sentence summarizing the philosophical or psychological insight.
8. "confidence": Number between 0.0 and 1.0 representing extraction and attribution quality.

Return ONLY the raw JSON array. Do not wrap in markdown or backticks.`

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)

      const response = await callGeminiGenerateContent(apiKey, prompt, {
        temperature: 0.2,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed)) {
            rawItems = parsed
            provider = "gemini"
          }
        }
      }
    } catch (err) {
      console.warn("Unstructured text extraction Gemini call failed, falling back to heuristic parsing:", err)
    }
  }

  // Fallback heuristic extraction if Gemini is unavailable
  if (rawItems.length === 0) {
    const lines = boundedText.split(/\r?\n/).filter((l) => l.trim().length > 15)
    for (const line of lines.slice(0, maxQuotes)) {
      let clean = line
        .replace(/^[-*•\d.)\s]+/, "")
        .replace(/^["'“‘«]/, "")
        .replace(/["'”’»]$/, "")
        .trim()

      let author = input.hintAuthorName?.trim() || "Unknown"
      const authorMatch = clean.match(/\s+[-—–]\s+([^-—–]+)$/)
      if (authorMatch) {
        author = authorMatch[1].trim()
        clean = clean.replace(/\s+[-—–]\s+[^-—–]+$/, "").trim()
      }

      if (clean.length >= 15) {
        rawItems.push({
          content: clean,
          authorName: author,
          sourceTitle: input.hintSourceTitle?.trim() || null,
          sourceType: "OTHER",
          category: input.hintCategoryName?.trim() || dbCategories[0]?.name || "General",
          tags: ["wisdom", "reflection"],
          meaning: "A notable passage expressing thoughtful reflection.",
          confidence: 0.7,
        })
      }
    }
  }

  // 2. Map raw items to Database taxonomy
  const candidates: ExtractedQuoteCandidate[] = []

  for (let idx = 0; idx < rawItems.length; idx++) {
    const item = rawItems[idx]
    const content = (item.content || "").trim()
    if (!content || content.length < 10) continue

    // Resolve Author
    const rawAuthor = (item.authorName || input.hintAuthorName || "Unknown").trim()
    const dbAuthorMatch = findMatchingDbAuthor(rawAuthor, dbAuthors)
    const isMatched = Boolean(dbAuthorMatch && dbAuthorMatch.confidence >= 0.7)

    // Resolve Category
    const targetCat = (item.category || input.hintCategoryName || "").toLowerCase().trim()
    const foundCat =
      dbCategories.find((c) => c.name.toLowerCase() === targetCat) ||
      dbCategories.find((c) => c.slug.toLowerCase() === targetCat) ||
      dbCategories.find((c) => c.name.toLowerCase().includes(targetCat)) ||
      dbCategories[0]

    // Resolve Tags
    const itemTags = item.tags || []
    const matchedTagsWithScore = dbTags
      .map((tag) => {
        let score = 0
        const tagLower = tag.name.toLowerCase()
        for (const st of itemTags) {
          const sLower = st.toLowerCase().trim()
          if (tagLower === sLower) {
            score = 1.0
            break
          }
          const sim = calculateSimilarity(tagLower, sLower)
          if (sim > 0.8 && sim > score) {
            score = sim
          }
        }
        return { ...tag, score }
      })
      .filter((t) => t.score > 0.5)
      .sort((a, b) => b.score - a.score)

    const balancedTags = balanceTagsToDistribution(matchedTagsWithScore)

    candidates.push({
      id: `extracted-${idx + 1}-${Date.now().toString(36)}`,
      content,
      authorName: isMatched ? dbAuthorMatch!.name : rawAuthor,
      authorId: isMatched ? dbAuthorMatch!.id : null,
      isNewAuthor: !isMatched,
      categoryName: foundCat.name,
      categoryId: foundCat.id,
      sourceTitle: item.sourceTitle?.trim() || input.hintSourceTitle?.trim() || null,
      sourceType: (item.sourceType || "BOOK").toUpperCase(),
      tags: balancedTags.length > 0 ? balancedTags.map((t) => t.name) : itemTags.slice(0, 5),
      tagIds: balancedTags.map((t) => t.id),
      meaning: item.meaning?.trim() || null,
      confidence: item.confidence ?? 0.85,
    })
  }

  return {
    success: true,
    provider,
    totalExtracted: candidates.length,
    candidates,
  }
}
