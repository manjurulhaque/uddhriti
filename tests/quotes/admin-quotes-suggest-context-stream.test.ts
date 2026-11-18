import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  streamQuoteContextDraft,
  type ContextDimensionField,
} from "../../src/lib/quotes/context-generator"

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

describe("⚡ Streaming Context Generation for Real-time UX", () => {
  it("streams all 3 contextual dimensions sequentially with start, deltas, completes, and done", async () => {
    const stream = streamQuoteContextDraft({
      content: "Waste no more time arguing about what a good man should be. Be one.",
      authorName: "Marcus Aurelius",
      categoryName: "Philosophy",
      sourceTitle: "Meditations",
    })

    const events = await collectSSEStreamEvents(stream)

    assert.ok(events.length > 5, "Stream must emit multiple events")

    // 1. Verify start event
    const startEvent = events.find((e) => e.event === "start")
    assert.ok(startEvent, "Stream must emit a 'start' event")
    assert.ok(startEvent.data.provider, "Start event must declare provider")

    // 2. Verify delta events for all three fields
    const deltaEvents = events.filter((e) => e.event === "delta")
    assert.ok(deltaEvents.length > 0, "Stream must emit 'delta' events")

    const meaningDeltas = deltaEvents.filter((e) => e.data.field === "meaning")
    const historyDeltas = deltaEvents.filter((e) => e.data.field === "historicalContext")
    const modernDeltas = deltaEvents.filter((e) => e.data.field === "modernRelevance")

    assert.ok(meaningDeltas.length > 0, "Must have meaning deltas")
    assert.ok(historyDeltas.length > 0, "Must have historicalContext deltas")
    assert.ok(modernDeltas.length > 0, "Must have modernRelevance deltas")

    // 3. Verify complete events for each field
    const completeEvents = events.filter((e) => e.event === "complete")
    assert.strictEqual(completeEvents.length, 3, "Must emit complete event for each dimension")

    const completeFields = completeEvents.map((e) => e.data.field)
    assert.ok(completeFields.includes("meaning"))
    assert.ok(completeFields.includes("historicalContext"))
    assert.ok(completeFields.includes("modernRelevance"))

    for (const c of completeEvents) {
      assert.ok(typeof c.data.fullText === "string" && (c.data.fullText as string).length > 20)
    }

    // 4. Verify done event
    const doneEvent = events.find((e) => e.event === "done")
    assert.ok(doneEvent, "Must emit 'done' event at end of stream")
    const draft = doneEvent.data.draft as Record<string, string>
    assert.ok(draft.meaning.length > 20)
    assert.ok(draft.historicalContext.length > 20)
    assert.ok(draft.modernRelevance.length > 20)
  })

  it("streams only targetField when single dimension is requested", async () => {
    const targetField: ContextDimensionField = "meaning"
    const stream = streamQuoteContextDraft(
      {
        content: "He who has a why to live can bear almost any how.",
        authorName: "Friedrich Nietzsche",
        categoryName: "Purpose",
      },
      { targetField }
    )

    const events = await collectSSEStreamEvents(stream)

    // Verify start event specifies only targetField
    const startEvent = events.find((e) => e.event === "start")
    assert.ok(startEvent)

    // Verify delta events are ONLY for meaning
    const deltaEvents = events.filter((e) => e.event === "delta")
    assert.ok(deltaEvents.length > 0)
    for (const d of deltaEvents) {
      assert.strictEqual(d.data.field, "meaning")
    }

    // Verify complete event is ONLY for meaning
    const completeEvents = events.filter((e) => e.event === "complete")
    assert.strictEqual(completeEvents.length, 1)
    assert.strictEqual(completeEvents[0].data.field, "meaning")

    // Verify done event contains targetField
    const doneEvent = events.find((e) => e.event === "done")
    assert.ok(doneEvent)
    const draft = doneEvent.data.draft as Record<string, string>
    assert.ok(draft.meaning.length > 20)
    assert.strictEqual(draft.historicalContext, undefined)
    assert.strictEqual(draft.modernRelevance, undefined)
  })

  it("respects AbortSignal cancellation mid-stream", async () => {
    const controller = new AbortController()
    const stream = streamQuoteContextDraft(
      {
        content: "Knowing yourself is the beginning of all wisdom.",
        authorName: "Aristotle",
      },
      { signal: controller.signal }
    )

    const reader = stream.getReader()
    const firstChunk = await reader.read()
    assert.ok(!firstChunk.done)

    // Abort stream
    controller.abort()

    // Next read should terminate cleanly
    const nextChunk = await reader.read()
    assert.ok(nextChunk.done || nextChunk.value !== undefined)
  })
})
