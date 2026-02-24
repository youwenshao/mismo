interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

// In-memory store. For production, use Upstash Redis (@upstash/ratelimit)
// to share state across serverless function instances.
const stores = new Map<string, Map<string, RateLimitEntry>>()

const CLEANUP_INTERVAL_MS = 60_000

function getOrCreateStore(key: string): Map<string, RateLimitEntry> {
  let store = stores.get(key)
  if (!store) {
    store = new Map()
    stores.set(key, store)

    if (typeof globalThis !== 'undefined') {
      const interval = setInterval(() => {
        const now = Date.now()
        for (const [id, entry] of store!) {
          if (entry.resetAt <= now) {
            store!.delete(id)
          }
        }
        if (store!.size === 0) {
          stores.delete(key)
          clearInterval(interval)
        }
      }, CLEANUP_INTERVAL_MS)

      if (typeof interval === 'object' && 'unref' in interval) {
        interval.unref()
      }
    }
  }
  return store
}

export function rateLimit(config: RateLimitConfig) {
  const storeKey = `${config.maxRequests}:${config.windowMs}`

  return {
    async check(identifier: string): Promise<RateLimitResult> {
      const store = getOrCreateStore(storeKey)
      const now = Date.now()
      const entry = store.get(identifier)

      if (!entry || entry.resetAt <= now) {
        const resetAt = now + config.windowMs
        store.set(identifier, { count: 1, resetAt })
        return { allowed: true, remaining: config.maxRequests - 1, resetAt }
      }

      entry.count++
      if (entry.count > config.maxRequests) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt }
      }

      return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetAt: entry.resetAt,
      }
    },
  }
}
