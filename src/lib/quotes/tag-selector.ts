/**
 * AI-Assisted Thematic Tag Selector & Taxonomy Balancer
 *
 * Enforces the curatorial taxonomy distribution rule:
 * - Maximum 7 tags total
 * - Up to 2 tags from type "TOPIC"
 * - At most 1 tag each from other category types (EMOTION, ACTION, VIRTUE, VALUE, TIME, STATE, etc.)
 *
 * Integrates Google Gemini 1.5 Flash for multidimensional literary classification,
 * paired with a deterministic heuristic tag ranking and greedy constraint balancer.
 */

import { callGeminiGenerateContent } from "@/lib/gemini"

export const MAX_SELECTED_TAGS = 7
export const MAX_TOPIC_TAGS = 2
export const MAX_PER_OTHER_TYPE = 1

export interface BaseTag {
  id: string
  name: string
  type: string
  description?: string | null
}

export interface TagWithScore extends BaseTag {
  score?: number
  rationale?: string
  reasons?: string[]
}

export interface TagTaxonomyValidation {
  isValid: boolean
  error?: string
  topicCount: number
  otherTypeCounts: Record<string, number>
  totalCount: number
}

/**
 * Validates whether a set of tags satisfies the taxonomy distribution rule:
 * - Total tags <= 7
 * - TOPIC tags <= 2
 * - Other category tags <= 1 per type
 */
export function validateTagDistribution<T extends { type: string }>(
  tags: T[],
  maxTotal = MAX_SELECTED_TAGS,
  maxTopic = MAX_TOPIC_TAGS,
  maxOther = MAX_PER_OTHER_TYPE
): TagTaxonomyValidation {
  const totalCount = tags.length
  let topicCount = 0
  const otherTypeCounts: Record<string, number> = {}

  for (const tag of tags) {
    const normType = tag.type.toUpperCase()
    if (normType === "TOPIC") {
      topicCount += 1
      if (topicCount > maxTopic) {
        return {
          isValid: false,
          error: `Taxonomy limit exceeded: Maximum ${maxTopic} Topic tags allowed (found ${topicCount}).`,
          topicCount,
          otherTypeCounts,
          totalCount,
        }
      }
    } else {
      const count = (otherTypeCounts[normType] || 0) + 1
      otherTypeCounts[normType] = count
      if (count > maxOther) {
        return {
          isValid: false,
          error: `Taxonomy limit exceeded: Only ${maxOther} tag allowed for category "${normType}".`,
          topicCount,
          otherTypeCounts,
          totalCount,
        }
      }
    }
  }

  if (totalCount > maxTotal) {
    return {
      isValid: false,
      error: `Taxonomy limit exceeded: Maximum ${maxTotal} tags allowed in total (found ${totalCount}).`,
      topicCount,
      otherTypeCounts,
      totalCount,
    }
  }

  return {
    isValid: true,
    topicCount,
    otherTypeCounts,
    totalCount,
  }
}

/**
 * Greedily balances and limits a ranked list of candidate tags to strictly enforce:
 * - Up to maxTopic (2) from "TOPIC"
 * - At most maxOther (1) from any other category type
 * - Total tags <= maxTotal (7)
 */
export function balanceTagsToDistribution<T extends { id: string; name: string; type: string; score?: number }>(
  candidates: T[],
  maxTotal = MAX_SELECTED_TAGS,
  maxTopic = MAX_TOPIC_TAGS,
  maxOther = MAX_PER_OTHER_TYPE
): T[] {
  const selected: T[] = []
  const seenIds = new Set<string>()
  const countsByType = new Map<string, number>()

  // 1. First ensure top TOPIC candidates (up to maxTopic)
  const topicCandidates = candidates.filter((c) => c.type.toUpperCase() === "TOPIC")
  for (const tc of topicCandidates) {
    if (selected.length >= maxTotal) break
    const currentTopicCount = countsByType.get("TOPIC") || 0
    if (currentTopicCount >= maxTopic) break
    if (!seenIds.has(tc.id)) {
      selected.push(tc)
      seenIds.add(tc.id)
      countsByType.set("TOPIC", currentTopicCount + 1)
    }
  }

  // 2. Greedily select the best non-TOPIC candidates across diverse types
  for (const cand of candidates) {
    if (selected.length >= maxTotal) break
    if (seenIds.has(cand.id)) continue

    const normType = cand.type.toUpperCase()
    const limitForType = normType === "TOPIC" ? maxTopic : maxOther
    const currentCount = countsByType.get(normType) || 0

    if (currentCount < limitForType) {
      selected.push(cand)
      seenIds.add(cand.id)
      countsByType.set(normType, currentCount + 1)
    }
  }

  return selected
}

