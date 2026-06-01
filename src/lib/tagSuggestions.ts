const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "their",
  "them",
  "there",
  "these",
  "they",
  "this",
  "to",
  "was",
  "we",
  "will",
  "with",
  "you",
  "your",
])

const MAX_SUGGESTED_TAGS = 7
const TOPIC_SUGGESTION_LIMIT = 2
const OTHER_TYPE_SUGGESTION_LIMIT = 1
const MIN_SUGGESTED_TAG_SCORE = 5
const TOPIC_FALLBACK_SUGGESTED_TAG_SCORE = 1

export type SuggestableTag = {
  id: string
  name: string
  type: string
  description?: string | null
}

export type SuggestedTag<T extends SuggestableTag> = T & {
  score: number
  reasons: string[]
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim()
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

function expandToken(token: string) {
  const forms = new Set([token])

  if (token.endsWith("ies") && token.length > 4) forms.add(`${token.slice(0, -3)}y`)
  if (token.endsWith("es") && token.length > 4) forms.add(token.slice(0, -2))
  if (token.endsWith("s") && token.length > 3) forms.add(token.slice(0, -1))
  if (token.endsWith("ing") && token.length > 5) {
    forms.add(token.slice(0, -3))
    forms.add(token.slice(0, -3).replace(/(.)\1$/, "$1"))
  }
  if (token.endsWith("ed") && token.length > 4) forms.add(token.slice(0, -2))
  if (token.endsWith("tion") && token.length > 5) forms.add(`${token.slice(0, -4)}te`)
  if (token.endsWith("ity") && token.length > 5) forms.add(token.slice(0, -3))

  return Array.from(forms).filter((value) => value.length > 2)
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items))
}

function toTokenSet(value: string) {
  return new Set(unique(tokenize(value).flatMap(expandToken)))
}

function countTokenHits(tokens: string[], haystack: Set<string>) {
  return tokens.reduce((count, token) => count + (haystack.has(token) ? 1 : 0), 0)
}

function countLooseTokenHits(tokens: string[], haystackTokens: string[]) {
  return tokens.reduce(
    (count, token) =>
      count +
      (haystackTokens.some((haystackToken) => haystackToken.startsWith(token) || token.startsWith(haystackToken))
        ? 1
        : 0),
    0
  )
}

function hasPhraseOverlap(needle: string, haystack: string) {
  return needle.length > 3 && haystack.includes(needle)
}

function limitSuggestedTags<T extends { type: string }>(items: T[]) {
  const selected: T[] = []
  const countsByType = new Map<string, number>()
  const topicCandidate = items.find((item) => item.type === "TOPIC")

  if (topicCandidate) {
    selected.push(topicCandidate)
    countsByType.set("TOPIC", 1)
  }

  for (const item of items) {
    if (selected.length >= MAX_SUGGESTED_TAGS) break
    if (selected.includes(item)) continue

    const perTypeLimit = item.type === "TOPIC" ? TOPIC_SUGGESTION_LIMIT : OTHER_TYPE_SUGGESTION_LIMIT
    const currentCount = countsByType.get(item.type) ?? 0
    if (currentCount >= perTypeLimit) continue

    selected.push(item)
    countsByType.set(item.type, currentCount + 1)
  }

  return selected
}

