import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  generateHeuristicContextDraft,
  generateQuoteContextDraft,
  sanitizeHumanContextText,
  extractSeoGoldenSnippet,
  detectBannedContextCliches,
} from "../../src/lib/quotes/context-generator"

describe("AI & Heuristic Quote Context Suggestion Engine", () => {
  it("sanitizes robotic AI clichés and cleans text syntax cleanly", () => {
    const rawClichéText =
      "At its core, this quote serves as a reminder of our human condition. Delving into the rich tapestry of life, it stands as a testament to the multifaceted cornerstone of courage in today's fast-paced world."
    const cleaned = sanitizeHumanContextText(rawClichéText)

    assert.ok(!cleaned.toLowerCase().includes("at its core"), "Should strip 'at its core'")
    assert.ok(!cleaned.toLowerCase().includes("serves as a reminder"), "Should strip 'serves as a reminder'")
    assert.ok(!cleaned.toLowerCase().includes("delving"), "Should strip 'delving'")
    assert.ok(!cleaned.toLowerCase().includes("rich tapestry"), "Should strip 'rich tapestry'")
    assert.ok(!cleaned.toLowerCase().includes("testament"), "Should strip 'testament'")
    assert.ok(!cleaned.toLowerCase().includes("multifaceted"), "Should strip 'multifaceted'")
    assert.ok(!cleaned.toLowerCase().includes("cornerstone"), "Should strip 'cornerstone'")
    assert.ok(!cleaned.toLowerCase().includes("in today's fast-paced world"), "Should strip 'in today's fast-paced world'")
    assert.ok(cleaned.charAt(0) === cleaned.charAt(0).toUpperCase(), "Should capitalize first letter")
  })

  it("extracts SEO Golden Snippet under 160 characters for search engine snippets", () => {
    const longMeaning =
      "This insight affirms that psychological freedom begins when one masters internal reactions rather than wrestling with external events. By distinguishing between personal judgment and outside circumstances, the thinker isolates the true locus of human agency. Lasting tranquility requires disciplined restraint over impulsive reactions, turning adversity into material for character."

    const snippet = extractSeoGoldenSnippet(longMeaning)

    assert.ok(snippet.length > 30, "Snippet should be non-trivial")
    assert.ok(snippet.length <= 160, `Snippet must be <= 160 chars (was ${snippet.length})`)
    assert.strictEqual(
      snippet,
      "This insight affirms that psychological freedom begins when one masters internal reactions rather than wrestling with external events."
    )
  })

  it("detects banned AI clichés accurately", () => {
    const textWithCliches = "This serves as a reminder and stands as a testament to inner peace."
    const cliches = detectBannedContextCliches(textWithCliches)
    assert.ok(cliches.includes("serves as a reminder"))
    assert.ok(cliches.includes("stands as a testament") || cliches.includes("is a testament to") || cliches.includes("testament to"))

    const cleanText = "Marcus Aurelius practiced stoic reflection along the Danube frontier."
    assert.deepStrictEqual(detectBannedContextCliches(cleanText), [])
  })

  it("generates structured context draft for recognized classical author (Marcus Aurelius)", () => {
    const draft = generateHeuristicContextDraft({
      content: "You have power over your mind - not outside events. Realize this, and you will find strength.",
      authorName: "Marcus Aurelius",
      categoryName: "Philosophy",
      sourceTitle: "Meditations",
    })

    assert.ok(draft.meaning.length > 30, "Meaning should be non-trivial")
    assert.ok(draft.historicalContext.length > 30, "Historical context should be non-trivial")
    assert.ok(draft.modernRelevance.length > 30, "Modern relevance should be non-trivial")

    // SEO Sentence 1 rule
    const sentence1 = extractSeoGoldenSnippet(draft.meaning)
    assert.ok(sentence1.length <= 160, `Sentence 1 must be <= 160 chars for SEO (got ${sentence1.length})`)

    // Cliché-free verification
    assert.deepStrictEqual(detectBannedContextCliches(draft.meaning), [], "Meaning must have 0 AI clichés")
    assert.deepStrictEqual(detectBannedContextCliches(draft.historicalContext), [], "Historical context must have 0 AI clichés")
    assert.deepStrictEqual(detectBannedContextCliches(draft.modernRelevance), [], "Modern relevance must have 0 AI clichés")

    assert.match(
      draft.meaning.toLowerCase(),
      /self-mastery|power|mind|judgment|internal|masters/i,
      "Meaning should capture stoic mental governance"
    )
    assert.match(
      draft.historicalContext.toLowerCase(),
      /marcus aurelius|roman|stoic|meditations/i,
      "Historical context should reference Marcus Aurelius and Stoicism"
    )
    assert.match(
      draft.modernRelevance.toLowerCase(),
      /digital|anxiety|clarity|contemporary/i,
      "Modern relevance should address contemporary cognitive and emotional challenges"
    )
  })

  it("generates structured context draft for civil rights theme (Martin Luther King Jr.)", () => {
    const draft = generateHeuristicContextDraft({
      content:
        "The ultimate measure of a man is not where he stands in moments of comfort and convenience, but where he stands at times of challenge and controversy.",
      authorName: "Martin Luther King Jr.",
      categoryName: "Courage",
    })

    assert.ok(draft.meaning.includes("courage"), "Should recognize courage theme")
    assert.match(
      draft.historicalContext,
      /Civil Rights|King/i,
      "Should contextualize civil rights struggle"
    )
    assert.ok(draft.modernRelevance.length > 50)

    const sentence1 = extractSeoGoldenSnippet(draft.meaning)
    assert.ok(sentence1.length <= 160, "First sentence must be <= 160 chars")
    assert.deepStrictEqual(detectBannedContextCliches(draft.meaning), [])
  })

  it("generates enriched context for newly added canonical thinkers (Viktor Frankl)", () => {
    const draft = generateHeuristicContextDraft({
      content: "When we are no longer able to change a situation, we are challenged to change ourselves.",
      authorName: "Viktor Frankl",
      categoryName: "Resilience",
    })

    assert.match(draft.historicalContext, /Logotherapy|Holocaust|Frankl/i)
    assert.ok(draft.meaning.length > 40)
    assert.deepStrictEqual(detectBannedContextCliches(draft.meaning), [])
    assert.deepStrictEqual(detectBannedContextCliches(draft.historicalContext), [])
    assert.deepStrictEqual(detectBannedContextCliches(draft.modernRelevance), [])
  })

  it("generates robust fallback context for general or unrecognized authors", () => {
    const draft = generateHeuristicContextDraft({
      content: "Small daily disciplines compound into extraordinary life outcomes.",
      authorName: "Anonymous Philosopher",
      categoryName: "Discipline",
    })

    assert.ok(draft.meaning.length > 40)
    assert.ok(draft.historicalContext.length > 40)
    assert.ok(draft.modernRelevance.length > 40)
    assert.match(draft.meaning, /action|deliberate|discipline/i)

    const s1 = extractSeoGoldenSnippet(draft.meaning)
    assert.ok(s1.length <= 160)
    assert.deepStrictEqual(detectBannedContextCliches(draft.meaning), [])
  })

  it("generates draft via generateQuoteContextDraft API helper returning provider attribution", async () => {
    const result = await generateQuoteContextDraft({
      content: "Be the change that you wish to see in the world.",
      authorName: "Mahatma Gandhi",
      categoryName: "Inspiration",
    })

    assert.ok(result.draft, "Result must contain draft")
    assert.ok(result.draft.meaning, "Draft must have meaning")
    assert.ok(result.draft.historicalContext, "Draft must have historicalContext")
    assert.ok(result.draft.modernRelevance, "Draft must have modernRelevance")
    assert.ok(
      result.provider === "gemini" || result.provider === "heuristic",
      "Provider must be gemini or heuristic"
    )

    // Ensure returned draft is sanitized
    assert.deepStrictEqual(detectBannedContextCliches(result.draft.meaning), [])
    assert.deepStrictEqual(detectBannedContextCliches(result.draft.historicalContext), [])
    assert.deepStrictEqual(detectBannedContextCliches(result.draft.modernRelevance), [])
  })
})
