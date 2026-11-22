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

export function formatDateOfRecord(date?: Date | string | null): string | null {
  if (!date) return null
  try {
    const d = typeof date === "string" ? new Date(date) : date
    if (isNaN(d.getTime())) return null
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(d)
  } catch {
    return null
  }
}

export function formatWorkType(type: string): string {
  switch (type.toUpperCase()) {
    case "BOOK":
      return "Book"
    case "SPEECH":
      return "Speech / Address"
    case "ARTICLE":
      return "Essay / Article"
    case "INTERVIEW":
      return "Interview"
    case "SCRIPTURE":
      return "Sacred Text"
    case "LETTER":
      return "Letter / Epistle"
    default:
      return "Literary Work"
  }
}

export interface CategoryMeta {
  icon: string
  gradient: string
  border: string
  badge: string
}

export function getCategoryMeta(name: string): CategoryMeta {
  const lower = name.toLowerCase()

  // 1. Self Love (must precede generic love)
  if (lower.includes("self love") || lower.includes("self-love")) {
    return {
      icon: "🪞",
      gradient: "from-rose-400/10 via-pink-400/5 to-transparent",
      border: "border-rose-400/25",
      badge: "text-rose-900 bg-rose-50",
    }
  }

  // 2. Love & Devotion
  if (lower.includes("love") || lower.includes("romance") || lower.includes("passion")) {
    return {
      icon: "🤍",
      gradient: "from-pink-500/10 via-rose-500/5 to-transparent",
      border: "border-pink-500/25",
      badge: "text-pink-800 bg-pink-50",
    }
  }

  // 3. Wisdom & Insight
  if (lower.includes("wisdom") || lower.includes("sage") || lower.includes("discern")) {
    return {
      icon: "🦉",
      gradient: "from-amber-500/10 via-yellow-500/5 to-transparent",
      border: "border-amber-500/25",
      badge: "text-amber-900 bg-amber-50",
    }
  }

  // 4. Life & Being
  if (lower.includes("life") || lower.includes("living") || lower.includes("exist")) {
    return {
      icon: "🌱",
      gradient: "from-emerald-500/10 via-green-500/5 to-transparent",
      border: "border-emerald-500/25",
      badge: "text-emerald-900 bg-emerald-50",
    }
  }

  // 5. Education & Learning
  if (lower.includes("educat") || lower.includes("learn") || lower.includes("school") || lower.includes("teach")) {
    return {
      icon: "📚",
      gradient: "from-blue-500/10 via-sky-500/5 to-transparent",
      border: "border-blue-500/25",
      badge: "text-blue-900 bg-blue-50",
    }
  }

  // 6. Leadership & Governance
  if (lower.includes("leader") || lower.includes("rule") || lower.includes("governan")) {
    return {
      icon: "👑",
      gradient: "from-yellow-600/10 via-amber-500/5 to-transparent",
      border: "border-yellow-600/25",
      badge: "text-yellow-950 bg-yellow-50",
    }
  }

  // 7. Success & Triumph
  if (lower.includes("success") || lower.includes("achiev") || lower.includes("triumph") || lower.includes("victor")) {
    return {
      icon: "🏆",
      gradient: "from-amber-400/10 via-orange-400/5 to-transparent",
      border: "border-amber-400/25",
      badge: "text-amber-900 bg-amber-50",
    }
  }

  // 8. Motivation & Inner Fire
  if (lower.includes("motivat") || lower.includes("ambiti") || lower.includes("drive")) {
    return {
      icon: "🔥",
      gradient: "from-rose-500/10 via-orange-500/5 to-transparent",
      border: "border-rose-500/25",
      badge: "text-rose-900 bg-rose-50",
    }
  }

  // 9. Inspiration & Wonder
  if (lower.includes("inspir") || lower.includes("wonder") || lower.includes("vision")) {
    return {
      icon: "✨",
      gradient: "from-violet-500/10 via-fuchsia-500/5 to-transparent",
      border: "border-violet-500/25",
      badge: "text-violet-900 bg-violet-50",
    }
  }

  // 10. Humor & Wit
  if (lower.includes("humor") || lower.includes("wit") || lower.includes("laugh") || lower.includes("satir") || lower.includes("iron")) {
    return {
      icon: "🎭",
      gradient: "from-orange-400/10 via-amber-300/5 to-transparent",
      border: "border-orange-400/25",
      badge: "text-orange-900 bg-orange-50",
    }
  }

  // 11. Ethics & Morality
  if (lower.includes("ethic") || lower.includes("moral") || lower.includes("justic") || lower.includes("virtu")) {
    return {
      icon: "⚖️",
      gradient: "from-slate-600/10 via-zinc-500/5 to-transparent",
      border: "border-slate-500/25",
      badge: "text-slate-900 bg-slate-50",
    }
  }

  // 12. Faith & Spirituality
  if (lower.includes("faith") || lower.includes("religi") || lower.includes("spirit") || lower.includes("prayer") || lower.includes("god")) {
    return {
      icon: "🕊️",
      gradient: "from-sky-500/10 via-indigo-500/5 to-transparent",
      border: "border-sky-500/25",
      badge: "text-sky-900 bg-sky-50",
    }
  }

  // 13. Family & Hearth
  if (lower.includes("famil") || lower.includes("parent") || lower.includes("child") || lower.includes("home") || lower.includes("mother") || lower.includes("father")) {
    return {
      icon: "🏡",
      gradient: "from-amber-700/10 via-stone-500/5 to-transparent",
      border: "border-amber-700/25",
      badge: "text-amber-950 bg-amber-50",
    }
  }

  // 14. Happiness & Joy
  if (lower.includes("happ") || lower.includes("joy") || lower.includes("delight") || lower.includes("cheer")) {
    return {
      icon: "☀️",
      gradient: "from-amber-400/10 via-yellow-400/5 to-transparent",
      border: "border-amber-400/25",
      badge: "text-amber-900 bg-amber-50",
    }
  }

  // 15. Philosophy & Metaphysics
  if (lower.includes("philosoph")) {
    return {
      icon: "🌌",
      gradient: "from-indigo-600/10 via-purple-600/5 to-transparent",
      border: "border-indigo-600/25",
      badge: "text-indigo-900 bg-indigo-50",
    }
  }

  // 16. Friendship & Fellowship
  if (lower.includes("friend") || lower.includes("fellow") || lower.includes("companion")) {
    return {
      icon: "🤝",
      gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
      border: "border-amber-500/25",
      badge: "text-amber-800 bg-amber-50",
    }
  }

  // 17. Political, Freedom & Statecraft
  if (lower.includes("polit") || lower.includes("freedom") || lower.includes("libert") || lower.includes("democra") || lower.includes("republic")) {
    return {
      icon: "🏛️",
      gradient: "from-blue-600/10 via-indigo-600/5 to-transparent",
      border: "border-blue-600/25",
      badge: "text-blue-900 bg-blue-50",
    }
  }

  // 18. Positive, Hope & Optimism
  if (lower.includes("positiv") || lower.includes("hope") || lower.includes("optimis")) {
    return {
      icon: "🌅",
      gradient: "from-yellow-500/10 via-amber-500/5 to-transparent",
      border: "border-yellow-500/25",
      badge: "text-yellow-800 bg-yellow-50",
    }
  }

  // 19. Failure, Resilience & Trial
  if (lower.includes("fail") || lower.includes("resilien") || lower.includes("advers") || lower.includes("mistake")) {
    return {
      icon: "⚡",
      gradient: "from-orange-500/10 via-amber-500/5 to-transparent",
      border: "border-orange-500/25",
      badge: "text-orange-800 bg-orange-50",
    }
  }

  // 20. Sadness, Grief & Solace
  if (lower.includes("sad") || lower.includes("grief") || lower.includes("solac") || lower.includes("sorrow") || lower.includes("melanchol")) {
    return {
      icon: "🕯️",
      gradient: "from-slate-500/10 via-stone-500/5 to-transparent",
      border: "border-slate-500/25",
      badge: "text-slate-800 bg-slate-50",
    }
  }

  // 21. Attitude, Mindset & Focus
  if (lower.includes("attitud") || lower.includes("mind") || lower.includes("perspectiv")) {
    return {
      icon: "🎯",
      gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
      border: "border-emerald-500/25",
      badge: "text-emerald-800 bg-emerald-50",
    }
  }

  // 22. Time, History & Ephemerality
  if (lower.includes("time") || lower.includes("histor") || lower.includes("past") || lower.includes("future")) {
    return {
      icon: "⏳",
      gradient: "from-amber-600/10 via-stone-500/5 to-transparent",
      border: "border-amber-700/25",
      badge: "text-amber-900 bg-amber-50",
    }
  }

  // Additional thematic archetypes
  if (lower.includes("nature") || lower.includes("earth") || lower.includes("environ")) {
    return {
      icon: "🌿",
      gradient: "from-emerald-600/10 via-teal-500/5 to-transparent",
      border: "border-emerald-600/25",
      badge: "text-emerald-950 bg-emerald-50",
    }
  }
  if (lower.includes("art") || lower.includes("creativ") || lower.includes("design")) {
    return {
      icon: "🎨",
      gradient: "from-fuchsia-500/10 via-purple-500/5 to-transparent",
      border: "border-fuchsia-500/25",
      badge: "text-fuchsia-900 bg-fuchsia-50",
    }
  }
  if (lower.includes("music") || lower.includes("song") || lower.includes("poet")) {
    return {
      icon: "🎵",
      gradient: "from-purple-500/10 via-pink-500/5 to-transparent",
      border: "border-purple-500/25",
      badge: "text-purple-900 bg-purple-50",
    }
  }
  if (lower.includes("scien") || lower.includes("logic") || lower.includes("reason")) {
    return {
      icon: "🔬",
      gradient: "from-cyan-500/10 via-blue-500/5 to-transparent",
      border: "border-cyan-500/25",
      badge: "text-cyan-900 bg-cyan-50",
    }
  }
  if (lower.includes("courag") || lower.includes("brave") || lower.includes("valor")) {
    return {
      icon: "🛡️",
      gradient: "from-red-600/10 via-amber-600/5 to-transparent",
      border: "border-red-600/25",
      badge: "text-red-950 bg-red-50",
    }
  }
  if (lower.includes("peace") || lower.includes("still") || lower.includes("calm")) {
    return {
      icon: "🌊",
      gradient: "from-teal-500/10 via-sky-500/5 to-transparent",
      border: "border-teal-500/25",
      badge: "text-teal-900 bg-teal-50",
    }
  }
  if (lower.includes("truth") || lower.includes("honest") || lower.includes("integrit")) {
    return {
      icon: "💎",
      gradient: "from-sky-400/10 via-blue-500/5 to-transparent",
      border: "border-sky-400/25",
      badge: "text-sky-900 bg-sky-50",
    }
  }
  if (lower.includes("death") || lower.includes("mortal")) {
    return {
      icon: "🍂",
      gradient: "from-stone-600/10 via-amber-900/5 to-transparent",
      border: "border-stone-500/25",
      badge: "text-stone-900 bg-stone-100",
    }
  }

  // Default manuscript folio
  return {
    icon: "📜",
    gradient: "from-stone-500/10 via-amber-500/5 to-transparent",
    border: "border-stone-300",
    badge: "text-stone-800 bg-stone-100",
  }
}

