import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  verifyQuoteHeuristic,
  verifyQuoteAttribution,
} from "../../src/lib/quotes/verification-engine"
import { quoteVerificationUpdateSchema } from "../../src/lib/validation/quote"

describe("AI & Curatorial Quote Verification Engine", () => {
  it("verifies canonical classical quotation with primary citation (Marcus Aurelius - Meditations)", () => {
    const result = verifyQuoteHeuristic({
      content: "You have power over your mind - not outside events. Realize this, and you will find strength.",
      authorName: "Marcus Aurelius",
    })

    assert.equal(result.attributionStatus, "CONFIRMED")
    assert.equal(result.isVerified, true)
    assert.ok(result.confidence >= 0.95, "Confidence should be high for canonical Stoic text")
    assert.equal(result.primarySourceTitle, "Meditations")
    assert.match(result.verificationNote, /Meditations.*Book IV/i)
    assert.match(result.explanation, /Marcus Aurelius/i)
  })

  it("verifies canonical epistolary quotation (Seneca - Letters from a Stoic)", () => {
    const result = verifyQuoteHeuristic({
      content: "We suffer more often in imagination than in reality.",
      authorName: "Seneca",
    })

    assert.equal(result.attributionStatus, "CONFIRMED")
    assert.equal(result.isVerified, true)
    assert.match(result.primarySourceTitle || "", /Epistulae Morales|Letters from a Stoic/i)
    assert.match(result.verificationNote, /Letter 13/i)
  })

  it("verifies civil rights canonical speech/essay (Martin Luther King Jr. - Strength to Love)", () => {
    const result = verifyQuoteHeuristic({
      content: "The ultimate measure of a man is not where he stands in moments of comfort and convenience, but where he stands at times of challenge and controversy.",
      authorName: "Martin Luther King Jr.",
    })

    assert.equal(result.attributionStatus, "CONFIRMED")
    assert.equal(result.isVerified, true)
    assert.equal(result.primarySourceTitle, "Strength to Love")
    assert.match(result.verificationNote, /Strength to Love.*1963/i)
  })

  it("detects famous misattribution to Einstein (Insanity is doing the same thing...)", () => {
    const result = verifyQuoteHeuristic({
      content: "Insanity is doing the same thing over and over again and expecting different results.",
      authorName: "Albert Einstein",
    })

    assert.equal(result.attributionStatus, "MISATTRIBUTED")
    assert.equal(result.isVerified, false)
    assert.ok(result.confidence <= 0.2, "Confidence must be low for confirmed misattribution")
    assert.match(result.verificationNote, /Narcotics Anonymous|Rita Mae Brown|misattribution/i)
    assert.match(result.explanation, /zero presence in Einstein's archives|Quote Investigator/i)
  })

  it("detects famous misattribution to Gandhi (Be the change you wish to see...)", () => {
    const result = verifyQuoteHeuristic({
      content: "Be the change you wish to see in the world.",
      authorName: "Mahatma Gandhi",
    })

    assert.equal(result.attributionStatus, "MISATTRIBUTED")
    assert.equal(result.isVerified, false)
    assert.match(result.verificationNote, /Arleen Lorrance|1974|change ourselves/i)
  })

  it("detects famous misattribution to Marie Antoinette (Let them eat cake)", () => {
    const result = verifyQuoteHeuristic({
      content: "Let them eat cake.",
      authorName: "Marie Antoinette",
    })

    assert.equal(result.attributionStatus, "MISATTRIBUTED")
    assert.equal(result.isVerified, false)
    assert.match(result.verificationNote, /Jean-Jacques Rousseau|Confessions/i)
  })

  it("identifies disputed quote (Will Durant summary attributed directly to Aristotle)", () => {
    const result = verifyQuoteHeuristic({
      content: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
      authorName: "Aristotle",
    })

    assert.equal(result.attributionStatus, "DISPUTED")
    assert.equal(result.isVerified, false)
    assert.match(result.verificationNote, /Will Durant.*The Story of Philosophy/i)
  })

  it("detects modern vocabulary anachronism in ancient author", () => {
    const result = verifyQuoteHeuristic({
      content: "When facing heavy deadline pressure and corporate burnout, practice inner peace.",
      authorName: "Epictetus",
    })

    assert.equal(result.attributionStatus, "DISPUTED")
    assert.equal(result.isVerified, false)
    assert.match(result.verificationNote, /modern vocabulary|anachronistic/i)
  })

  it("handles anonymous or unknown author gracefully", () => {
    const result = verifyQuoteHeuristic({
      content: "The early bird catches the worm.",
      authorName: "Unknown",
    })

    assert.equal(result.attributionStatus, "UNKNOWN")
    assert.equal(result.isVerified, false)
    assert.equal(result.confidence, 0.0)
    assert.match(result.verificationNote, /proverb|oral maxim/i)
  })

  it("executes verifyQuoteAttribution returning assessment and valid provider", async () => {
    const result = await verifyQuoteAttribution({
      content: "Go confidently in the direction of your dreams. Live the life you have imagined.",
      authorName: "Henry David Thoreau",
      sourceTitle: "Walden",
    })

    assert.ok(result.assessment, "Result should have assessment")
    assert.ok(result.assessment.attributionStatus, "Assessment should have attributionStatus")
    assert.ok(result.assessment.verificationNote.length > 20, "Verification note should be descriptive")
    assert.ok(
      result.provider === "gemini" || result.provider === "heuristic",
      "Provider should be gemini or heuristic"
    )
  })

  it("validates quoteVerificationUpdateSchema with valid and invalid payloads", () => {
    const valid = quoteVerificationUpdateSchema.safeParse({
      isVerified: true,
      attributionStatus: "CONFIRMED",
      verificationConfidence: 0.95,
      verificationNote: "Meditations Book IV Section 3.",
    })

    assert.ok(valid.success, "Should succeed with valid payload")
    assert.equal(valid.data.isVerified, true)
    assert.equal(valid.data.attributionStatus, "CONFIRMED")
    assert.equal(valid.data.verificationConfidence, 0.95)

    const invalidStatus = quoteVerificationUpdateSchema.safeParse({
      attributionStatus: "INVALID_STATUS",
    })
    assert.equal(invalidStatus.success, false, "Should reject invalid status")

    const outOfBoundsConfidence = quoteVerificationUpdateSchema.safeParse({
      verificationConfidence: 1.5,
    })
    assert.equal(outOfBoundsConfidence.success, false, "Should reject confidence > 1.0")

    const excessiveNote = quoteVerificationUpdateSchema.safeParse({
      verificationNote: "x".repeat(2001),
    })
    assert.equal(excessiveNote.success, false, "Should reject note exceeding 2,000 characters")
  })
})

