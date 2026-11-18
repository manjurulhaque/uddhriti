import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  generateCuratorAuthorBio,
  generateAuthorBio,
  streamAuthorBio,
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
        provider: string
        wordCount: number
      }

      assert.ok(doneData.bio.length > 100)
      assert.ok(doneData.seoDescription.length <= 160)
      assert.ok(Array.isArray(doneData.keyThemes))
      assert.ok(Array.isArray(doneData.notableWorks))
      assert.ok(doneData.wordCount > 50)

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
})
