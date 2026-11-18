import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  checkQuoteAgainstApocryphaBase,
  auditSingleQuoteForHallucination,
  scanQuotesForHallucinations,
  resolveHallucination,
} from "../../src/lib/quotes/hallucination-detector"

describe("AI Hallucination & Fake Attribution Detector", () => {
  describe("Curatorial Apocrypha Knowledge Base", () => {
    it("detects Albert Einstein 'insanity is doing the same thing' misattribution", () => {
      const match = checkQuoteAgainstApocryphaBase(
        "Insanity is doing the same thing over and over again and expecting different results.",
        "Albert Einstein"
      )

      assert.ok(match, "Should match known apocrypha record")
      assert.strictEqual(match.verdict, "MISATTRIBUTED")
      assert.strictEqual(match.riskLevel, "HIGH")
      assert.strictEqual(match.realAuthor, "Rita Mae Brown")
      assert.ok(match.hallucinationReason.includes("Einstein Archives"))
      assert.strictEqual(match.suggestedAction, "flag_misattributed")
    })

    it("detects Marilyn Monroe 'well-behaved women' misattribution", () => {
      const match = checkQuoteAgainstApocryphaBase(
        "Well-behaved women seldom make history.",
        "Marilyn Monroe"
      )

      assert.ok(match)
      assert.strictEqual(match.verdict, "MISATTRIBUTED")
      assert.strictEqual(match.riskLevel, "HIGH")
      assert.strictEqual(match.realAuthor, "Laurel Thatcher Ulrich")
    })

    it("detects Winston Churchill 'success is not final, failure is not fatal' misattribution", () => {
      const match = checkQuoteAgainstApocryphaBase(
        "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        "Winston Churchill"
      )

      assert.ok(match)
      assert.strictEqual(match.verdict, "MISATTRIBUTED")
      assert.strictEqual(match.riskLevel, "HIGH")
    })

    it("detects Abraham Lincoln internet quote as spurious humor", () => {
      const match = checkQuoteAgainstApocryphaBase(
        "Don't believe everything you read on the Internet just because there's a picture with a quote next to it.",
        "Abraham Lincoln"
      )

      assert.ok(match)
      assert.strictEqual(match.verdict, "SPURIOUS")
      assert.strictEqual(match.riskLevel, "HIGH")
    })

    it("detects Mahatma Gandhi 'be the change' paraphrase", () => {
      const match = checkQuoteAgainstApocryphaBase(
        "Be the change that you wish to see in the world.",
        "Mahatma Gandhi"
      )

      assert.ok(match)
      assert.strictEqual(match.verdict, "DISPUTED")
      assert.strictEqual(match.riskLevel, "MEDIUM")
    })

    it("detects Nelson Mandela 'our deepest fear' misattribution", () => {
      const match = checkQuoteAgainstApocryphaBase(
        "Our deepest fear is not that we are inadequate. Our deepest fear is that we are powerful beyond measure.",
        "Nelson Mandela"
      )

      assert.ok(match)
      assert.strictEqual(match.verdict, "MISATTRIBUTED")
      assert.strictEqual(match.riskLevel, "HIGH")
      assert.strictEqual(match.realAuthor, "Marianne Williamson")
    })

    it("returns null for genuine quote not in apocrypha database", () => {
      const match = checkQuoteAgainstApocryphaBase(
        "Imagination is more important than knowledge. For knowledge is limited, whereas imagination embraces the entire world.",
        "Albert Einstein"
      )

      assert.strictEqual(match, null)
    })
  })

  describe("Linguistic Anachronism Detection", () => {
    it("flags ancient philosopher quoting modern technology terms as SPURIOUS", async () => {
      const result = await auditSingleQuoteForHallucination({
        id: "11111111-1111-1111-1111-111111111111",
        content: "Before seeking wisdom, one must ensure strong wifi and check one's email notifications.",
        authorName: "Marcus Aurelius",
        status: "PUBLISHED",
        attributionStatus: "CONFIRMED",
        isVerified: true,
      })

      assert.strictEqual(result.riskLevel, "HIGH")
      assert.strictEqual(result.verdict, "SPURIOUS")
      assert.ok(result.hallucinationReason.includes("Linguistic Anachronism"))
      assert.strictEqual(result.suggestedAction, "flag_misattributed")
    })

    it("flags classical thinker with corporate buzzwords as anachronism", async () => {
      const result = await auditSingleQuoteForHallucination({
        id: "22222222-2222-2222-2222-222222222222",
        content: "To overcome burnout, ancient leaders must align their quarterly synergy and bandwidth.",
        authorName: "Plato",
        status: "PUBLISHED",
        attributionStatus: "UNKNOWN",
        isVerified: false,
      })

      assert.strictEqual(result.riskLevel, "HIGH")
      assert.strictEqual(result.verdict, "SPURIOUS")
      assert.ok(result.hallucinationReason.includes("Linguistic Anachronism"))
    })
  })

  describe("Single Quote Hallucination Audit", () => {
    it("audits known apocrypha quote and returns full structured metadata", async () => {
      const audit = await auditSingleQuoteForHallucination({
        id: "33333333-3333-3333-3333-333333333333",
        content: "Insanity is doing the same thing over and over again and expecting different results.",
        authorName: "Albert Einstein",
        authorId: "auth-123",
        status: "PUBLISHED",
        attributionStatus: "CONFIRMED",
        isVerified: true,
      })

      assert.strictEqual(audit.quoteId, "33333333-3333-3333-3333-333333333333")
      assert.strictEqual(audit.riskLevel, "HIGH")
      assert.strictEqual(audit.verdict, "MISATTRIBUTED")
      assert.strictEqual(audit.suggestedRealAuthor, "Rita Mae Brown")
      assert.strictEqual(audit.suggestedAction, "flag_misattributed")
      assert.ok(audit.actualOrigin?.includes("Narcotics Anonymous"))
      assert.ok(audit.suggestedVerificationNote.includes("Rita Mae Brown"))
    })
  })

  describe("Scan Quotes Graceful Degradation", () => {
    it("handles empty quoteIds input without crashing", async () => {
      const result = await scanQuotesForHallucinations({
        quoteIds: [],
        limit: 10,
      })

      assert.ok(result.success)
      assert.strictEqual(result.totalScanned, 0)
      assert.strictEqual(result.items.length, 0)
    })
  })

  describe("Resolution Input Validation", () => {
    it("rejects invalid UUIDs", async () => {
      await assert.rejects(
        async () => {
          await resolveHallucination({
            quoteId: "invalid-uuid-format",
            action: "flag_misattributed",
          })
        },
        {
          name: "Error",
          message: "Invalid quote ID UUID",
        }
      )
    })
  })
})
