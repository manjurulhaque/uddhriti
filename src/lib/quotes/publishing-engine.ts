/**
 * AI-Assisted Quote Posting & Publishing Engine
 *
 * Provides publication readiness auditing, multi-channel social media copy generation
 * (X/Twitter, LinkedIn, Instagram, Daily Quote Newsletter), scheduling slot recommendations,
 * and curatorial distribution strategy.
 *
 * Utilizes Google Gemini API when GEMINI_API_KEY is configured, with a deterministic
 * editorial heuristic synthesizer fallback.
 */

import { formatDateTimeLocalInAppTimeZone } from "@/lib/datetime"
import { callGeminiGenerateContent } from "@/lib/gemini"

export type PublicationReadinessLevel = "EXCELLENT" | "GOOD" | "NEEDS_ATTENTION" | "BLOCKED"

export interface ReadinessCheck {
  id: string
  label: string
  passed: boolean
  importance: "CRITICAL" | "RECOMMENDED" | "OPTIONAL"
  details: string
}

export interface PublicationReadiness {
  score: number // 0 to 100
  level: PublicationReadinessLevel
  isReadyToPublish: boolean
  checks: ReadinessCheck[]
  warnings: string[]
  suggestions: string[]
}

export interface SocialPostCopy {
  twitter: {
    text: string
    charCount: number
    hashtags: string[]
  }
  linkedin: {
    headline: string
    text: string
    takeaways: string[]
    hashtags: string[]
  }
  instagram: {
    caption: string
    hashtags: string[]
  }
  quoteOfTheDay: {
    subjectLine: string
    editorialHook: string
    formattedQuote: string
  }
}

export interface ScheduleRecommendation {
  recommendedSlot: "MORNING" | "AFTERNOON" | "EVENING"
  slotLabel: string
  suggestedDateTimeIso: string
  suggestedDateTimeLocal: string
  reasoning: string
}

export interface CuratorialPublishingRecommendation {
  suggestFeatured: boolean
  featuredReason: string
  recommendedCardTheme: "noir" | "alabaster" | "emerald" | "monochrome"
  recommendedTags: string[]
}

export interface QuotePublishAssistInput {
  content: string
  authorName?: string | null
  categoryName?: string | null
  sourceTitle?: string | null
  tags?: string[]
  meaning?: string | null
  historicalContext?: string | null
  modernRelevance?: string | null
  isVerified?: boolean
  attributionStatus?: "CONFIRMED" | "DISPUTED" | "MISATTRIBUTED" | "UNKNOWN" | string | null
  isFeatured?: boolean
  quoteUrl?: string
}

export interface QuotePublishAssistOutput {
  readiness: PublicationReadiness
  socialCopy: SocialPostCopy
  schedule: ScheduleRecommendation
  curatorial: CuratorialPublishingRecommendation
}

export interface PublishAssistGenerationResult {
  assist: QuotePublishAssistOutput
  provider: "gemini" | "heuristic"
}

/**
 * Calculates a rigorous publication readiness score and checklists
 */
