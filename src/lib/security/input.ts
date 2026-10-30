/**
 * Security & Input Hygiene Utilities
 *
 * Protects database queries against resource-exhaustion, deep pagination scans,
 * and malformed parameter injection.
 */

const CONTROL_CHARS_REGEX = /[\x00-\x1f\x7f]/g
const REPEATED_WHITESPACE_REGEX = /\s+/g
const PATH_TRAVERSAL_REGEX = /(\.\.|\/|\\)/g

/**
 * Sanitizes and bounds public search inputs to mitigate database query DoS
 * (e.g. expensive ILIKE '%...%' pattern matching across large collections).
 *
 * - Strips ASCII control characters (\x00-\x1f, \x7f)
 * - Collapses repeated whitespace
 * - Trims leading and trailing spaces
 * - Enforces an upper length ceiling (default 100 characters)
 */
export function sanitizeSearchQuery(query?: string | null, maxLength = 100): string {
  if (!query || typeof query !== "string") {
    return ""
  }

  const cleaned = query
    .replace(CONTROL_CHARS_REGEX, "")
    .replace(REPEATED_WHITESPACE_REGEX, " ")
    .trim()

  if (cleaned.length <= maxLength) {
    return cleaned
  }

  return cleaned.slice(0, maxLength).trim()
}

/**
 * Parses and bounds pagination page numbers to prevent deep pagination
 * resource-exhaustion attacks (e.g. ?page=9999999 causing multi-million row skips).
 *
 * - Parses as integer base-10
 * - Clamps minimum to 1
 * - Clamps maximum to maxPage (default 500)
 * - Always returns a safe finite integer
 */
export function parseSafePageNumber(
  page?: string | number | null,
  maxPage = 500
): number {
  if (page === null || page === undefined || page === "") {
    return 1
  }

  const rawNumber = typeof page === "number" ? page : Number.parseInt(String(page).trim(), 10)

  if (!Number.isFinite(rawNumber) || Number.isNaN(rawNumber) || rawNumber < 1) {
    return 1
  }

  return Math.min(Math.floor(rawNumber), maxPage)
}

/**
 * Validates and bounds route slugs against oversized inputs and path-traversal sequences.
 */
export function sanitizeSlug(slug?: string | null, maxLength = 150): string {
  if (!slug || typeof slug !== "string") {
    return ""
  }

  const cleaned = slug
    .replace(CONTROL_CHARS_REGEX, "")
    .replace(PATH_TRAVERSAL_REGEX, "")
    .trim()

  if (cleaned.length <= maxLength) {
    return cleaned
  }

  return cleaned.slice(0, maxLength).trim()
}