/**
 * Canonical curated tag profiles for iconic quotations.
 */
interface CanonicalTagProfile {
  pattern: RegExp
  preferredTagNames: string[]
  overview: string
}

export const CANONICAL_TAG_PROFILES: CanonicalTagProfile[] = [
  {
    pattern: /power over your mind.*not outside events/i,
    preferredTagNames: ["Wisdom", "Truth", "Courage", "Discipline", "Reflection", "Resilience", "Peace"],
    overview: "Stoic focus on internal cognitive control, resilience, and mental discipline.",
  },
  {
    pattern: /suffer more often in imagination than in reality/i,
    preferredTagNames: ["Fear", "Anxiety", "Wisdom", "Reflection", "Hope", "Peace", "Courage"],
    overview: "Analysis of groundless psychological anxiety and rational emotional tranquility.",
  },
  {
    pattern: /stay hungry.*stay foolish/i,
    preferredTagNames: ["Ambition", "Curiosity", "Wisdom", "Change", "Courage", "Growth", "Passion"],
    overview: "Visionary call for perpetual curiosity, transformative ambition, and humility.",
  },
  {
    pattern: /darkness cannot drive out darkness.*light can do that/i,
    preferredTagNames: ["Justice", "Love", "Hope", "Compassion", "Forgiveness", "Service", "Courage"],
    overview: "Ethical imperative of nonviolent love and moral resistance over hatred.",
  },
  {
    pattern: /be the change.*wish to see in the world/i,
    preferredTagNames: ["Change", "Integrity", "Responsibility", "Discipline", "Service", "Courage", "Truth"],
    overview: "Call for personal ethical embodiment and self-driven moral transformation.",
  },
  {
    pattern: /unexamined life is not worth living/i,
    preferredTagNames: ["Wisdom", "Truth", "Reflection", "Integrity", "Soul", "Knowledge", "Courage"],
    overview: "Socratic imperative regarding intellectual honesty and deliberate philosophical self-examination.",
  },
]

export interface AiTagSelectorInput {
  content: string
  meaning?: string
  authorName?: string
  categoryName?: string
  availableTags: BaseTag[]
}

export interface AiTagSelectorResult {
  selectedTags: TagWithScore[]
  distribution: {
    topicCount: number
    otherTypes: string[]
    totalCount: number
  }
  overview?: string
  provider: "gemini" | "heuristic"
}

/**
 * Selects up to 7 balanced tags using Gemini 1.5 Flash (or deterministic fallback)
 * adhering strictly to:
 * - Maximum 7 tags
 * - Up to 2 from "TOPIC"
 * - At most 1 each from other category types
 */
