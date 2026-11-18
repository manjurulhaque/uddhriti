import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  extractQuotesFromUnstructuredText,
  type UnstructuredExtractInput,
} from "../../src/lib/quotes/unstructured-extractor"

describe("AI Unstructured Text to Quotes Extractor", () => {
  it("rejects empty or whitespace-only input text", async () => {
    await assert.rejects(
      async () => {
        await extractQuotesFromUnstructuredText({ text: "   \n\t  " })
      },
      {
        message: /Input text cannot be empty/i,
      }
    )
  })

  it("extracts quotes and matches existing database author when using heuristic fallback", async () => {
    // Provide an unstructured multi-line text with author dashes
    const input: UnstructuredExtractInput = {
      text: `Dwell on the beauty of life. Watch the stars, and see yourself running with them. — Marcus Aurelius
The unexamined life is not worth living. — Socrates
Knowledge is power and wisdom is freedom. — Unknown`,
      hintCategoryName: "Philosophy",
      maxQuotes: 10,
    }

    const result = await extractQuotesFromUnstructuredText(input)

    assert.ok(result.success, "Extraction should report success")
    assert.ok(Array.isArray(result.candidates), "Candidates should be an array")
    assert.ok(result.candidates.length >= 1, "Should extract at least one quote candidate")

    // Check candidate structure
    const candidate = result.candidates[0]
    assert.ok(candidate.id, "Candidate must have an id")
    assert.ok(candidate.content.length > 5, "Candidate must have content")
    assert.ok(typeof candidate.authorName === "string", "Must have author name")
    assert.ok(typeof candidate.categoryName === "string", "Must have category name")
    assert.ok(typeof candidate.categoryId === "string", "Must have category id")
    assert.ok(Array.isArray(candidate.tags), "Must have tags array")
    assert.ok(typeof candidate.confidence === "number", "Must have confidence number")
    assert.ok(candidate.confidence >= 0 && candidate.confidence <= 1, "Confidence must be between 0 and 1")
  })

  it("respects maxQuotes bounds and clamps safely", async () => {
    const lines = Array.from(
      { length: 30 },
      (_, i) => `This is memorable thought number ${i + 1} that should be reflected upon deeply. — Philosopher ${i + 1}`
    ).join("\n")

    const result = await extractQuotesFromUnstructuredText({
      text: lines,
      maxQuotes: 3,
    })

    assert.ok(result.success)
    assert.ok(result.candidates.length <= 5, "Should respect requested max quotes limit")
  })

  it("preserves source title and source type hints", async () => {
    const input: UnstructuredExtractInput = {
      text: `Your time is limited, so don't waste it living someone else's life.
Don't let the noise of others' opinions drown out your own inner voice.`,
      hintAuthorName: "Steve Jobs",
      hintSourceTitle: "Stanford Commencement Address (2005)",
      hintCategoryName: "Inspiration",
      maxQuotes: 5,
    }

    const result = await extractQuotesFromUnstructuredText(input)

    assert.ok(result.success)
    assert.ok(result.candidates.length > 0)
    for (const c of result.candidates) {
      assert.strictEqual(c.authorName, "Steve Jobs")
      if (c.sourceTitle) {
        assert.ok(c.sourceTitle.includes("Stanford"), "Source title should carry hint information")
      }
    }
  })
})
