import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  normalizeAuthorName,
  levenshteinDistance,
  calculateSimilarity,
  matchAuthorsLocal,
  detectAuthorFromQuoteContent,
  type AuthorRecord,
} from "../../src/lib/quotes/author-matcher"

const mockAuthors: AuthorRecord[] = [
  {
    id: "auth-1",
    name: "Marcus Aurelius",
    slug: "marcus-aurelius",
    profession: "Roman Emperor & Stoic Philosopher",
    birthYear: 121,
    deathYear: 180,
    quoteCount: 45,
  },
  {
    id: "auth-2",
    name: "Seneca",
    slug: "seneca",
    profession: "Stoic Philosopher & Statesman",
    birthYear: -4,
    deathYear: 65,
    quoteCount: 38,
  },
  {
    id: "auth-3",
    name: "Epictetus",
    slug: "epictetus",
    profession: "Stoic Philosopher",
    birthYear: 50,
    deathYear: 135,
    quoteCount: 29,
  },
  {
    id: "auth-4",
    name: "Mark Twain",
    slug: "mark-twain",
    profession: "Author & Humorist",
    birthYear: 1835,
    deathYear: 1910,
    quoteCount: 52,
  },
  {
    id: "auth-5",
    name: "George Orwell",
    slug: "george-orwell",
    profession: "Novelist & Essayist",
    birthYear: 1903,
    deathYear: 1950,
    quoteCount: 22,
  },
  {
    id: "auth-6",
    name: "Mahatma Gandhi",
    slug: "mahatma-gandhi",
    profession: "Spiritual & Political Leader",
    birthYear: 1869,
    deathYear: 1948,
    quoteCount: 60,
  },
  {
    id: "auth-7",
    name: "Martin Luther King Jr.",
    slug: "martin-luther-king-jr",
    profession: "Civil Rights Leader",
    birthYear: 1929,
    deathYear: 1968,
    quoteCount: 34,
  },
  {
    id: "auth-8",
    name: "Friedrich Nietzsche",
    slug: "friedrich-nietzsche",
    profession: "Philosopher & Poet",
    birthYear: 1844,
    deathYear: 1900,
    quoteCount: 41,
  },
  {
    id: "auth-9",
    name: "Albert Einstein",
    slug: "albert-einstein",
    profession: "Theoretical Physicist",
    birthYear: 1879,
    deathYear: 1955,
    quoteCount: 50,
  },
  {
    id: "auth-10",
    name: "Steve Jobs",
    slug: "steve-jobs",
    profession: "Entrepreneur & Visionary",
    birthYear: 1955,
    deathYear: 2011,
    quoteCount: 18,
  },
  {
    id: "auth-11",
    name: "Socrates",
    slug: "socrates",
    profession: "Classical Greek Philosopher",
    birthYear: -470,
    deathYear: -399,
    quoteCount: 25,
  },
  {
    id: "auth-12",
    name: "Gautama Buddha",
    slug: "gautama-buddha",
    profession: "Spiritual Teacher & Founder of Buddhism",
    birthYear: -563,
    deathYear: -483,
    quoteCount: 40,
  },
  {
    id: "auth-13",
    name: "Voltaire",
    slug: "voltaire",
    profession: "Enlightenment Writer & Philosopher",
    birthYear: 1694,
    deathYear: 1778,
    quoteCount: 27,
  },
]

