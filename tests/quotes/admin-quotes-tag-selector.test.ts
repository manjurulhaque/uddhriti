import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  validateTagDistribution,
  balanceTagsToDistribution,
  selectAiAssistedTags,
  MAX_SELECTED_TAGS,
  MAX_TOPIC_TAGS,
  MAX_PER_OTHER_TYPE,
  type BaseTag,
} from "../../src/lib/quotes/tag-selector"

const mockCatalogTags: BaseTag[] = [
  // Topics (5)
  { id: "tag-top-1", name: "Wisdom", type: "TOPIC", description: "Insight and understanding" },
  { id: "tag-top-2", name: "Truth", type: "TOPIC", description: "Reality and honesty" },
  { id: "tag-top-3", name: "Freedom", type: "TOPIC", description: "Liberty and autonomy" },
  { id: "tag-top-4", name: "Justice", type: "TOPIC", description: "Fairness and rights" },
  { id: "tag-top-5", name: "Knowledge", type: "TOPIC", description: "Learning and science" },

  // Emotions (3)
  { id: "tag-emo-1", name: "Hope", type: "EMOTION", description: "Optimism and expectation" },
  { id: "tag-emo-2", name: "Fear", type: "EMOTION", description: "Anxiety and caution" },
  { id: "tag-emo-3", name: "Joy", type: "EMOTION", description: "Delight and happiness" },

  // Actions (3)
  { id: "tag-act-1", name: "Reflection", type: "ACTION", description: "Contemplation and self-examination" },
  { id: "tag-act-2", name: "Change", type: "ACTION", description: "Transformation and reform" },
  { id: "tag-act-3", name: "Service", type: "ACTION", description: "Helping others through duty" },

  // Virtues (3)
  { id: "tag-vir-1", name: "Courage", type: "VIRTUE", description: "Bravery facing adversity" },
  { id: "tag-vir-2", name: "Patience", type: "VIRTUE", description: "Calm endurance" },
  { id: "tag-vir-3", name: "Humility", type: "VIRTUE", description: "Modesty and restraint" },

  // Values (2)
  { id: "tag-val-1", name: "Discipline", type: "VALUE", description: "Self-control and order" },
  { id: "tag-val-2", name: "Integrity", type: "VALUE", description: "Moral consistency" },

  // States (2)
  { id: "tag-sta-1", name: "Peace", type: "STATE", description: "Serenity and harmony" },
  { id: "tag-sta-2", name: "Solitude", type: "STATE", description: "Aloneness and quiet" },

  // Time (2)
  { id: "tag-tim-1", name: "Memory", type: "TIME", description: "The past and remembrance" },
  { id: "tag-tim-2", name: "Legacy", type: "TIME", description: "What remains after action" },
]