export function auditPublicationReadiness(input: QuotePublishAssistInput): PublicationReadiness {
  const content = input.content?.trim() || ""
  const authorName = input.authorName?.trim()
  const categoryName = input.categoryName?.trim()
  const sourceTitle = input.sourceTitle?.trim()
  const tags = input.tags || []
  const hasMeaning = Boolean(input.meaning?.trim())
  const hasHistory = Boolean(input.historicalContext?.trim())
  const hasModern = Boolean(input.modernRelevance?.trim())
  const isVerified = Boolean(input.isVerified)
  const attributionStatus = (input.attributionStatus || "UNKNOWN").toUpperCase()

  let score = 0
  const checks: ReadinessCheck[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  // 1. Content completeness
  const contentLength = content.length
  const hasValidLength = contentLength >= 15 && contentLength <= 2000
  if (hasValidLength) {
    score += 20
    checks.push({
      id: "content-quality",
      label: "Literary Content Formatted",
      passed: true,
      importance: "CRITICAL",
      details: `${content.split(/\s+/).length} words, cleanly punctuated.`,
    })
  } else {
    checks.push({
      id: "content-quality",
      label: "Literary Content Formatted",
      passed: false,
      importance: "CRITICAL",
      details: "Content must be between 15 and 2,000 characters for optimal readership.",
    })
    warnings.push("Quotation content is too short or excessively long.")
  }

  // 2. Author & Attribution Authenticity
  const hasAuthor = Boolean(authorName && authorName.toLowerCase() !== "unknown")
  if (hasAuthor) {
    score += 15
    checks.push({
      id: "author-attribution",
      label: "Author Identified",
      passed: true,
      importance: "CRITICAL",
      details: `Attributed to ${authorName}.`,
    })
  } else {
    checks.push({
      id: "author-attribution",
      label: "Author Identified",
      passed: false,
      importance: "CRITICAL",
      details: "Author is anonymous or unassigned.",
    })
    suggestions.push("Assign a verified author entity to maximize curatorial authority.")
  }

  if (attributionStatus === "CONFIRMED") {
    score += 20
    checks.push({
      id: "attribution-authenticity",
      label: "Attribution Confirmed",
      passed: true,
      importance: "CRITICAL",
      details: "Authenticity cross-referenced with literary records.",
    })
  } else if (attributionStatus === "MISATTRIBUTED") {
    score -= 30
    checks.push({
      id: "attribution-authenticity",
      label: "Attribution Authenticity",
      passed: false,
      importance: "CRITICAL",
      details: "Quote is identified as apocryphal or falsely attributed.",
    })
    warnings.push("CRITICAL: Quote is flagged as MISATTRIBUTED. Publishing will misinform readers.")
  } else if (attributionStatus === "DISPUTED") {
    score += 5
    checks.push({
      id: "attribution-authenticity",
      label: "Attribution Authenticity",
      passed: false,
      importance: "CRITICAL",
      details: "Attribution is disputed by scholars.",
    })
    warnings.push("Attribution is disputed. Add verification notes clarifying the origin before publishing.")
  } else {
    score += 10
    checks.push({
      id: "attribution-authenticity",
      label: "Attribution Authenticity",
      passed: false,
      importance: "RECOMMENDED",
      details: "Provenance is unverified; pending primary source check.",
    })
    suggestions.push("Run AI Verification to fact-check attribution before publication.")
  }

  // 3. Verification flag
  if (isVerified) {
    score += 15
    checks.push({
      id: "verified-authenticity",
      label: "Verified Authenticity Badge",
      passed: true,
      importance: "RECOMMENDED",
      details: "Verified with primary citation.",
    })
  } else {
    checks.push({
      id: "verified-authenticity",
      label: "Verified Authenticity Badge",
      passed: false,
      importance: "RECOMMENDED",
      details: "Unverified flag. Verified quotes rank higher in discovery.",
    })
  }

  // 4. Context Dimensions
  const contextCount = Number(hasMeaning) + Number(hasHistory) + Number(hasModern)
  if (contextCount === 3) {
    score += 15
    checks.push({
      id: "context-enrichment",
      label: "3/3 Context Dimensions Enriched",
      passed: true,
      importance: "RECOMMENDED",
      details: "Meaning, historical context, and modern relevance fully articulated.",
    })
  } else if (contextCount > 0) {
    score += contextCount * 4
    checks.push({
      id: "context-enrichment",
      label: `${contextCount}/3 Context Dimensions Enriched`,
      passed: false,
      importance: "RECOMMENDED",
      details: "Partial context. Readers engage 3x more with complete context.",
    })
    suggestions.push("Use Quick Context Editor to draft missing contextual dimensions.")
  } else {
    checks.push({
      id: "context-enrichment",
      label: "Context Dimensions Missing",
      passed: false,
      importance: "RECOMMENDED",
      details: "No meaning or modern relevance provided.",
    })
    suggestions.push("Draft meaning and modern relevance to enrich reader experience.")
  }

  // 5. Categorization and Tags
  const hasCategory = Boolean(categoryName)
  const hasTags = tags.length >= 2
  if (hasCategory && hasTags) {
    score += 10
    checks.push({
      id: "taxonomy-complete",
      label: "Category & Tag Taxonomy",
      passed: true,
      importance: "RECOMMENDED",
      details: `Categorized under ${categoryName} with ${tags.length} tags.`,
    })
  } else if (hasCategory) {
    score += 5
    checks.push({
      id: "taxonomy-complete",
      label: "Taxonomy Partial",
      passed: false,
      importance: "RECOMMENDED",
      details: "Category assigned but fewer than 2 tags selected.",
    })
    suggestions.push("Add at least 2 relevant thematic tags for search discoverability.")
  } else {
    checks.push({
      id: "taxonomy-complete",
      label: "Category Missing",
      passed: false,
      importance: "CRITICAL",
      details: "Category is required for publication taxonomy.",
    })
    warnings.push("Category is required before publishing.")
  }

  // 6. Primary Source Work
  if (sourceTitle) {
    score += 5
    checks.push({
      id: "primary-source",
      label: "Primary Source Work Cited",
      passed: true,
      importance: "OPTIONAL",
      details: `Referenced in "${sourceTitle}".`,
    })
  } else {
    checks.push({
      id: "primary-source",
      label: "Primary Source Work Cited",
      passed: false,
      importance: "OPTIONAL",
      details: "Optional primary publication or book citation not set.",
    })
  }

  const boundedScore = Math.max(0, Math.min(100, score))
  let level: PublicationReadinessLevel = "NEEDS_ATTENTION"
  if (attributionStatus === "MISATTRIBUTED" || boundedScore < 40) {
    level = "BLOCKED"
  } else if (boundedScore >= 85) {
    level = "EXCELLENT"
  } else if (boundedScore >= 65) {
    level = "GOOD"
  }

  const isReadyToPublish = level === "EXCELLENT" || level === "GOOD"

  return {
    score: boundedScore,
    level,
    isReadyToPublish,
    checks,
    warnings,
    suggestions,
  }
}

/**
 * Calculates optimal publishing schedule slot based on thematic classification
 */
export function computeScheduleRecommendation(
  input: QuotePublishAssistInput
): ScheduleRecommendation {
  const category = (input.categoryName || "").toLowerCase()
  const content = input.content.toLowerCase()

  let recommendedSlot: "MORNING" | "AFTERNOON" | "EVENING" = "MORNING"
  let slotLabel = "Morning Inspiration (08:00 AM IST)"
  let reasoning = "Peak morning commute and daily intention setting. Ideal for motivational and stoic wisdom."
  let targetHour = 8
  let targetMinute = 0

  if (
    category.includes("morning") ||
    category.includes("action") ||
    category.includes("discipline") ||
    category.includes("courage") ||
    category.includes("focus") ||
    category.includes("motivation") ||
    content.includes("morning") ||
    content.includes("begin") ||
    content.includes("arise")
  ) {
    recommendedSlot = "MORNING"
    slotLabel = "Morning Inspiration (08:00 AM IST)"
    reasoning = "Peak morning intention setting and commute. Ideal for actionable discipline and courage."
    targetHour = 8
    targetMinute = 0
  } else if (
    category.includes("peace") ||
    category.includes("stillness") ||
    category.includes("love") ||
    category.includes("death") ||
    category.includes("solitude") ||
    category.includes("reflection") ||
    content.includes("night") ||
    content.includes("sleep") ||
    content.includes("star")
  ) {
    recommendedSlot = "EVENING"
    slotLabel = "Evening Contemplation (07:30 PM IST)"
    reasoning = "Evening wind-down and reflective mindset. Best suited for philosophical and tranquil passages."
    targetHour = 19
    targetMinute = 30
  } else if (
    category.includes("work") ||
    category.includes("leadership") ||
    category.includes("society") ||
    category.includes("justice") ||
    category.includes("truth")
  ) {
    recommendedSlot = "AFTERNOON"
    slotLabel = "Midday Focus (01:15 PM IST)"
    reasoning = "High professional engagement window. Optimal for leadership, work ethic, and civic insights."
    targetHour = 13
    targetMinute = 15
  }

  // Calculate target date (tomorrow at targetHour:targetMinute)
  const now = new Date()
  const targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  targetDate.setHours(targetHour, targetMinute, 0, 0)

  return {
    recommendedSlot,
    slotLabel,
    suggestedDateTimeIso: targetDate.toISOString(),
    suggestedDateTimeLocal: formatDateTimeLocalInAppTimeZone(targetDate),
    reasoning,
  }
}

/**
 * Deterministic Heuristic Social Post Copy Synthesizer
 */
export function generateHeuristicSocialCopy(input: QuotePublishAssistInput): SocialPostCopy {
  const content = input.content.trim()
  const author = input.authorName?.trim() || "Quotzen"
  const category = input.categoryName?.trim() || "Wisdom"
  const modernRelevance = input.modernRelevance?.trim() || ""
  const meaning = input.meaning?.trim() || ""
  const quoteUrl = input.quoteUrl || "https://www.quotzen.com"

  const safeTag = (str: string) =>
    str.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()

  const hashtags = [
    `#${safeTag(category)}`,
    `#${safeTag(author)}`,
    "#dailyquotes",
    "#wisdom",
  ].filter((t, i, arr) => arr.indexOf(t) === i && t.length > 2)

  // 1. Twitter / X Draft (<280 chars)
  let twitterExcerpt = content
  const maxQuoteLen = 160
  if (twitterExcerpt.length > maxQuoteLen) {
    twitterExcerpt = `${twitterExcerpt.slice(0, maxQuoteLen).trim()}...`
  }

  const twitterCore = `“${twitterExcerpt}”\n\n— ${author}\n\n${hashtags.slice(0, 3).join(" ")}`
  const twitterText = twitterCore.length <= 280 ? twitterCore : `“${twitterExcerpt}” — ${author}`

  // 2. LinkedIn Professional Reflection Draft
  const headline = `Reflecting on ${category}: An enduring lesson from ${author}`
  let linkedinBody = `“${content}”\n\n— ${author}\n\n`
  if (meaning) {
    linkedinBody += `💡 Core Insight:\n${meaning}\n\n`
  }
  if (modernRelevance) {
    linkedinBody += `🎯 Modern Application:\n${modernRelevance}\n\n`
  } else {
    linkedinBody += `🎯 Practical Application:\nWhen navigating fast-paced decision making, this principle serves as a cognitive anchor for intentional focus.\n\n`
  }
  linkedinBody += `How do you cultivate this principle in your daily routine?\n\n${hashtags.join(" ")}\n${quoteUrl}`

  // 3. Instagram / Threads Aesthetic Caption Draft
  let instagramCaption = `“${content}”\n.\n.\n— ${author}`
  if (input.sourceTitle) {
    instagramCaption += ` (from "${input.sourceTitle}")`
  }
  instagramCaption += `\n.\n`
  if (modernRelevance) {
    instagramCaption += `${modernRelevance}\n.\n`
  }
  instagramCaption += `Save this thought for when you need perspective today. 🌿\n.\n${hashtags.map((h) => `${h}`).join(" ")} #quotzen #stoicism #mindset #reflection`

  // 4. Quote of the Day / Newsletter Feature
  const subjectLine = `Daily Wisdom: ${author} on ${category}`
  const editorialHook = modernRelevance
    ? `In today's fast-moving world, ${author} reminds us of an enduring truth: ${modernRelevance.split(".")[0]}.`
    : `A timeless reflection on ${category} from ${author} to anchor your day.`
  const formattedQuote = `“${content}” — ${author}`

  return {
    twitter: {
      text: twitterText,
      charCount: twitterText.length,
      hashtags: hashtags.slice(0, 3),
    },
    linkedin: {
      headline,
      text: linkedinBody,
      takeaways: [
        meaning ? meaning.split(".")[0] : "Cultivate deliberate focus amidst external noise",
        modernRelevance ? modernRelevance.split(".")[0] : "Align daily habits with core principles",
      ],
      hashtags,
    },
    instagram: {
      caption: instagramCaption,
      hashtags,
    },
    quoteOfTheDay: {
      subjectLine,
      editorialHook,
      formattedQuote,
    },
  }
}

/**
 * Curatorial recommendation heuristics (featuring, card theme, tag expansion)
 */
export function generateCuratorialRecommendation(
  input: QuotePublishAssistInput,
  readiness: PublicationReadiness
): CuratorialPublishingRecommendation {
  const category = (input.categoryName || "").toLowerCase()
  const isVerified = Boolean(input.isVerified)
  const isConfirmed = input.attributionStatus === "CONFIRMED"

  const suggestFeatured =
    readiness.score >= 80 && isVerified && isConfirmed && input.content.length <= 400

  let featuredReason = "High literary fidelity, verified primary citation, and complete contextual enrichment make this ideal for the homepage hero showcase."
  if (!suggestFeatured) {
    if (!isVerified || !isConfirmed) {
      featuredReason = "Not recommended for Featured Hero until attribution authenticity is fully verified."
    } else if (readiness.score < 80) {
      featuredReason = "Complete the 3 contextual dimensions and tag taxonomy before promoting to Featured Hero."
    } else {
      featuredReason = "Suitable for standard topic collections rather than top-level hero banner."
    }
  }

  // Recommended Card Theme
  let recommendedCardTheme: "noir" | "alabaster" | "emerald" | "monochrome" = "noir"
  if (category.includes("nature") || category.includes("peace") || category.includes("harmony")) {
    recommendedCardTheme = "emerald"
  } else if (category.includes("love") || category.includes("art") || category.includes("literature")) {
    recommendedCardTheme = "alabaster"
  } else if (category.includes("discipline") || category.includes("truth")) {
    recommendedCardTheme = "monochrome"
  }

  // Recommended Tags expansion
  const existingTags = (input.tags || []).map((t) => t.toLowerCase())
  const recommendedTags: string[] = []
  if (!existingTags.includes("wisdom")) recommendedTags.push("wisdom")
  if (!existingTags.includes("reflection")) recommendedTags.push("reflection")
  if (category.includes("philosophy") && !existingTags.includes("stoicism")) {
    recommendedTags.push("stoicism")
  }

  return {
    suggestFeatured,
    featuredReason,
    recommendedCardTheme,
    recommendedTags,
  }
}

/**
 * Comprehensive AI-Assisted Quote Publishing & Posting Orchestrator
 */
export async function generateQuotePublishAssist(
  input: QuotePublishAssistInput
): Promise<PublishAssistGenerationResult> {
  const readiness = auditPublicationReadiness(input)
  const schedule = computeScheduleRecommendation(input)
  const curatorial = generateCuratorialRecommendation(input, readiness)

  const apiKey = process.env.GEMINI_API_KEY?.trim()

  if (apiKey) {
    try {
      const prompt = `You are a distinguished literary editor, curator, and digital social media strategist for an international literary quotation platform (Quotzen).
Analyze the following quotation and generate tailored social media copy and publication strategy in strict JSON format:

Quotation: "${input.content}"
Author: "${input.authorName || "Unknown"}"
Category: "${input.categoryName || "Wisdom"}"
Source Work: "${input.sourceTitle || "N/A"}"
Meaning: "${input.meaning || ""}"
Modern Relevance: "${input.modernRelevance || ""}"

Generate a strictly valid JSON response with the following structure:
{
  "twitter": {
    "text": "String strictly under 270 characters containing the quote excerpt, author attribution, and 2-3 hashtags.",
    "hashtags": ["#tag1", "#tag2", "#tag3"]
  },
  "linkedin": {
    "headline": "Compelling 1-line headline summarizing the lesson",
    "text": "Professional leadership post (150-250 words) with quote, key takeaways from the modern relevance, and a thoughtful discussion prompt for professionals.",
    "takeaways": ["Key bullet point 1", "Key bullet point 2"],
    "hashtags": ["#tag1", "#tag2", "#tag3"]
  },
  "instagram": {
    "caption": "Aesthetic, contemplative caption with paragraph spacing, author mention, and curated hashtags.",
    "hashtags": ["#tag1", "#tag2", "#tag3"]
  },
  "quoteOfTheDay": {
    "subjectLine": "Catchy email newsletter subject line",
    "editorialHook": "1-2 sentence compelling curatorial introduction"
  }
}

Return ONLY valid JSON. No markdown backticks or commentary.`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const response = await callGeminiGenerateContent(apiKey, prompt, {
        temperature: 0.2,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          const parsed = JSON.parse(text)
          if (parsed.twitter && parsed.linkedin && parsed.instagram && parsed.quoteOfTheDay) {
            const socialCopy: SocialPostCopy = {
              twitter: {
                text: String(parsed.twitter.text || "").trim(),
                charCount: String(parsed.twitter.text || "").trim().length,
                hashtags: Array.isArray(parsed.twitter.hashtags)
                  ? parsed.twitter.hashtags
                  : ["#wisdom"],
              },
              linkedin: {
                headline: String(parsed.linkedin.headline || "").trim(),
                text: String(parsed.linkedin.text || "").trim(),
                takeaways: Array.isArray(parsed.linkedin.takeaways)
                  ? parsed.linkedin.takeaways
                  : [],
                hashtags: Array.isArray(parsed.linkedin.hashtags)
                  ? parsed.linkedin.hashtags
                  : ["#leadership", "#wisdom"],
              },
              instagram: {
                caption: String(parsed.instagram.caption || "").trim(),
                hashtags: Array.isArray(parsed.instagram.hashtags)
                  ? parsed.instagram.hashtags
                  : ["#quotes", "#reflection"],
              },
              quoteOfTheDay: {
                subjectLine: String(parsed.quoteOfTheDay.subjectLine || "").trim(),
                editorialHook: String(parsed.quoteOfTheDay.editorialHook || "").trim(),
                formattedQuote: `“${input.content}” — ${input.authorName || "Quotzen"}`,
              },
            }

            return {
              assist: {
                readiness,
                socialCopy,
                schedule,
                curatorial,
              },
              provider: "gemini",
            }
          }
        }
      }
    } catch {
      // Fall through to heuristic synthesizer on API errors or timeouts
    }
  }

  // Graceful deterministic fallback
  return {
    assist: {
      readiness,
      socialCopy: generateHeuristicSocialCopy(input),
      schedule,
      curatorial,
    },
    provider: "heuristic",
  }
}
