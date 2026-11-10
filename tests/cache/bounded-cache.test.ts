import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { BoundedMemoryCache } from "../../src/lib/cache/bounded-cache"
import { revalidatePublicSurfaces } from "../../src/lib/revalidation"

describe("Cache: BoundedMemoryCache", () => {
  it("stores and retrieves cached values within TTL", () => {
    const cache = new BoundedMemoryCache<string, { title: string }>({
      maxSize: 10,
      ttlMs: 5000,
      autoInvalidate: false,
    })

    cache.set("key1", { title: "Item 1" })
    assert.deepEqual(cache.get("key1"), { title: "Item 1" })
    assert.equal(cache.has("key1"), true)
  })

  it("returns null for nonexistent keys", () => {
    const cache = new BoundedMemoryCache<string, number>({
      maxSize: 10,
      autoInvalidate: false,
    })

    assert.equal(cache.get("missing"), null)
    assert.equal(cache.has("missing"), false)
  })

  it("expires entries exceeding TTL", async () => {
    const cache = new BoundedMemoryCache<string, string>({
      maxSize: 10,
      ttlMs: 25,
      autoInvalidate: false,
    })

    cache.set("ephemeral", "value")
    assert.equal(cache.get("ephemeral"), "value")

    await new Promise((resolve) => setTimeout(resolve, 35))
    assert.equal(cache.get("ephemeral"), null)
    assert.equal(cache.has("ephemeral"), false)
  })

  it("enforces maxSize by evicting oldest entry in FIFO order", () => {
    const cache = new BoundedMemoryCache<string, number>({
      maxSize: 3,
      ttlMs: 60000,
      autoInvalidate: false,
    })

    cache.set("k1", 1)
    cache.set("k2", 2)
    cache.set("k3", 3)
    assert.equal(cache.size, 3)

    // Adding 4th item should evict oldest (k1)
    cache.set("k4", 4)
    assert.equal(cache.size, 3)
    assert.equal(cache.get("k1"), null)
    assert.equal(cache.get("k2"), 2)
    assert.equal(cache.get("k3"), 3)
    assert.equal(cache.get("k4"), 4)
  })

  it("updating existing key does not evict other entries", () => {
    const cache = new BoundedMemoryCache<string, number>({
      maxSize: 2,
      autoInvalidate: false,
    })

    cache.set("a", 10)
    cache.set("b", 20)
    cache.set("a", 15) // updating "a"

    assert.equal(cache.size, 2)
    assert.equal(cache.get("a"), 15)
    assert.equal(cache.get("b"), 20)
  })

  it("supports delete and clear operations", () => {
    const cache = new BoundedMemoryCache<string, string>({
      maxSize: 5,
      autoInvalidate: false,
    })

    cache.set("x", "1")
    cache.set("y", "2")

    assert.equal(cache.delete("x"), true)
    assert.equal(cache.get("x"), null)
    assert.equal(cache.delete("x"), false)

    cache.clear()
    assert.equal(cache.size, 0)
    assert.equal(cache.get("y"), null)
  })

  it("automatically clears when revalidatePublicData is triggered", () => {
    const cache = new BoundedMemoryCache<string, string>({
      maxSize: 10,
      autoInvalidate: true,
    })

    cache.set("live-data", "val")
    assert.equal(cache.get("live-data"), "val")

    revalidatePublicSurfaces()
    assert.equal(cache.get("live-data"), null)
  })
})
