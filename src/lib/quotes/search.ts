import { prisma } from "@/lib/prisma"

/**
 * Sanitizes user input into a PostgreSQL prefix tsquery string.
 * e.g., "rumi love" -> "rumi:* & love:*"
 */
export function sanitizeForTsquery(query: string): string | null {
  const words = query
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
  if (words.length === 0) return null
  return words.map((w) => `${w}:*`).join(" & ")
}

/**
 * Searches quote IDs using the PostgreSQL GIN index on "searchVector"
 * with fallback to ILIKE for stop-words and metadata relations.
 *
 * Returns an array of matching Quote UUIDs, or null if an error occurs.
 */
export async function searchQuoteIds(query: string, limit = 500): Promise<string[] | null> {
  const cleanQuery = query.trim()
  if (!cleanQuery) return null

  const prefixTerms = sanitizeForTsquery(cleanQuery)

  try {
    if (prefixTerms) {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`
        WITH fts_matches AS (
          SELECT id FROM "Quote"
          WHERE "deletedAt" IS NULL
            AND (
              "searchVector" @@ to_tsquery('english', ${prefixTerms})
              OR "searchVector" @@ websearch_to_tsquery('english', ${cleanQuery})
            )
        ),
        meta_matches AS (
          SELECT q.id FROM "Quote" q
          WHERE q."deletedAt" IS NULL
            AND (
              EXISTS (SELECT 1 FROM "Category" c WHERE c.id = q."categoryId" AND c.name ILIKE ${`%${cleanQuery}%`})
              OR EXISTS (SELECT 1 FROM "Source" s WHERE s.id = q."sourceId" AND s.title ILIKE ${`%${cleanQuery}%`})
              OR EXISTS (SELECT 1 FROM "Author" a WHERE a.id = q."authorId" AND a.name ILIKE ${`%${cleanQuery}%`})
            )
        )
        SELECT id FROM fts_matches
        UNION
        SELECT id FROM meta_matches
        LIMIT ${limit};
      `
      if (rows.length > 0) {
        return rows.map((r) => r.id)
      }
    }

    // Fallback for queries consisting only of stop-words (e.g. "don't", "to be or not to be")
    const fallbackRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT q.id FROM "Quote" q
      WHERE q."deletedAt" IS NULL
        AND (
          q.content ILIKE ${`%${cleanQuery}%`}
          OR q."authorName" ILIKE ${`%${cleanQuery}%`}
          OR EXISTS (SELECT 1 FROM "Category" c WHERE c.id = q."categoryId" AND c.name ILIKE ${`%${cleanQuery}%`})
          OR EXISTS (SELECT 1 FROM "Source" s WHERE s.id = q."sourceId" AND s.title ILIKE ${`%${cleanQuery}%`})
          OR EXISTS (SELECT 1 FROM "Author" a WHERE a.id = q."authorId" AND a.name ILIKE ${`%${cleanQuery}%`})
        )
      LIMIT ${limit};
    `
    return fallbackRows.map((r) => r.id)
  } catch (error) {
    console.error("[Quote FTS Search Error, falling back to ILIKE]", error)
    return null
  }
}