export async function selectAiAssistedTags(
  input: AiTagSelectorInput
): Promise<AiTagSelectorResult> {
  const content = input.content.trim()
  if (!content || input.availableTags.length === 0) {
    return {
      selectedTags: [],
      distribution: { topicCount: 0, otherTypes: [], totalCount: 0 },
      provider: "heuristic",
    }
  }

  // 1. Check Canonical Profiles
  for (const profile of CANONICAL_TAG_PROFILES) {
    if (profile.pattern.test(content)) {
      const candidates: TagWithScore[] = []

      for (const targetName of profile.preferredTagNames) {
        const found = input.availableTags.find(
          (t) => t.name.toLowerCase() === targetName.toLowerCase()
        )
        if (found) {
          candidates.push({
            ...found,
            score: 10,
            rationale: `Canonical profile match: ${profile.overview}`,
          })
        }
      }

      const balanced = balanceTagsToDistribution(candidates, MAX_SELECTED_TAGS, MAX_TOPIC_TAGS, MAX_PER_OTHER_TYPE)
      const topicCount = balanced.filter((t) => t.type.toUpperCase() === "TOPIC").length
      const otherTypes = Array.from(new Set(balanced.filter((t) => t.type.toUpperCase() !== "TOPIC").map((t) => t.type)))

      return {
        selectedTags: balanced,
        distribution: {
          topicCount,
          otherTypes,
          totalCount: balanced.length,
        },
        overview: profile.overview,
        provider: "heuristic",
      }
    }
  }

  // 2. Query Gemini 1.5 Flash if GEMINI_API_KEY is available
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (apiKey) {
    try {
      // Group available tags by type to present clean taxonomy options to the model
      const groupedCatalog: Record<string, string[]> = {}
      for (const tag of input.availableTags) {
        const normType = tag.type.toUpperCase()
        if (!groupedCatalog[normType]) groupedCatalog[normType] = []
        groupedCatalog[normType].push(tag.name)
      }

      const prompt = `You are an expert quotation taxonomist and curator.
Classify the following quotation by selecting up to 7 tags from the provided catalog.

CRITICAL TAXONOMY DISTRIBUTION RULE:
- Select a MAXIMUM of 7 tags total.
- Select up to 2 tags from category "TOPIC".
- Select at most 1 tag each from other categories (e.g. at most 1 EMOTION, at most 1 VIRTUE, at most 1 ACTION, at most 1 VALUE, at most 1 STATE, at most 1 TIME, at most 1 SPIRITUAL, etc.).
- ONLY pick tags that exist verbatim in the catalog below.

Quotation: "${content}"
Author: "${input.authorName || "Unknown"}"
Thematic Category: "${input.categoryName || "General"}"
Meaning/Context: "${input.meaning || "N/A"}"

Catalog of available tags by category:
${JSON.stringify(groupedCatalog)}

Return a strictly valid JSON object with:
1. "selectedTags": Array of objects, each containing:
   - "name": Exact string name of the tag from the catalog
   - "type": Category type of the tag (e.g. "TOPIC", "EMOTION", "VIRTUE", "ACTION")
   - "rationale": Short 1-sentence reason why this tag captures a dimension of the quote.
2. "overview": 1 concise sentence summarizing the multidimensional thematic profile.

Return ONLY the raw JSON object without markdown formatting.`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const response = await callGeminiGenerateContent(apiKey, prompt, {
        temperature: 0.1,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed.selectedTags)) {
            const rawSelected = parsed.selectedTags as Array<{ name?: unknown; type?: unknown; rationale?: unknown }>
            const candidates: TagWithScore[] = []

            for (const item of rawSelected) {
              if (typeof item.name === "string") {
                const found = input.availableTags.find(
                  (t) => t.name.toLowerCase() === (item.name as string).trim().toLowerCase()
                )
                if (found && !candidates.some((c) => c.id === found.id)) {
                  candidates.push({
                    ...found,
                    score: 9.5,
                    rationale: typeof item.rationale === "string" ? item.rationale : `AI matched for ${found.type}`,
                  })
                }
              }
            }

            // Strictly enforce the rule on the candidates
            const balanced = balanceTagsToDistribution(candidates, MAX_SELECTED_TAGS, MAX_TOPIC_TAGS, MAX_PER_OTHER_TYPE)

            if (balanced.length > 0) {
              const topicCount = balanced.filter((t) => t.type.toUpperCase() === "TOPIC").length
              const otherTypes = Array.from(new Set(balanced.filter((t) => t.type.toUpperCase() !== "TOPIC").map((t) => t.type)))

              return {
                selectedTags: balanced,
                distribution: {
                  topicCount,
                  otherTypes,
                  totalCount: balanced.length,
                },
                overview: typeof parsed.overview === "string" ? parsed.overview : undefined,
                provider: "gemini",
              }
            }
          }
        }
      }
    } catch {
      // Graceful fallback to heuristic
    }
  }

  // 3. Deterministic Heuristic Ranking & Greedy Taxonomy Balancer
  const normContent = content.toLowerCase()
  const contentWords = new Set(normContent.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2))

  const scoredCandidates: TagWithScore[] = input.availableTags.map((tag) => {
    const normName = tag.name.toLowerCase()
    const normDesc = (tag.description || "").toLowerCase()
    let score = 0
    const reasons: string[] = []

    if (normContent.includes(normName)) {
      score += 10
      reasons.push("name match")
    }

    const tagWords = normName.split(/\s+/).filter((w) => w.length > 2)
    const wordMatches = tagWords.filter((w) => contentWords.has(w)).length
    if (wordMatches > 0) {
      score += wordMatches * 4
      reasons.push("keyword match")
    }

    if (normDesc) {
      const descWords = normDesc.split(/\s+/).filter((w) => w.length > 3)
      const descMatches = descWords.filter((w) => contentWords.has(w)).length
      if (descMatches > 0) {
        score += Math.min(descMatches * 2, 6)
        reasons.push("theme match")
      }
    }

    return {
      ...tag,
      score,
      reasons,
      rationale: reasons.length > 0 ? reasons.join(", ") : undefined,
    }
  })

  // Sort by score descending
  scoredCandidates.sort((a, b) => (b.score || 0) - (a.score || 0))

  const balanced = balanceTagsToDistribution(scoredCandidates, MAX_SELECTED_TAGS, MAX_TOPIC_TAGS, MAX_PER_OTHER_TYPE)
  const topicCount = balanced.filter((t) => t.type.toUpperCase() === "TOPIC").length
  const otherTypes = Array.from(new Set(balanced.filter((t) => t.type.toUpperCase() !== "TOPIC").map((t) => t.type)))

  return {
    selectedTags: balanced,
    distribution: {
      topicCount,
      otherTypes,
      totalCount: balanced.length,
    },
    provider: "heuristic",
  }
}
