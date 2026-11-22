import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  findPrimarySource,
  matchSourceInDatabase,
  sanitizeWorkType,
  type SourceRecord,
} from "../../src/lib/quotes/source-finder"

const mockDbSources: SourceRecord[] = [
  {
    id: "src-1",
    title: "Meditations",
    slug: "meditations",
    type: "BOOK",
    year: 180,
    authorId: "auth-aurelius",
    quoteCount: 14,
  },
  {
    id: "src-2",
    title: "Letters from a Stoic",
    slug: "letters-from-a-stoic",
    type: "LETTER",
    year: 65,
    authorId: "auth-seneca",
    quoteCount: 9,
  },
  {
    id: "src-3",
    title: "Stanford Commencement Address",
    slug: "stanford-commencement-address",
    type: "SPEECH",
    year: 2005,
    authorId: "auth-jobs",
    quoteCount: 4,
  },
  {
    id: "src-4",
    title: "Strength to Love",
    slug: "strength-to-love",
    type: "BOOK",
    year: 1963,
    authorId: "auth-mlk",
    quoteCount: 7,
  },
  {
    id: "src-5",
    title: "Twilight of the Idols",
    slug: "twilight-of-the-idols",
    type: "BOOK",
    year: 1889,
    authorId: "auth-nietzsche",
    quoteCount: 5,
  },
]

describe("AI-Assisted Primary Source Finder & Citation Engine", () => {
  describe("Canonical Primary Source Concordance", () => {
    it("discovers Meditations and Book IV locator for Marcus Aurelius locus classicus", async () => {
      const result = await findPrimarySource(
        {
          content: "You have power over your mind - not outside events. Realize this, and you will find strength.",
          authorName: "Marcus Aurelius",
          authorId: "auth-aurelius",
        },
        mockDbSources
      )

      assert.ok(result.primarySource !== null)
      assert.equal(result.primarySource.title, "Meditations")
      assert.equal(result.primarySource.workType, "BOOK")
      assert.equal(result.primarySource.year, 180)
      assert.ok(result.primarySource.citationLocator?.includes("Book IV"))
      assert.ok(result.primarySource.isCanonical)
      assert.ok(result.primarySource.confidence >= 0.95)
      // Existing source in mockDbSources should be automatically matched
      assert.equal(result.primarySource.existingSourceId, "src-1")
      assert.equal(result.primarySource.existingSource?.title, "Meditations")
    })

    it("discovers Seneca's Letters to Lucilius and Epistle XIII for imagination quote", async () => {
      const result = await findPrimarySource(
        {
          content: "We suffer more often in imagination than in reality.",
          authorName: "Seneca",
          authorId: "auth-seneca",
        },
        mockDbSources
      )

      assert.ok(result.primarySource !== null)
      assert.equal(result.primarySource.title, "Letters from a Stoic")
      assert.equal(result.primarySource.workType, "LETTER")
      assert.ok(result.primarySource.citationLocator?.includes("Epistle XIII"))
      assert.equal(result.primarySource.existingSourceId, "src-2")
    })

    it("discovers Steve Jobs' Stanford Commencement Address (2005)", async () => {
      const result = await findPrimarySource(
        {
          content: "Stay hungry. Stay foolish.",
          authorName: "Steve Jobs",
        },
        mockDbSources
      )

      assert.ok(result.primarySource !== null)
      assert.equal(result.primarySource.title, "Stanford Commencement Address")
      assert.equal(result.primarySource.workType, "SPEECH")
      assert.equal(result.primarySource.year, 2005)
      assert.equal(result.primarySource.existingSourceId, "src-3")
    })

    it("discovers Martin Luther King Jr.'s Strength to Love (1963)", async () => {
      const result = await findPrimarySource(
        {
          content: "Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.",
          authorName: "Martin Luther King Jr.",
        },
        mockDbSources
      )

      assert.ok(result.primarySource !== null)
      assert.equal(result.primarySource.title, "Strength to Love")
      assert.equal(result.primarySource.workType, "BOOK")
      assert.equal(result.primarySource.year, 1963)
      assert.ok(result.primarySource.citationLocator?.includes("Chapter 5"))
      assert.equal(result.primarySource.existingSourceId, "src-4")
    })

    it("discovers Friedrich Nietzsche's Twilight of the Idols (1889)", async () => {
      const result = await findPrimarySource(
        {
          content: "He who has a why to live can bear almost any how.",
          authorName: "Friedrich Nietzsche",
        },
        mockDbSources
      )

      assert.ok(result.primarySource !== null)
      assert.equal(result.primarySource.title, "Twilight of the Idols")
      assert.equal(result.primarySource.workType, "BOOK")
      assert.equal(result.primarySource.year, 1889)
      assert.equal(result.primarySource.existingSourceId, "src-5")
    })

    it("handles ancient BCE/BC dates (Tao Te Ching c. -400)", async () => {
      const result = await findPrimarySource(
        {
          content: "The journey of a thousand miles begins with a single step.",
          authorName: "Lao Tzu",
        },
        mockDbSources
      )

      assert.ok(result.primarySource !== null)
      assert.equal(result.primarySource.title, "Tao Te Ching")
      assert.equal(result.primarySource.workType, "SCRIPTURE")
      assert.equal(result.primarySource.year, -400)
      assert.ok(result.primarySource.citationLocator?.includes("Chapter 64"))
      // Not in mockDbSources
      assert.equal(result.primarySource.existingSourceId, null)
    })
  })

  describe("Database Source Matching & Linking", () => {
    it("matches exact title and alternative titles in database", () => {
      const match = matchSourceInDatabase(
        "Meditations",
        ["Ta Eis Heauton", "Ad Se Ipsum"],
        mockDbSources
      )
      assert.ok(match !== null)
      assert.equal(match.id, "src-1")
      assert.equal(match.title, "Meditations")
    })

    it("matches alternative Greek/Latin titles", () => {
      const match = matchSourceInDatabase(
        "Ta Eis Heauton",
        ["Meditations"],
        mockDbSources
      )
      assert.ok(match !== null)
      assert.equal(match.id, "src-1")
    })

    it("returns null when no database source matches", () => {
      const match = matchSourceInDatabase("Principia Mathematica", [], mockDbSources)
      assert.equal(match, null)
    })
  })

  describe("Edge Cases & WorkType Sanitization", () => {
    it("sanitizes valid and invalid work types", () => {
      assert.equal(sanitizeWorkType("BOOK"), "BOOK")
      assert.equal(sanitizeWorkType("speech"), "SPEECH")
      assert.equal(sanitizeWorkType("letter"), "LETTER")
      assert.equal(sanitizeWorkType("scripture"), "SCRIPTURE")
      assert.equal(sanitizeWorkType("INVALID_UNKNOWN_TYPE"), "BOOK")
      assert.equal(sanitizeWorkType(null), "BOOK")
    })

    it("returns empty result when content is empty", async () => {
      const result = await findPrimarySource(
        { content: "   " },
        mockDbSources
      )
      assert.equal(result.primarySource, null)
      assert.equal(result.candidates.length, 0)
    })
  })
})
