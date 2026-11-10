import { describe, it, beforeEach } from "node:test"
import assert from "node:assert/strict"
import {
  quoteResolutionCache,
  pendingViewsBuffer,
  recordBufferedView,
  flushPendingViews,
} from "../../src/lib/quotes/view-counter-buffer"

describe("Quotes: ViewCounterBuffer (Concurrency & Scalability)", () => {
  beforeEach(() => {
    pendingViewsBuffer.clear()
    quoteResolutionCache.clear()
  })

  it("buffers view counts in memory and returns aggregated estimated views", () => {
    const quoteId = "test-quote-1"
    const initialViews = 100

    const view1 = recordBufferedView(quoteId, initialViews)
    assert.equal(view1, 101)
    assert.equal(pendingViewsBuffer.get(quoteId), 1)

    const view2 = recordBufferedView(quoteId, initialViews)
    assert.equal(view2, 102)
    assert.equal(pendingViewsBuffer.get(quoteId), 2)

    const view3 = recordBufferedView(quoteId, initialViews)
    assert.equal(view3, 103)
    assert.equal(pendingViewsBuffer.get(quoteId), 3)
  })

  it("isolates view counts across different quotes", () => {
    const q1 = "quote-alpha"
    const q2 = "quote-beta"

    recordBufferedView(q1, 50)
    recordBufferedView(q1, 50)
    recordBufferedView(q2, 200)

    assert.equal(pendingViewsBuffer.get(q1), 2)
    assert.equal(pendingViewsBuffer.get(q2), 1)
  })

  it("caches quote resolutions in bounded memory cache", () => {
    quoteResolutionCache.set("marcus-aurelius-slug", {
      id: "uuid-123",
      views: 450,
    })

    const resolved = quoteResolutionCache.get("marcus-aurelius-slug")
    assert.deepEqual(resolved, {
      id: "uuid-123",
      views: 450,
    })
  })

  it("flushPendingViews returns 0 when buffer is empty", async () => {
    const flushed = await flushPendingViews()
    assert.equal(flushed, 0)
    assert.equal(pendingViewsBuffer.size, 0)
  })
})

