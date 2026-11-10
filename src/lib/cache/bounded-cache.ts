import { registerPublicDataInvalidator } from "@/lib/revalidation"

export interface BoundedCacheOptions {
  /** Maximum number of entries allowed before oldest is evicted. Default: 80 */
  maxSize?: number
  /** Cache item Time-To-Live in milliseconds. Default: 5 minutes (300,000ms) */
  ttlMs?: number
  /** Automatically register with public data invalidation pipeline. Default: true */
  autoInvalidate?: boolean
}

/**
 * Memory-bounded, TTL-expiring in-memory cache for warm Next.js server processes.
 * Prevents memory leaks by capping maximum entries and evicting in FIFO/LRU order.
 */
export class BoundedMemoryCache<K, V> {
  private map = new Map<K, { value: V; timestamp: number }>()
  readonly maxSize: number
  readonly ttlMs: number

  constructor(options?: BoundedCacheOptions) {
    this.maxSize = options?.maxSize ?? 80
    this.ttlMs = options?.ttlMs ?? 5 * 60 * 1000

    if (options?.autoInvalidate ?? true) {
      registerPublicDataInvalidator(() => {
        this.clear()
      })
    }
  }

  get(key: K): V | null {
    const entry = this.map.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.map.delete(key)
      return null
    }

    return entry.value
  }

  set(key: K, value: V): void {
    if (this.map.size >= this.maxSize && !this.map.has(key)) {
      const oldestKey = this.map.keys().next().value
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey)
      }
    }

    this.map.set(key, { value, timestamp: Date.now() })
  }

  has(key: K): boolean {
    return this.get(key) !== null
  }

  delete(key: K): boolean {
    return this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }
}