export function suggestTags<T extends SuggestableTag>(payload: {
  content: string
  categoryName?: string
  categorySlug?: string
  sourceTitle?: string
  sourceTitleDraft?: string
  selectedTagIds: string[]
  tags: T[]
}) {
  const normalizedContent = normalizeText(payload.content)
  if (normalizedContent.length < 12) return [] as SuggestedTag<T>[]

  const contextText = [
    payload.content,
    payload.categoryName,
    payload.categorySlug,
    payload.sourceTitle,
    payload.sourceTitleDraft,
  ]
    .filter(Boolean)
    .join(" ")

  const contentTokens = toTokenSet(payload.content)
  const rawContentTokens = tokenize(payload.content)
  const contextTokens = toTokenSet(contextText)
  const rawContextTokens = tokenize(contextText)
  const categoryTokens = toTokenSet([payload.categoryName, payload.categorySlug].filter(Boolean).join(" "))

  const rankedTags = payload.tags
    .filter((tag) => !payload.selectedTagIds.includes(tag.id))
    .map((tag) => {
      const normalizedTagName = normalizeText(tag.name)
      const normalizedDescription = normalizeText(tag.description ?? "")
      const nameTokens = unique(tokenize(tag.name).flatMap(expandToken))
      const descriptionTokens = unique(tokenize(tag.description ?? "").flatMap(expandToken)).slice(0, 12)
      const typeTokens = unique(tokenize(tag.type.replace(/_/g, " ")).flatMap(expandToken))
      const reasons: string[] = []
      let score = 0

      if (hasPhraseOverlap(normalizedTagName, normalizedContent)) {
        score += 12
        reasons.push("name match")
      }

      const nameHits = countTokenHits(nameTokens, contentTokens)
      if (nameTokens.length > 0 && nameHits === nameTokens.length && nameHits > 0) {
        score += 6
        reasons.push("keyword match")
      } else if (nameHits > 0) {
        score += nameHits * 2
        reasons.push("partial keyword match")
      }

      const looseNameHits = countLooseTokenHits(nameTokens, rawContentTokens)
      if (looseNameHits > 0 && nameHits === 0) {
        score += Math.min(looseNameHits, 2)
        reasons.push("close wording match")
      }

      const contextNameHits = countTokenHits(nameTokens, contextTokens)
      if (contextNameHits >= Math.max(1, Math.ceil(nameTokens.length / 2))) {
        score += 3
        reasons.push("context match")
      }

      const looseContextHits = countLooseTokenHits(nameTokens, rawContextTokens)
      if (looseContextHits > 0 && contextNameHits === 0) {
        score += 1
        reasons.push("context wording match")
      }

      const descriptionHits = countTokenHits(descriptionTokens, contentTokens)
      if (descriptionHits >= 2) {
        score += Math.min(descriptionHits, 5)
        reasons.push("theme match")
      }

      if (hasPhraseOverlap(normalizedDescription, normalizedContent) && normalizedDescription.length > 8) {
        score += 4
        reasons.push("description match")
      }

      const categoryHits = countTokenHits(nameTokens, categoryTokens)
      const typeHits = countTokenHits(typeTokens, contextTokens)
      if (categoryHits > 0 || typeHits > 0) {
        score += 3
        reasons.push("category aligned")
      }

      const signalCount = [
        nameHits > 0,
        looseNameHits > 0,
        contextNameHits > 0,
        descriptionHits > 0,
        categoryHits > 0,
        typeHits > 0,
      ].filter(Boolean).length

      if (signalCount >= 3) {
        score += 2
        reasons.push("strong overall fit")
      }

      if (tag.type === "TOPIC" && (nameHits > 0 || contextNameHits > 0 || descriptionHits > 0 || categoryHits > 0 || looseNameHits > 0)) {
        score += 2
        reasons.push("topic priority")
      }

      if (nameTokens.length === 1 && nameHits === 0 && looseNameHits === 0 && descriptionHits < 2 && categoryHits === 0) {
        score -= 2
      }

      return {
        ...tag,
        score,
        reasons: unique(reasons),
      }
    })
    .sort((left, right) => right.score - left.score)

  const primarySuggestions = rankedTags.filter((tag) => tag.score >= MIN_SUGGESTED_TAG_SCORE)
  const hasTopicSuggestion = primarySuggestions.some((tag) => tag.type === "TOPIC")
  const fallbackTopic =
    hasTopicSuggestion
      ? null
      : rankedTags.find(
          (tag) => tag.type === "TOPIC" && tag.score >= TOPIC_FALLBACK_SUGGESTED_TAG_SCORE
        ) ?? null

  return limitSuggestedTags(
    fallbackTopic ? [fallbackTopic, ...primarySuggestions] : primarySuggestions
  )
}