export interface TagTypeMeta {
  label: string
  icon: string
  badgeClass: string
  gradient: string
  border: string
}

export function getTagTypeMeta(type: string): TagTypeMeta {
  switch (type.toUpperCase()) {
    case "VIRTUE":
      return {
        label: "Moral Virtue",
        icon: "🕊️",
        badgeClass: "text-emerald-900 bg-emerald-50 border-emerald-200",
        gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
        border: "border-emerald-300/40",
      }
    case "EMOTION":
      return {
        label: "Human Emotion",
        icon: "💓",
        badgeClass: "text-rose-900 bg-rose-50 border-rose-200",
        gradient: "from-rose-500/10 via-pink-500/5 to-transparent",
        border: "border-rose-300/40",
      }
    case "VALUE":
      return {
        label: "Core Value",
        icon: "🧭",
        badgeClass: "text-amber-900 bg-amber-50 border-amber-200",
        gradient: "from-amber-500/10 via-yellow-500/5 to-transparent",
        border: "border-amber-300/40",
      }
    case "STATE":
      return {
        label: "State of Being",
        icon: "🧘",
        badgeClass: "text-indigo-900 bg-indigo-50 border-indigo-200",
        gradient: "from-indigo-500/10 via-purple-500/5 to-transparent",
        border: "border-indigo-300/40",
      }
    case "ERA":
      return {
        label: "Historical Era",
        icon: "📜",
        badgeClass: "text-stone-900 bg-stone-100 border-stone-200",
        gradient: "from-stone-500/10 via-amber-900/5 to-transparent",
        border: "border-stone-300/50",
      }
    case "SPIRITUAL":
    case "FAITH_TRADITION":
      return {
        label: "Spiritual Tradition",
        icon: "✨",
        badgeClass: "text-violet-900 bg-violet-50 border-violet-200",
        gradient: "from-violet-500/10 via-fuchsia-500/5 to-transparent",
        border: "border-violet-300/40",
      }
    case "POLITICS":
    case "SOCIETY":
      return {
        label: "Society & Governance",
        icon: "🏛️",
        badgeClass: "text-blue-900 bg-blue-50 border-blue-200",
        gradient: "from-blue-500/10 via-sky-500/5 to-transparent",
        border: "border-blue-300/40",
      }
    case "SCIENCE":
      return {
        label: "Scientific Inquiry",
        icon: "🔬",
        badgeClass: "text-cyan-900 bg-cyan-50 border-cyan-200",
        gradient: "from-cyan-500/10 via-teal-500/5 to-transparent",
        border: "border-cyan-300/40",
      }
    case "ART":
      return {
        label: "Art & Creation",
        icon: "🎨",
        badgeClass: "text-fuchsia-900 bg-fuchsia-50 border-fuchsia-200",
        gradient: "from-fuchsia-500/10 via-pink-500/5 to-transparent",
        border: "border-fuchsia-300/40",
      }
    case "NATURE":
      return {
        label: "Nature & Cosmos",
        icon: "🌿",
        badgeClass: "text-emerald-900 bg-emerald-50 border-emerald-200",
        gradient: "from-emerald-600/10 via-teal-500/5 to-transparent",
        border: "border-emerald-300/40",
      }
    case "ACTION":
    case "WORK":
      return {
        label: "Action & Craft",
        icon: "⚡",
        badgeClass: "text-orange-900 bg-orange-50 border-orange-200",
        gradient: "from-orange-500/10 via-amber-500/5 to-transparent",
        border: "border-orange-300/40",
      }
    case "RELATIONSHIP":
      return {
        label: "Fellowship & Kinship",
        icon: "🤝",
        badgeClass: "text-amber-800 bg-amber-50 border-amber-200",
        gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
        border: "border-amber-300/40",
      }
    case "TIME":
      return {
        label: "Temporal Motif",
        icon: "⏳",
        badgeClass: "text-stone-800 bg-stone-100 border-stone-200",
        gradient: "from-stone-500/10 via-amber-500/5 to-transparent",
        border: "border-stone-300/40",
      }
    case "VICE":
      return {
        label: "Human Foible & Vice",
        icon: "🎭",
        badgeClass: "text-red-900 bg-red-50 border-red-200",
        gradient: "from-red-500/10 via-stone-500/5 to-transparent",
        border: "border-red-300/40",
      }
    case "PERSON":
      return {
        label: "Historical Personage",
        icon: "👤",
        badgeClass: "text-stone-800 bg-stone-100 border-stone-200",
        gradient: "from-stone-500/10 via-amber-500/5 to-transparent",
        border: "border-stone-200/90",
      }
    case "EVENT":
      return {
        label: "Historic Epoch / Event",
        icon: "⚔️",
        badgeClass: "text-amber-900 bg-amber-100 border-amber-300",
        gradient: "from-amber-600/10 via-stone-500/5 to-transparent",
        border: "border-amber-300/40",
      }
    case "PLACE":
      return {
        label: "Geographic Place",
        icon: "🗺️",
        badgeClass: "text-teal-900 bg-teal-50 border-teal-200",
        gradient: "from-teal-500/10 via-emerald-500/5 to-transparent",
        border: "border-teal-300/40",
      }
    default:
      return {
        label: type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
        icon: "🏷️",
        badgeClass: "text-stone-800 bg-stone-100 border-stone-200",
        gradient: "from-stone-500/10 via-amber-500/5 to-transparent",
        border: "border-stone-200/90",
      }
  }
}

