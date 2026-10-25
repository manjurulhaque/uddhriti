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

export { slugify }
