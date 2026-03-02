/**
 * Rate limiter for AI API providers (primarily Kimi/Moonshot).
 *
 * Uses a semaphore to cap concurrent requests and exponential backoff
 * on 429 (rate-limited) responses. Wraps the Vercel AI SDK LanguageModel
 * interface transparently.
 */

import type { LanguageModel } from 'ai'

interface RateLimiterOptions {
  maxConcurrent: number
  backoffBaseMs?: number
  backoffMaxMs?: number
  maxRetries?: number
}

interface QueueEntry {
  resolve: () => void
  priority: number
}

export class ApiRateLimiter {
  private active = 0
  private queue: QueueEntry[] = []
  private readonly maxConcurrent: number
  private readonly backoffBaseMs: number
  private readonly backoffMaxMs: number
  private readonly maxRetries: number

  constructor(opts: RateLimiterOptions) {
    this.maxConcurrent = opts.maxConcurrent
    this.backoffBaseMs = opts.backoffBaseMs ?? 1000
    this.backoffMaxMs = opts.backoffMaxMs ?? 30_000
    this.maxRetries = opts.maxRetries ?? 3
  }

  get pending(): number { return this.queue.length }
  get activeCount(): number { return this.active }

  private async acquire(priority = 0): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++
      return
    }

    return new Promise<void>((resolve) => {
      this.queue.push({ resolve, priority })
      this.queue.sort((a, b) => b.priority - a.priority)
    })
  }

  private release(): void {
    this.active--
    const next = this.queue.shift()
    if (next) {
      this.active++
      next.resolve()
    }
  }

  async execute<T>(fn: () => Promise<T>, priority = 0): Promise<T> {
    await this.acquire(priority)
    try {
      return await this.executeWithRetry(fn)
    } finally {
      this.release()
    }
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (err) {
        lastError = err
        if (!this.isRetryable(err) || attempt === this.maxRetries) break

        const delay = Math.min(
          this.backoffBaseMs * Math.pow(2, attempt),
          this.backoffMaxMs,
        )
        await new Promise((r) => setTimeout(r, delay))
      }
    }
    throw lastError
  }

  private isRetryable(err: unknown): boolean {
    if (err instanceof Error) {
      const msg = err.message.toLowerCase()
      if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) {
        return true
      }
      if (msg.includes('503') || msg.includes('service unavailable')) {
        return true
      }
    }
    return false
  }
}

declare const process: { env: Record<string, string | undefined> } | undefined

function getEnv(key: string): string | undefined {
  try {
    return process?.env[key]
  } catch {
    return undefined
  }
}

const DEFAULT_MAX_CONCURRENT = 20
let _instance: ApiRateLimiter | null = null

export function getKimiRateLimiter(): ApiRateLimiter {
  if (!_instance) {
    const maxConcurrent = parseInt(getEnv('KIMI_MAX_CONCURRENT') || '', 10) || DEFAULT_MAX_CONCURRENT
    _instance = new ApiRateLimiter({ maxConcurrent })
  }
  return _instance
}

/**
 * Wraps a LanguageModel so that all doGenerate / doStream calls pass
 * through the rate limiter. Because LanguageModel is an interface with
 * many methods, we proxy the underlying model and only intercept the
 * methods that actually make HTTP requests.
 */
export function withRateLimit(model: LanguageModel, limiter?: ApiRateLimiter): LanguageModel {
  const rl = limiter ?? getKimiRateLimiter()

  return new Proxy(model, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      if (typeof value !== 'function') return value

      if (prop === 'doGenerate' || prop === 'doStream') {
        return (...args: unknown[]) => {
          return rl.execute(() => (value as Function).apply(target, args))
        }
      }

      return value.bind(target)
    },
  })
}