describe("AI-Assisted Author Identification & Search Engine", () => {
  describe("Normalization & String Similarity", () => {
    it("normalizes names, strips accents and collapses whitespace", () => {
      assert.equal(normalizeAuthorName("  François-Marie  Arouet "), "francois marie arouet")
      assert.equal(normalizeAuthorName("Søren Kierkegaard"), "soren kierkegaard")
      assert.equal(normalizeAuthorName("Mevlânâ Rumi"), "mevlana rumi")
    })

    it("calculates Levenshtein distance accurately", () => {
      assert.equal(levenshteinDistance("gandhi", "gandhi"), 0)
      assert.equal(levenshteinDistance("senica", "seneca"), 1)
      assert.equal(levenshteinDistance("nietzche", "nietzsche"), 1)
      assert.equal(levenshteinDistance("neitzsche", "nietzsche"), 1) // adjacent transposition
      assert.equal(levenshteinDistance("ghandi", "gandhi"), 2)
    })

    it("computes similarity ratio between 0.0 and 1.0", () => {
      assert.equal(calculateSimilarity("Marcus Aurelius", "Marcus Aurelius"), 1.0)
      const sim = calculateSimilarity("Senica", "Seneca")
      assert.ok(sim >= 0.8, `Similarity should be >= 0.8, got ${sim}`)
    })
  })

  describe("Alias & Pen Name Resolution", () => {
    it("resolves 'Samuel Clemens' to Mark Twain", () => {
      const matches = matchAuthorsLocal("Samuel Clemens", mockAuthors)
      assert.ok(matches.length > 0)
      assert.equal(matches[0].name, "Mark Twain")
      assert.equal(matches[0].matchType, "alias")
      assert.ok(matches[0].confidence >= 0.95)
    })

    it("resolves 'Eric Blair' to George Orwell", () => {
      const matches = matchAuthorsLocal("Eric Blair", mockAuthors)
      assert.ok(matches.length > 0)
      assert.equal(matches[0].name, "George Orwell")
      assert.equal(matches[0].matchType, "alias")
    })

    it("resolves 'MLK' acronym to Martin Luther King Jr.", () => {
      const matches = matchAuthorsLocal("MLK", mockAuthors)
      assert.ok(matches.length > 0)
      assert.equal(matches[0].name, "Martin Luther King Jr.")
      assert.equal(matches[0].matchType, "alias")
    })

    it("resolves 'Bapu' and 'Gandhiji' to Mahatma Gandhi", () => {
      const matchesBapu = matchAuthorsLocal("Bapu", mockAuthors)
      assert.ok(matchesBapu.length > 0)
      assert.equal(matchesBapu[0].name, "Mahatma Gandhi")

      const matchesGandhiji = matchAuthorsLocal("Gandhiji", mockAuthors)
      assert.ok(matchesGandhiji.length > 0)
      assert.equal(matchesGandhiji[0].name, "Mahatma Gandhi")
    })

    it("resolves 'The Buddha' to Gautama Buddha", () => {
      const matches = matchAuthorsLocal("The Buddha", mockAuthors)
      assert.ok(matches.length > 0)
      assert.equal(matches[0].name, "Gautama Buddha")
      assert.equal(matches[0].matchType, "alias")
    })

    it("resolves 'François-Marie Arouet' to Voltaire", () => {
      const matches = matchAuthorsLocal("François-Marie Arouet", mockAuthors)
      assert.ok(matches.length > 0)
      assert.equal(matches[0].name, "Voltaire")
    })
  })

  describe("Typo Tolerance & Fuzzy Search", () => {
    it("handles common misspelling 'Ghandi' for Mahatma Gandhi", () => {
      const matches = matchAuthorsLocal("Ghandi", mockAuthors)
      assert.ok(matches.length > 0)
      assert.equal(matches[0].name, "Mahatma Gandhi")
      assert.ok(matches[0].confidence >= 0.8)
    })

    it("handles common misspelling 'Senica' for Seneca", () => {
      const matches = matchAuthorsLocal("Senica", mockAuthors)
      assert.ok(matches.length > 0)
      assert.equal(matches[0].name, "Seneca")
    })

    it("handles typo 'Nietzche' for Friedrich Nietzsche", () => {
      const matches = matchAuthorsLocal("Nietzche", mockAuthors)
      assert.ok(matches.length > 0)
      assert.equal(matches[0].name, "Friedrich Nietzsche")
    })

    it("matches prefix 'Marc' or token 'Aurelius' to Marcus Aurelius", () => {
      const prefixMatches = matchAuthorsLocal("Marc", mockAuthors)
      assert.ok(prefixMatches.some((m) => m.name === "Marcus Aurelius"))

      const tokenMatches = matchAuthorsLocal("Aurelius", mockAuthors)
      assert.ok(tokenMatches.length > 0)
      assert.equal(tokenMatches[0].name, "Marcus Aurelius")
    })
  })

  describe("Quotation Content Author Identification", () => {
    it("identifies Marcus Aurelius from 'power over your mind' locus classicus", async () => {
      const result = await detectAuthorFromQuoteContent(
        "You have power over your mind - not outside events. Realize this, and you will find strength.",
        mockAuthors
      )

      assert.ok(result.detectedAuthor !== null)
      assert.equal(result.detectedAuthor.name, "Marcus Aurelius")
      assert.equal(result.detectedAuthor.matchType, "detected_from_quote")
      assert.ok(result.confidence >= 0.95)
      assert.ok(result.rationale?.includes("Meditations"))
    })

    it("identifies Seneca from 'suffer more often in imagination'", async () => {
      const result = await detectAuthorFromQuoteContent(
        "We suffer more often in imagination than in reality.",
        mockAuthors
      )

      assert.ok(result.detectedAuthor !== null)
      assert.equal(result.detectedAuthor.name, "Seneca")
      assert.ok(result.confidence >= 0.95)
    })

    it("identifies Mahatma Gandhi from 'be the change you wish to see'", async () => {
      const result = await detectAuthorFromQuoteContent(
        "Be the change that you wish to see in the world.",
        mockAuthors
      )

      assert.ok(result.detectedAuthor !== null)
      assert.equal(result.detectedAuthor.name, "Mahatma Gandhi")
      assert.ok(result.confidence >= 0.95)
    })

    it("identifies Martin Luther King Jr. from 'darkness cannot drive out darkness'", async () => {
      const result = await detectAuthorFromQuoteContent(
        "Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.",
        mockAuthors
      )

      assert.ok(result.detectedAuthor !== null)
      assert.equal(result.detectedAuthor.name, "Martin Luther King Jr.")
      assert.ok(result.confidence >= 0.95)
    })

    it("identifies Steve Jobs from 'stay hungry, stay foolish'", async () => {
      const result = await detectAuthorFromQuoteContent(
        "Stay hungry. Stay foolish.",
        mockAuthors
      )

      assert.ok(result.detectedAuthor !== null)
      assert.equal(result.detectedAuthor.name, "Steve Jobs")
      assert.ok(result.confidence >= 0.95)
    })

    it("identifies Socrates from 'unexamined life is not worth living'", async () => {
      const result = await detectAuthorFromQuoteContent(
        "The unexamined life is not worth living.",
        mockAuthors
      )

      assert.ok(result.detectedAuthor !== null)
      assert.equal(result.detectedAuthor.name, "Socrates")
      assert.ok(result.confidence >= 0.95)
    })

    it("handles empty or blank content gracefully", async () => {
      const result = await detectAuthorFromQuoteContent("   ", mockAuthors)
      assert.equal(result.detectedAuthor, null)
      assert.equal(result.confidence, 0)
    })
  })

  describe("Sorting & Popularity", () => {
    it("returns authors ordered by quoteCount when query is empty", () => {
      const results = matchAuthorsLocal("", mockAuthors, 5)
      assert.equal(results.length, 5)
      // Most quoted in mockAuthors is Mahatma Gandhi (60), then Mark Twain (52), Albert Einstein (50)
      assert.equal(results[0].name, "Mahatma Gandhi")
      assert.equal(results[1].name, "Mark Twain")
      assert.equal(results[2].name, "Albert Einstein")
    })
  })
})
