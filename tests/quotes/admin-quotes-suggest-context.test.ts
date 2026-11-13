import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  generateHeuristicContextDraft,
  generateQuoteContextDraft,
} from "../../src/lib/quotes/context-generator"

describe("AI & Heuristic Quote Context Suggestion Engine", () => {
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

    assert.match(
      draft.meaning.toLowerCase(),
      /self-mastery|power|mind|judgment|internal/i,
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
      content: "The ultimate measure of a man is not where he stands in moments of comfort and convenience, but where he stands at times of challenge and controversy.",
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
  })
})
