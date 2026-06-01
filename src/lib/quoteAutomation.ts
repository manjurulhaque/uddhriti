type QuoteStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED"
type AttributionStatus = "CONFIRMED" | "DISPUTED" | "MISATTRIBUTED" | "UNKNOWN"

export function deriveVerificationConfidence(input: {
  isVerified?: boolean
  attributionStatus?: AttributionStatus
}) {
  const { isVerified = false, attributionStatus = "UNKNOWN" } = input

  if (isVerified) {
    if (attributionStatus === "DISPUTED") return 0.65
    if (attributionStatus === "MISATTRIBUTED") return 0.05
    return 1
  }

  switch (attributionStatus) {
    case "CONFIRMED":
      return 0.85
    case "DISPUTED":
      return 0.35
    case "MISATTRIBUTED":
      return 0.05
    case "UNKNOWN":
    default:
      return 0
  }
}

export function deriveAdminSortKey(input: {
  status: QuoteStatus
  isFeatured?: boolean
  isVerified?: boolean
  attributionStatus?: AttributionStatus
}) {
  const { status, isFeatured = false, isVerified = false, attributionStatus = "UNKNOWN" } = input

  let score = 0

  if (status === "PUBLISHED") score += 100
  else if (status === "REVIEW") score += 60
  else if (status === "DRAFT") score += 20

  if (isFeatured) score += 50
  if (isVerified) score += 25

  if (attributionStatus === "CONFIRMED") score += 10
  else if (attributionStatus === "DISPUTED") score -= 10
  else if (attributionStatus === "MISATTRIBUTED") score -= 30

  return score
}
