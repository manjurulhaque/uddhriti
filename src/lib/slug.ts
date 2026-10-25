/**
 * Standard utility for generating URL-safe slugs across entities.
 *
 * Normalizes input by:
 * - Converting to lowercase
 * - Trimming whitespace
 * - Stripping non-alphanumeric, non-whitespace, non-hyphen characters
 * - Converting whitespace runs to hyphens
 * - Collapsing multiple consecutive hyphens
 * - Trimming leading/trailing hyphens
 */
export function slugify(text: string): string {
  if (!text) return ""

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}
