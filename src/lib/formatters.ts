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

export interface CategoryMeta {
  icon: string
  gradient: string
  border: string
  badge: string
}

export function getCategoryMeta(name: string): CategoryMeta {
  const lower = name.toLowerCase()
  if (lower.includes("philosoph")) {
    return { icon: "🌌", gradient: "from-indigo-500/10 via-purple-500/5 to-transparent", border: "border-indigo-500/25", badge: "text-indigo-800 bg-indigo-50" }
  }
  if (lower.includes("friend")) {
    return { icon: "🤝", gradient: "from-amber-500/10 via-orange-500/5 to-transparent", border: "border-amber-500/25", badge: "text-amber-800 bg-amber-50" }
  }
  if (lower.includes("love")) {
    return { icon: "🤍", gradient: "from-pink-500/10 via-rose-500/5 to-transparent", border: "border-pink-500/25", badge: "text-pink-800 bg-pink-50" }
  }
  if (lower.includes("polit") || lower.includes("freedom") || lower.includes("libert")) {
    return { icon: "🏛️", gradient: "from-blue-500/10 via-sky-500/5 to-transparent", border: "border-blue-500/25", badge: "text-blue-800 bg-blue-50" }
  }
  if (lower.includes("positiv") || lower.includes("hope") || lower.includes("happ")) {
    return { icon: "🌅", gradient: "from-yellow-500/10 via-amber-500/5 to-transparent", border: "border-yellow-500/25", badge: "text-yellow-800 bg-yellow-50" }
  }
  if (lower.includes("fail") || lower.includes("resilien") || lower.includes("courag")) {
    return { icon: "⚡", gradient: "from-orange-500/10 via-amber-500/5 to-transparent", border: "border-orange-500/25", badge: "text-orange-800 bg-orange-50" }
  }
  if (lower.includes("sad") || lower.includes("grief") || lower.includes("solac")) {
    return { icon: "🕯️", gradient: "from-slate-500/10 via-stone-500/5 to-transparent", border: "border-slate-500/25", badge: "text-slate-800 bg-slate-50" }
  }
  if (lower.includes("attitud") || lower.includes("mind") || lower.includes("grow")) {
    return { icon: "🎯", gradient: "from-emerald-500/10 via-teal-500/5 to-transparent", border: "border-emerald-500/25", badge: "text-emerald-800 bg-emerald-50" }
  }
  if (lower.includes("time") || lower.includes("histor")) {
    return { icon: "⏳", gradient: "from-amber-600/10 via-stone-500/5 to-transparent", border: "border-amber-700/25", badge: "text-amber-900 bg-amber-50" }
  }
  return { icon: "📜", gradient: "from-stone-500/10 via-amber-500/5 to-transparent", border: "border-stone-300", badge: "text-stone-800 bg-stone-100" }
}

export { slugify }
