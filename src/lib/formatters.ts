import { slugify } from "./slug"

/**
 * Utility functions for formatting numbers, currency, scores, units, and text strings.
 */

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  return new Intl.NumberFormat().format(value)
}

export function formatPercent(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "0%"
  return `${value.toFixed(decimals)}%`
}

export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return "0"
  return new Intl.NumberFormat(undefined, { notation: "compact" }).format(value)
}

export function formatScore(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "0.00"
  }
  return value.toFixed(decimals)
}

export function formatPlural(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`)
}

export function formatCountWithNoun(
  count: number,
  singular: string,
  plural?: string
): string {
  return `${formatNumber(count)} ${formatPlural(count, singular, plural)}`
}

export function truncateText(text: string, maxLength: number, suffix = "…"): string {
  if (!text || text.length <= maxLength) return text || ""
  return text.slice(0, maxLength).trimEnd() + suffix
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const size = bytes / Math.pow(1024, index)
  return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`
}

export function formatLifespan(
  birthYearOrAuthor?: number | { birthYear?: number | null; deathYear?: number | null } | null,
  maybeDeathYear?: number | null
): string | null {
  let birthYear: number | null | undefined
  let deathYear: number | null | undefined

  if (typeof birthYearOrAuthor === "object" && birthYearOrAuthor !== null) {
    birthYear = birthYearOrAuthor.birthYear
    deathYear = birthYearOrAuthor.deathYear
  } else {
    birthYear = birthYearOrAuthor
    deathYear = maybeDeathYear
  }

  if (birthYear && deathYear) {
    const b = birthYear < 0 ? `${Math.abs(birthYear)} BC` : `${birthYear}`
    const d = deathYear < 0 ? `${Math.abs(deathYear)} BC` : `${deathYear}`
    return `${b}–${d}`
  }
  if (birthYear) {
    return birthYear < 0 ? `b. ${Math.abs(birthYear)} BC` : `b. ${birthYear}`
  }
  return null
}

export function formatEpoch(birthYear?: number | null): string | null {
  if (birthYear === undefined || birthYear === null) return null
  if (birthYear < 500) return "Classical Antiquity"
  if (birthYear < 1400) return "Medieval & Mystical Era"
  if (birthYear < 1650) return "Renaissance & Early Modern"
  if (birthYear < 1800) return "Age of Enlightenment"
  if (birthYear < 1900) return "19th Century Romanticism"
  return "20th Century & Modern Era"
}

export function cleanProfession(profession?: string | null): string | null {
  if (!profession) return null
  const parts = profession.split(",").map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0]
  return `${parts[0]} & ${parts[1]}`
}

export function getAuthorInitials(name?: string | null): string {
  if (!name) return "U"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export { slugify }
