import { prisma } from "@/lib/prisma"

export type SearchQuoteOptions = {
  limit?: number
  publishedOnly?: boolean
  categorySlug?: string
}

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
 * with cover-density ranking (ts_rank_cd) and fallback to ILIKE for stop-words
 * and metadata relations.
 *
 * Supports both admin searches and public searches (publishedOnly: true).
 * Returns an array of matching Quote UUIDs, or null if an error occurs.
 */
export async function searchQuoteIds(
  query: string,
  options?: number | SearchQuoteOptions
): Promise<string[] | null> {
  const cleanQuery = query.trim()
  if (!cleanQuery) return null

  const limit = typeof options === "number" ? options : (options?.limit ?? 500)
  const publishedOnly = typeof options === "object" ? Boolean(options?.publishedOnly) : false
  const categorySlug = typeof options === "object" && options?.categorySlug ? options.categorySlug : null

  const prefixTerms = sanitizeForTsquery(cleanQuery)

  try {
    if (prefixTerms) {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`
        WITH fts_matches AS (
          SELECT q.id,
                 ts_rank_cd(q."searchVector", to_tsquery('english', ${prefixTerms})) AS rank
          FROM "Quote" q
          WHERE q."deletedAt" IS NULL
            AND (${!publishedOnly} OR q.status = 'PUBLISHED')
            AND (${categorySlug === null} OR q."categorySlug" = ${categorySlug ?? ""})
            AND (
              q."searchVector" @@ to_tsquery('english', ${prefixTerms})
              OR q."searchVector" @@ websearch_to_tsquery('english', ${cleanQuery})
            )
        ),
        meta_matches AS (
          SELECT q.id, 0.05::float8 AS rank
          FROM "Quote" q
          WHERE q."deletedAt" IS NULL
            AND (${!publishedOnly} OR q.status = 'PUBLISHED')
            AND (${categorySlug === null} OR q."categorySlug" = ${categorySlug ?? ""})
            AND (
              EXISTS (SELECT 1 FROM "Category" c WHERE c.id = q."categoryId" AND c.name ILIKE ${`%${cleanQuery}%`})
              OR EXISTS (SELECT 1 FROM "Source" s WHERE s.id = q."sourceId" AND s.title ILIKE ${`%${cleanQuery}%`})
              OR EXISTS (SELECT 1 FROM "Author" a WHERE a.id = q."authorId" AND a.name ILIKE ${`%${cleanQuery}%`})
            )
        )
        SELECT id FROM (
          SELECT id, rank FROM fts_matches
          UNION ALL
          SELECT id, rank FROM meta_matches WHERE id NOT IN (SELECT id FROM fts_matches)
        ) combined
        ORDER BY rank DESC
        LIMIT ${limit};
      `
      if (rows.length > 0) {
        return rows.map((r) => r.id)
      }
    }

    // Fallback for queries consisting only of stop-words (e.g. "to be or not to be")
    const fallbackRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT q.id FROM "Quote" q
      WHERE q."deletedAt" IS NULL
        AND (${!publishedOnly} OR q.status = 'PUBLISHED')
        AND (${categorySlug === null} OR q."categorySlug" = ${categorySlug ?? ""})
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

/**
 * Searches quote IDs strictly within the published collection for public-facing surfaces.
 */
export async function searchPublicQuoteIds(
  query: string,
  options?: { limit?: number; categorySlug?: string }
): Promise<string[] | null> {
  return searchQuoteIds(query, {
    limit: options?.limit ?? 500,
    publishedOnly: true,
    categorySlug: options?.categorySlug,
  })
}
