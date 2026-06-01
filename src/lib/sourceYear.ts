export type ParsedSourceYear = {
  year: number | null
  approximate: boolean
  invalid: boolean
}

const APPROXIMATE_PREFIX_RE = /^(?:c(?:irca)?|ca|approx(?:\.|imately)?|around)\.?\s*/i

export function normalizeSourceYearInput(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  return trimmed.replace(/\u2013|\u2014/g, "-")
}

export function formatSourceYearLabel(value: {
  year: number | null | undefined
  yearLabel?: string | null
  yearApproximate?: boolean | null
} | null | undefined) {
  if (!value) {
    return null
  }

  const { year, yearLabel, yearApproximate } = value

  if (yearLabel?.trim()) {
    return yearLabel.trim()
  }

  if (year == null) {
    return null
  }

  return yearApproximate ? `c. ${year}` : String(year)
}

export function parseSourceYearInput(
  value: unknown,
  yearApproximate = false
): ParsedSourceYear {
  if (value == null) {
    return { year: null, approximate: yearApproximate, invalid: false }
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { year: null, approximate: yearApproximate, invalid: true }
    }

    return {
      year: Math.trunc(value),
      approximate: yearApproximate,
      invalid: false,
    }
  }

  if (typeof value !== "string") {
    return { year: null, approximate: yearApproximate, invalid: true }
  }

  const normalized = normalizeSourceYearInput(value)
  if (!normalized) {
    return { year: null, approximate: yearApproximate, invalid: false }
  }
  const approximate = yearApproximate || APPROXIMATE_PREFIX_RE.test(normalized)
  const withoutApproximate = normalized.replace(APPROXIMATE_PREFIX_RE, "").trim()
  const match = withoutApproximate.match(/^-?\d{1,4}(?:\s*-\s*-?\d{1,4})?$/)

  if (!match) {
    return { year: null, approximate, invalid: true }
  }

  const startYearMatch = withoutApproximate.match(/^-?\d{1,4}/)
  if (!startYearMatch) {
    return { year: null, approximate, invalid: true }
  }

  const year = Number(startYearMatch[0])

  if (!Number.isFinite(year)) {
    return { year: null, approximate, invalid: true }
  }

  return {
    year,
    approximate: approximate || withoutApproximate.includes("-"),
    invalid: false,
  }
}
