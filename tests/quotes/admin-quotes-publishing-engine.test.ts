import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  auditPublicationReadiness,
  computeScheduleRecommendation,
  generateHeuristicSocialCopy,
  generateCuratorialRecommendation,
  generateQuotePublishAssist,
} from "../../src/lib/quotes/publishing-engine"

describe("AI & Editorial Quote Publishing & Posting Engine", () => {
  it("audits publication readiness for a complete canonical quotation", () => {
    const readiness = auditPublicationReadiness({
      content: "You have power over your mind - not outside events. Realize this, and you will find strength.",
      authorName: "Marcus Aurelius",
      categoryName: "Philosophy",
      sourceTitle: "Meditations",
      tags: ["stoicism", "resilience", "wisdom"],
      meaning: "At its core, this quotation speaks to emotional self-mastery.",
      historicalContext: "Recorded in Marcus Aurelius's private journals along the Danube.",
      modernRelevance: "In our digital era, it serves as a shield against anxiety.",
      isVerified: true,
      attributionStatus: "CONFIRMED",
    })

    assert.ok(readiness.score >= 85, `Score should be >= 85, got ${readiness.score}`)
    assert.equal(readiness.level, "EXCELLENT")
    assert.equal(readiness.isReadyToPublish, true)
    assert.equal(readiness.warnings.length, 0)
    assert.ok(readiness.checks.every((chk) => chk.passed))
  })

  it("blocks publication and flags critical warning for misattributed quote", () => {
    const readiness = auditPublicationReadiness({
      content: "Insanity is doing the same thing over and over again and expecting different results.",
      authorName: "Albert Einstein",
      categoryName: "Wisdom",
      attributionStatus: "MISATTRIBUTED",
      isVerified: false,
    })

    assert.equal(readiness.level, "BLOCKED")
    assert.equal(readiness.isReadyToPublish, false)
    assert.ok(readiness.warnings.some((w) => w.includes("MISATTRIBUTED")))
  })

  it("identifies disputed quotes requiring curatorial review", () => {
    const readiness = auditPublicationReadiness({
      content: "Whatever you are, be a good one.",
      authorName: "Abraham Lincoln",
      categoryName: "Inspiration",
      attributionStatus: "DISPUTED",
      isVerified: false,
    })

    assert.ok(readiness.warnings.some((w) => w.includes("disputed")))
  })

  it("flags missing context and tags in partial drafts", () => {
    const readiness = auditPublicationReadiness({
      content: "Short daily habits compound over time.",
      authorName: "Unknown",
      categoryName: "",
      tags: [],
    })

    assert.ok(readiness.score < 50)
    assert.equal(readiness.isReadyToPublish, false)
    assert.ok(readiness.suggestions.length > 0)
  })

  it("recommends morning engagement slot for focus/discipline quotes", () => {
    const schedule = computeScheduleRecommendation({
      content: "Waste no more time arguing about what a good man should be. Be one.",
      categoryName: "Action",
    })

    assert.equal(schedule.recommendedSlot, "MORNING")
    assert.match(schedule.slotLabel, /Morning/i)
    assert.ok(schedule.suggestedDateTimeLocal.length > 10)
  })

  it("recommends evening contemplation slot for peace/stillness quotes", () => {
    const schedule = computeScheduleRecommendation({
      content: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.",
      categoryName: "Peace",
    })

    assert.equal(schedule.recommendedSlot, "EVENING")
    assert.match(schedule.slotLabel, /Evening/i)
  })

  it("generates multi-channel social media posting copy", () => {
    const socialCopy = generateHeuristicSocialCopy({
      content: "We suffer more often in imagination than in reality.",
      authorName: "Seneca",
      categoryName: "Stoicism",
      sourceTitle: "Letters from a Stoic",
      meaning: "Fear anticipates catastrophes that rarely materialize.",
      modernRelevance: "Mindfulness and cognitive reframing reduce anticipatory stress.",
      quoteUrl: "https://www.quotzen.com/quotes/we-suffer-more-often",
    })

    // Twitter
    assert.ok(socialCopy.twitter.charCount <= 280, "Twitter text must be <= 280 characters")
    assert.match(socialCopy.twitter.text, /Seneca/i)
    assert.ok(socialCopy.twitter.hashtags.length >= 2)

    // LinkedIn
    assert.match(socialCopy.linkedin.headline, /Seneca/i)
    assert.ok(socialCopy.linkedin.text.includes("Core Insight"))
    assert.ok(socialCopy.linkedin.text.includes("Modern Application"))
    assert.ok(socialCopy.linkedin.takeaways.length >= 2)

    // Instagram
    assert.match(socialCopy.instagram.caption, /Save this thought/i)

    // Quote of the Day
    assert.match(socialCopy.quoteOfTheDay.subjectLine, /Daily Wisdom/i)
    assert.ok(socialCopy.quoteOfTheDay.editorialHook.length > 20)
  })

  it("evaluates curatorial featuring and social card theme recommendations", () => {
    const readiness = auditPublicationReadiness({
      content: "The ultimate measure of a man is not where he stands in moments of comfort and convenience, but where he stands at times of challenge and controversy.",
      authorName: "Martin Luther King Jr.",
      categoryName: "Courage",
      sourceTitle: "Strength to Love",
      tags: ["courage", "leadership"],
      meaning: "True moral conviction is revealed in adversity.",
      historicalContext: "Sermon from civil rights movement.",
      modernRelevance: "Inspires ethical leadership under pressure.",
      isVerified: true,
      attributionStatus: "CONFIRMED",
    })

    const recommendation = generateCuratorialRecommendation(
      {
        content: "The ultimate measure of a man is not where he stands in moments of comfort and convenience...",
        categoryName: "Courage",
        isVerified: true,
        attributionStatus: "CONFIRMED",
      },
      readiness
    )

    assert.equal(recommendation.suggestFeatured, true)
    assert.ok(
      ["noir", "alabaster", "emerald", "monochrome"].includes(
        recommendation.recommendedCardTheme
      )
    )
  })

  it("orchestrates generateQuotePublishAssist with valid output and provider", async () => {
    const result = await generateQuotePublishAssist({
      content: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.",
      authorName: "Ralph Waldo Emerson",
      categoryName: "Individuality",
      sourceTitle: "Self-Reliance",
      meaning: "Resist conformity in favor of authentic selfhood.",
      historicalContext: "Published in 1841 Essays.",
      modernRelevance: "Vital antidote to social media peer pressure.",
      isVerified: true,
      attributionStatus: "CONFIRMED",
    })

    assert.ok(result.assist.readiness)
    assert.ok(result.assist.socialCopy)
    assert.ok(result.assist.schedule)
    assert.ok(result.assist.curatorial)
    assert.ok(result.provider === "gemini" || result.provider === "heuristic")
  })
})