describe("AI-Assisted Tag Selector & Taxonomy Balancer", () => {
  describe("validateTagDistribution", () => {
    it("validates a compliant set with 2 TOPIC and 5 distinct other types", () => {
      const validSet = [
        { id: "1", name: "Wisdom", type: "TOPIC" },
        { id: "2", name: "Truth", type: "TOPIC" },
        { id: "3", name: "Courage", type: "VIRTUE" },
        { id: "4", name: "Reflection", type: "ACTION" },
        { id: "5", name: "Discipline", type: "VALUE" },
        { id: "6", name: "Hope", type: "EMOTION" },
        { id: "7", name: "Peace", type: "STATE" },
      ]

      const check = validateTagDistribution(validSet)
      assert.equal(check.isValid, true)
      assert.equal(check.topicCount, 2)
      assert.equal(check.totalCount, 7)
      assert.equal(Object.keys(check.otherTypeCounts).length, 5)
    })

    it("rejects when more than 2 TOPIC tags are provided", () => {
      const invalidTopics = [
        { id: "1", name: "Wisdom", type: "TOPIC" },
        { id: "2", name: "Truth", type: "TOPIC" },
        { id: "3", name: "Freedom", type: "TOPIC" },
        { id: "4", name: "Courage", type: "VIRTUE" },
      ]

      const check = validateTagDistribution(invalidTopics)
      assert.equal(check.isValid, false)
      assert.ok(check.error?.includes("Maximum 2 Topic tags"))
    })

    it("rejects when more than 1 tag of the same non-TOPIC category is provided", () => {
      const duplicateEmotions = [
        { id: "1", name: "Wisdom", type: "TOPIC" },
        { id: "2", name: "Hope", type: "EMOTION" },
        { id: "3", name: "Joy", type: "EMOTION" }, // 2nd EMOTION
      ]

      const check = validateTagDistribution(duplicateEmotions)
      assert.equal(check.isValid, false)
      assert.ok(check.error?.includes("Only 1 tag allowed for category \"EMOTION\""))
    })

    it("rejects when total count exceeds 7", () => {
      const eightTags = [
        { id: "1", name: "Wisdom", type: "TOPIC" },
        { id: "2", name: "Truth", type: "TOPIC" },
        { id: "3", name: "Courage", type: "VIRTUE" },
        { id: "4", name: "Reflection", type: "ACTION" },
        { id: "5", name: "Discipline", type: "VALUE" },
        { id: "6", name: "Hope", type: "EMOTION" },
        { id: "7", name: "Peace", type: "STATE" },
        { id: "8", name: "Legacy", type: "TIME" },
      ]

      const check = validateTagDistribution(eightTags)
      assert.equal(check.isValid, false)
      assert.ok(check.error?.includes("Maximum 7 tags allowed"))
    })
  })

  describe("balanceTagsToDistribution", () => {
    it("greedily balances unbalanced candidates into exactly compliant set", () => {
      // 10 candidates with 4 TOPIC, 3 EMOTION, 2 VIRTUE, 1 ACTION
      const candidates = [
        { id: "top-1", name: "Wisdom", type: "TOPIC", score: 10 },
        { id: "top-2", name: "Truth", type: "TOPIC", score: 9 },
        { id: "top-3", name: "Freedom", type: "TOPIC", score: 8 },
        { id: "top-4", name: "Justice", type: "TOPIC", score: 7 },
        { id: "emo-1", name: "Hope", type: "EMOTION", score: 9.5 },
        { id: "emo-2", name: "Joy", type: "EMOTION", score: 8.5 },
        { id: "vir-1", name: "Courage", type: "VIRTUE", score: 9 },
        { id: "vir-2", name: "Patience", type: "VIRTUE", score: 6 },
        { id: "act-1", name: "Reflection", type: "ACTION", score: 8 },
        { id: "val-1", name: "Discipline", type: "VALUE", score: 7.5 },
      ]

      const balanced = balanceTagsToDistribution(candidates, 7, 2, 1)

      // Must have at most 7 total
      assert.ok(balanced.length <= 7)
      // Must have at most 2 TOPIC
      const topics = balanced.filter((t) => t.type.toUpperCase() === "TOPIC")
      assert.equal(topics.length, 2)
      // Must have at most 1 EMOTION (Hope, not Joy)
      const emotions = balanced.filter((t) => t.type.toUpperCase() === "EMOTION")
      assert.equal(emotions.length, 1)
      assert.equal(emotions[0].name, "Hope")
      // Output must pass strict validator
      const validation = validateTagDistribution(balanced)
      assert.equal(validation.isValid, true)
    })
  })

  describe("selectAiAssistedTags", () => {
    it("selects balanced tags for Marcus Aurelius quote", async () => {
      const result = await selectAiAssistedTags({
        content: "You have power over your mind - not outside events. Realize this, and you will find strength.",
        authorName: "Marcus Aurelius",
        categoryName: "Philosophy",
        availableTags: mockCatalogTags,
      })

      assert.ok(result.selectedTags.length > 0)
      assert.ok(result.selectedTags.length <= 7)

      // Validate taxonomy rule on AI selected set
      const validation = validateTagDistribution(result.selectedTags)
      assert.equal(validation.isValid, true)
      assert.ok(result.distribution.topicCount <= 2)
      assert.equal(result.distribution.totalCount, result.selectedTags.length)
    })

    it("handles empty or blank content gracefully", async () => {
      const result = await selectAiAssistedTags({
        content: "   ",
        availableTags: mockCatalogTags,
      })

      assert.equal(result.selectedTags.length, 0)
      assert.equal(result.distribution.totalCount, 0)
    })
  })
})
