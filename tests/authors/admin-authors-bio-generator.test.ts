import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  generateCuratorAuthorBio,
  generateAuthorBio,
  streamAuthorBio,
  regenerateAuthorBioParagraph,
  sanitizeHumanBioText,
} from "../../src/lib/authors/bio-generator"

interface ParsedSSEEvent {
  event: string
  data: Record<string, unknown>
}

async function collectSSEStreamEvents(stream: ReadableStream<Uint8Array>): Promise<ParsedSSEEvent[]> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const events: ParsedSSEEvent[] = []
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    let currentEvent = "message"

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) {
        currentEvent = "message"
        continue
      }

      if (trimmed.startsWith("event:")) {
        currentEvent = trimmed.slice(6).trim()
        continue
      }

      if (trimmed.startsWith("data:")) {
        const jsonStr = trimmed.slice(5).trim()
        if (!jsonStr) continue

        try {
          const data = JSON.parse(jsonStr)
          events.push({ event: currentEvent, data })
        } catch {
          // Ignore non-json
        }
      }
    }
  }

  return events
}

describe("✨ AI-Assisted Author Bio Generator & SEO Optimizer", () => {
  describe("Anti-Cliché Sanitizer (sanitizeHumanBioText)", () => {
    it("strips robotic AI clichés and normalizes excessive spacing", () => {
      const roboticText =
        "In this rich tapestry of life, let us delve into the multifaceted legacy. It is worth noting that he was a pivotal beacon and a testament to courage. In conclusion, his journey continues."
      const cleaned = sanitizeHumanBioText(roboticText)

      assert.ok(!cleaned.includes("delve"), "Should not contain 'delve'")
      assert.ok(!cleaned.includes("tapestry"), "Should not contain 'tapestry'")
      assert.ok(!cleaned.includes("beacon"), "Should not contain 'beacon'")
      assert.ok(!cleaned.includes("testament"), "Should not contain 'testament'")
      assert.ok(!cleaned.includes("multifaceted"), "Should not contain 'multifaceted'")
      assert.ok(!cleaned.includes("pivotal"), "Should not contain 'pivotal'")
      assert.ok(!cleaned.includes("in conclusion"), "Should not contain 'in conclusion'")
      assert.ok(!cleaned.includes("it is worth noting"), "Should not contain 'it is worth noting'")
    })

    it("strips expanded subtle AI tropes and cleans orphaned punctuation", () => {
      const subtleAIText =
        "His work is a cornerstone of modern thought, showing quintessential brilliance and unwavering resolve. It left an indelible mark on society, serves as a reminder of our potential, and explores the dynamic interplay across every realm with an enduring legacy etched into history."
      const cleaned = sanitizeHumanBioText(subtleAIText)

      assert.ok(!cleaned.includes("cornerstone"), "Should not contain 'cornerstone'")
      assert.ok(!cleaned.includes("quintessential"), "Should not contain 'quintessential'")
      assert.ok(!cleaned.includes("unwavering"), "Should not contain 'unwavering'")
      assert.ok(!cleaned.includes("indelible mark"), "Should not contain 'indelible mark'")
      assert.ok(!cleaned.includes("serves as a reminder"), "Should not contain 'serves as a reminder'")
      assert.ok(!cleaned.includes("dynamic interplay"), "Should not contain 'dynamic interplay'")
      assert.ok(!cleaned.includes("enduring legacy"), "Should not contain 'enduring legacy'")
      assert.ok(!cleaned.includes("etched into"), "Should not contain 'etched into'")
      assert.ok(!cleaned.includes("realm"), "Should not contain 'realm'")
      assert.ok(!cleaned.includes(",,"), "Should not contain double commas")
      assert.ok(!cleaned.includes(" ,"), "Should not contain space before comma")
    })

    it("preserves sentence completeness and prevents missing sentence parts when sanitizing", () => {
      const sentence =
        "His multifaceted career in the realm of letters was a cornerstone of modern literature. His unwavering dedication left an indelible mark on history."
      const cleaned = sanitizeHumanBioText(sentence)

      assert.ok(!cleaned.includes("multifaceted"))
      assert.ok(!cleaned.includes("realm"))
      assert.ok(!cleaned.includes("cornerstone"))
      assert.ok(!cleaned.includes("unwavering"))
      assert.ok(!cleaned.includes("indelible mark"))

      // Must not leave grammatical gaps like "in of letters", "was of modern", "left an on history"
      assert.ok(!cleaned.includes("in of"), "Should not leave dangling preposition 'in of'")
      assert.ok(!cleaned.includes("was of modern"), "Should not leave missing noun 'was of modern'")
      assert.ok(!cleaned.includes("an on history"), "Should not leave dangling article 'an on history'")
      assert.ok(cleaned.includes("career"), "Should preserve noun 'career'")
      assert.ok(cleaned.includes("letters"), "Should preserve 'letters'")
      assert.ok(cleaned.includes("modern literature"), "Should preserve 'modern literature'")
      assert.ok(cleaned.includes("dedication"), "Should preserve 'dedication'")
      assert.ok(cleaned.includes("history"), "Should preserve 'history'")
    })
  })

  describe("Perspective Framing Angles (generateCuratorAuthorBio)", () => {
    it("adapts narrative when perspective is crucible", () => {
      const result = generateCuratorAuthorBio({
        name: "Hypatia of Alexandria",
        profession: "Mathematician & Philosopher",
        perspective: "crucible",
      })

      assert.ok(result.bio.includes("crisis and historical turbulence"), "Should mention crisis and turbulence")
      assert.ok(result.bio.includes("tested by circumstance"), "Should reference testing by circumstance")
    })

    it("adapts narrative when perspective is modern", () => {
      const result = generateCuratorAuthorBio({
        name: "Michel de Montaigne",
        profession: "Essayist & Philosopher",
        perspective: "modern",
      })

      assert.ok(result.bio.includes("hyper-connectivity"), "Should emphasize modern fragmentation and hyper-connectivity")
    })

    it("adapts narrative when perspective is paradox", () => {
      const result = generateCuratorAuthorBio({
        name: "Arthur Schopenhauer",
        profession: "Philosopher",
        perspective: "paradox",
      })

      assert.ok(result.bio.includes("unresolved contradictions"), "Should emphasize human contradictions")
    })
  })

  describe("Canonical Author Knowledge Base (generateCuratorAuthorBio)", () => {
    it("returns rich humanized biography and valid SEO snippet for Marcus Aurelius", () => {
      const result = generateCuratorAuthorBio({
        name: "Marcus Aurelius",
        profession: "Roman Emperor & Stoic Philosopher",
      })

      assert.equal(result.provider, "curator")
      assert.ok(result.bio.includes("Meditations"), "Should reference Meditations")
      assert.ok(result.bio.includes("Danube"), "Should reference historical Danube frontier")
      assert.ok(result.seoDescription.length <= 160, `SEO description should be <= 160 chars, got ${result.seoDescription.length}`)
      assert.ok(result.seoDescription.length >= 50, "SEO description should have meaningful length")
      assert.ok(result.keyThemes.includes("Stoic Resilience"), "Should contain Stoic Resilience theme")
      assert.ok(result.notableWorks.includes("Meditations"), "Should contain Meditations")
      assert.ok(result.wordCount > 100, `Expected word count > 100, got ${result.wordCount}`)
      assert.ok(result.companionThinkers.influences.includes("Epictetus"), "Should identify Epictetus as influence")
      assert.ok(result.companionThinkers.contrasts.includes("Epicurus"), "Should identify Epicurus as contrast")
      assert.ok(result.faqs.length >= 2, "Should provide at least 2 FAQ pairs for rich snippet schema")
      assert.ok(result.faqs[0].question.includes("Marcus Aurelius"), "FAQ question should name the author")
    })

    it("returns rich biography and valid SEO snippet for Seneca", () => {
      const result = generateCuratorAuthorBio({
        name: "Seneca the Younger",
        profession: "Roman Stoic Philosopher",
      })

      assert.equal(result.provider, "curator")
      assert.ok(result.bio.includes("Letters from a Stoic"), "Should mention Letters from a Stoic")
      assert.ok(result.seoDescription.length <= 160)
      assert.ok(result.notableWorks.length > 0)
    })

    it("returns clean biography without clichés for Ralph Waldo Emerson", () => {
      const result = generateCuratorAuthorBio({
        name: "Ralph Waldo Emerson",
      })

      assert.equal(result.provider, "curator")
      assert.ok(result.bio.includes("Self-Reliance"))
      assert.ok(result.bio.includes("Transcendentalism"))
      assert.ok(!result.bio.includes("beacon"), "Should not have cliché word 'beacon'")
      assert.ok(result.seoDescription.length <= 160)
    })
  })

  describe("Dynamic Heuristic Bio Generation (Generic Authors)", () => {
    it("synthesizes high-quality 3-paragraph bio for non-canonical authors", () => {
      const result = generateCuratorAuthorBio({
        name: "Ada Lovelace",
        profession: "Mathematician & Computing Pioneer",
        nationality: "English",
        birthYear: 1815,
        deathYear: 1852,
        knownWorks: ["Sketch of the Analytical Engine"],
        sampleQuotes: ["That brain of mine is something more than merely mortal."],
      })

      assert.equal(result.provider, "curator")
      assert.ok(result.bio.includes("Ada Lovelace"))
      assert.ok(result.bio.includes("(1815–1852)"))
      assert.ok(result.bio.includes("English Mathematician & Computing Pioneer"))
      assert.ok(result.bio.includes("Sketch of the Analytical Engine"))
      assert.ok(result.bio.includes("\n\n"), "Should have distinct paragraphs")
      assert.ok(result.seoDescription.length <= 160, `SEO snippet <= 160 chars, got ${result.seoDescription.length}`)
      assert.ok(result.keyThemes.length >= 3)
      assert.deepEqual(result.notableWorks, ["Sketch of the Analytical Engine"])
      assert.ok(result.companionThinkers.influences.length > 0)
      assert.ok(result.faqs.length >= 2, "Dynamic heuristic should generate FAQ pairs")
      assert.ok(result.faqs[0].question.includes("Ada Lovelace"))
    })
  })

  describe("Quotzen Data Grounding (RAG & Internal Linking)", () => {
    it("anchors primary top quote organically into Paragraph 2 of curator bio", () => {
      const result = generateCuratorAuthorBio({
        name: "Hannah Arendt",
        profession: "Political Philosopher",
        primaryQuote: {
          content: "The sad truth is that most evil is done by people who never make up their minds to be good or evil.",
          sourceTitle: "The Life of the Mind",
        },
      })

      assert.ok(
        result.bio.includes("The sad truth is that most evil is done"),
        "Bio should contain primary quote text"
      )
    })

    it("weaves internal markdown links for verified works and categories", () => {
      const result = generateCuratorAuthorBio({
        name: "Hannah Arendt",
        profession: "Political Theorist",
        linkedWorks: [
          { title: "The Human Condition", slug: "the-human-condition" },
        ],
        linkedCategories: [
          { name: "Political Philosophy", slug: "political-philosophy" },
        ],
      })

      assert.ok(
        result.bio.includes("[The Human Condition](/sources/the-human-condition)"),
        "Bio should format work as internal markdown link"
      )
      assert.ok(
        result.keyThemes.includes("Political Philosophy"),
        "Key themes should include linked category name"
      )
      assert.ok(
        result.notableWorks.includes("The Human Condition"),
        "Notable works should include linked work title"
      )
    })

    it("incorporates authority grounding summary in curator fallback", () => {
      const result = generateCuratorAuthorBio({
        name: "Hypatia of Alexandria",
        profession: "Hellenistic Mathematician",
        authorityGroundingSummary: "Head of the Neoplatonic school at Alexandria, renowned for geometry commentaries.",
      })

      assert.ok(
        result.bio.includes("Head of the Neoplatonic school at Alexandria"),
        "Bio should incorporate authority grounding facts"
      )
    })
  })

  describe("End-to-End generateAuthorBio", () => {
    it("resolves successfully with structured result", async () => {
      const result = await generateAuthorBio({
        name: "Friedrich Nietzsche",
        tone: "philosophical",
        length: "balanced",
      })

      assert.ok(result.bio.length > 100)
      assert.ok(result.seoDescription.length <= 160)
      assert.ok(Array.isArray(result.keyThemes))
      assert.ok(Array.isArray(result.notableWorks))
      assert.ok(result.wordCount > 50)
      assert.ok(["gemini", "curator"].includes(result.provider))
    })
  })

  describe("Server-Sent Events (SSE) Streaming (streamAuthorBio)", () => {
    it("streams start, deltas, complete_bio, and done events properly", async () => {
      const stream = streamAuthorBio({
        name: "Mahatma Gandhi",
        tone: "humanized",
        length: "balanced",
      })

      const events = await collectSSEStreamEvents(stream)

      const startEvents = events.filter((e) => e.event === "start")
      assert.equal(startEvents.length, 1, "Should emit exactly 1 start event")

      const deltaEvents = events.filter((e) => e.event === "delta")
      assert.ok(deltaEvents.length >= 1, `Expected at least one delta, got ${deltaEvents.length}`)

      const completeBioEvents = events.filter((e) => e.event === "complete_bio")
      assert.equal(completeBioEvents.length, 1, "Should emit exactly 1 complete_bio event")

      const doneEvents = events.filter((e) => e.event === "done")
      assert.equal(doneEvents.length, 1, "Should emit exactly 1 done event")

      const doneData = doneEvents[0].data as {
        bio: string
        seoDescription: string
        keyThemes: string[]
        notableWorks: string[]
        companionThinkers: {
          influences: string[]
          influenced: string[]
          contrasts: string[]
        }
        faqs: Array<{ question: string; answer: string }>
        provider: string
        wordCount: number
      }

      assert.ok(doneData.bio.length > 100)
      assert.ok(doneData.seoDescription.length <= 160)
      assert.ok(Array.isArray(doneData.keyThemes))
      assert.ok(Array.isArray(doneData.notableWorks))
      assert.ok(doneData.wordCount > 50)
      assert.ok(Array.isArray(doneData.companionThinkers.influences))
      assert.ok(Array.isArray(doneData.faqs) && doneData.faqs.length >= 2)

      // Reconstructed delta text matches completed bio
      const accumulatedFromDeltas = deltaEvents
        .map((e) => (e.data as { text: string }).text)
        .join("")
        .trim()
      assert.equal(sanitizeHumanBioText(accumulatedFromDeltas), doneData.bio)
    })

    it("terminates gracefully when AbortSignal triggers mid-stream", async () => {
      const controller = new AbortController()

      const stream = streamAuthorBio(
        {
          name: "Marcus Aurelius",
          tone: "philosophical",
        },
        { signal: controller.signal }
      )

      const reader = stream.getReader()
      let chunksReceived = 0

      while (true) {
        const { done } = await reader.read()
        if (done) break

        chunksReceived++
        if (chunksReceived >= 3) {
          controller.abort()
        }
      }

      assert.ok(chunksReceived >= 3, "Received initial chunks before abort")
    })
  })

  describe("Interactive Paragraph Regeneration (regenerateAuthorBioParagraph)", () => {
    const sampleFullBio = [
      "Hannah Arendt stands as an influential political theorist whose intellectual footprint continues to shape conversations on authority and human purpose.",
      "Across notable contributions including The Human Condition, their writing explores the banality of evil with unflinching moral clarity.",
      "Today, the timeless reflections of Hannah Arendt endure as essential reading for anyone seeking emotional fortitude and moral courage.",
    ].join("\n\n")

    it("regenerates paragraph 1 (index 1) while preserving paragraph 0 and paragraph 2", async () => {
      const result = await regenerateAuthorBioParagraph({
        authorName: "Hannah Arendt",
        profession: "Political Theorist",
        paragraphIndex: 1,
        currentBio: sampleFullBio,
        instruction: "Emphasize her concept of the banality of evil and active citizenship",
      })

      assert.equal(result.paragraphIndex, 1)
      assert.ok(result.paragraph.length > 20, "Regenerated paragraph should have content")

      const parts = result.fullBio.split(/\n\n+/)
      assert.equal(parts.length, 3, "Should preserve 3 paragraphs")
      assert.equal(parts[0], "Hannah Arendt stands as an influential political theorist whose intellectual footprint continues to shape conversations on authority and human purpose.")
      assert.equal(parts[2], "Today, the timeless reflections of Hannah Arendt endure as essential reading for anyone seeking emotional fortitude and moral courage.")
      assert.equal(parts[1], result.paragraph)
    })

    it("handles boundary indices gracefully (clamping out-of-range index)", async () => {
      const result = await regenerateAuthorBioParagraph({
        authorName: "Hannah Arendt",
        profession: "Political Theorist",
        paragraphIndex: 99,
        currentBio: sampleFullBio,
      })

      assert.equal(result.paragraphIndex, 2, "Should clamp index 99 to last paragraph (2)")
      const parts = result.fullBio.split(/\n\n+/)
      assert.equal(parts.length, 3)
    })
  })
})