/**
 * Normalizes Wikimedia Commons & Wikipedia thumbnail URLs.
 * 1. Rewrites thumb.wikimedia.org to canonical upload.wikimedia.org host.
 * 2. Strips API tracking query parameters (?utm_source=...).
 * 3. Enforces valid 960px bucketed thumbnail sizes for TIFF files (avoiding HTTP 400).
 */
export function normalizeWikimediaThumbnailUrl(url: string | null | undefined): string | null {
  if (!url) return null
  let normalized = url.trim()
  if (!normalized) return null

  // Ensure HTTPS to prevent mixed content blocking on mobile devices
  if (
    normalized.startsWith("http://upload.wikimedia.org") ||
    normalized.startsWith("http://commons.wikimedia.org") ||
    normalized.startsWith("http://thumb.wikimedia.org") ||
    normalized.startsWith("http://en.wikipedia.org")
  ) {
    normalized = normalized.replace(/^http:\/\//i, "https://")
  }

  // 1. Rewrite thumb.wikimedia.org to canonical upload.wikimedia.org host
  if (normalized.includes("thumb.wikimedia.org/")) {
    normalized = normalized.replace("thumb.wikimedia.org/", "upload.wikimedia.org/")
  }

  // 2. Strip API tracking queries on Wikimedia/Wikipedia assets
  if ((normalized.includes("wikimedia.org/") || normalized.includes("wikipedia.org/")) && normalized.includes("?")) {
    try {
      const parsed = new URL(normalized)
      parsed.search = ""
      normalized = parsed.toString()
    } catch {
      normalized = normalized.split("?")[0]
    }
  }

  // 3. Fix Wikimedia Commons TIFF bucket sizes (lossy-page1-{not-960}px returns HTTP 400)
  if (/\.tiff?\/lossy-page1-\d+px-/i.test(normalized)) {
    normalized = normalized.replace(/lossy-page1-\d+px-/i, "lossy-page1-960px-")
  }

  return normalized
}
