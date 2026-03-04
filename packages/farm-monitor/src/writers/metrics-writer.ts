import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { ResourceMetrics } from '../collectors/resource'
import type { ApiHealthResult } from '../collectors/api-health'

interface SupabaseConfig {
  url: string
  serviceRoleKey: string
}

const STUDIO_NAMES: Record<string, string> = {
  'studio-1': 'Studio 1 (Main)',
  'studio-2': 'Studio 2 (Build)',
  'studio-3': 'Studio 3 (QA)',
}

const WRITE_TIMEOUT_MS = 10_000
const CIRCUIT_THRESHOLD = 5
const CIRCUIT_COOLDOWN_MS = 60_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Write timed out after ${ms}ms`)), ms)
    promise.then(
      (val) => {
        clearTimeout(timer)
        resolve(val)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

export class MetricsWriter {
  private supabase: SupabaseClient | null = null
  private consecutiveFailures = 0
  private circuitOpenUntil = 0

  constructor(private config: SupabaseConfig) {}

  private getClient(): SupabaseClient {
    if (!this.config.url) {
      throw new Error('SUPABASE_URL is not configured. Check .env or environment variables.')
    }
    if (!this.supabase) {
      this.supabase = createClient(this.config.url, this.config.serviceRoleKey)
    }
    return this.supabase
  }

  private isCircuitOpen(): boolean {
    if (this.consecutiveFailures < CIRCUIT_THRESHOLD) return false
    if (Date.now() > this.circuitOpenUntil) {
      console.log('[metrics-writer] Circuit breaker reset — attempting writes again')
      this.consecutiveFailures = 0
      return false
    }
    return true
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0
  }

  private recordFailure(): void {
    this.consecutiveFailures++
    if (this.consecutiveFailures >= CIRCUIT_THRESHOLD) {
      this.circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS
      console.error(
        `[metrics-writer] Circuit breaker OPEN after ${this.consecutiveFailures} consecutive failures. Writes paused for ${CIRCUIT_COOLDOWN_MS / 1000}s`,
      )
    }
  }

  async writeStudioMetrics(
    studioId: string,
    metrics: ResourceMetrics,
    queueDepth: number,
  ): Promise<void> {
    if (this.isCircuitOpen()) return

    try {
      const { error } = await withTimeout(
        this.getClient()
          .from('StudioMetrics')
          .insert({
            id: randomUUID(),
            studioId,
            studioName: STUDIO_NAMES[studioId] || studioId,
            cpuPercent: metrics.cpuPercent,
            ramPercent: metrics.ramPercent,
            diskPercent: metrics.diskPercent,
            networkIn: 0,
            networkOut: 0,
            queueDepth,
            containerCount: metrics.containerCount,
            workerRunning: metrics.n8nWorkerRunning,
            workerRestartCount: metrics.workerRestartCount,
          }),
        WRITE_TIMEOUT_MS,
      )

      if (error) throw error
      this.recordSuccess()
    } catch (err) {
      this.recordFailure()
      console.error(`[metrics-writer] Failed to write StudioMetrics for ${studioId}:`, err)
    }
  }

  async writeApiHealthSnapshots(health: ApiHealthResult): Promise<void> {
    if (this.isCircuitOpen()) return

    try {
      const rows = [
        {
          id: randomUUID(),
          provider: 'kimi',
          status: health.kimi.status,
          latencyMs: health.kimi.latencyMs,
          details: health.kimi.error ? { error: health.kimi.error } : null,
        },
        {
          id: randomUUID(),
          provider: 'supabase',
          status: health.supabase.status,
          latencyMs: health.supabase.latencyMs,
          details: health.supabase.error ? { error: health.supabase.error } : null,
        },
        {
          id: randomUUID(),
          provider: 'github',
          status: health.github.status,
          latencyMs: 0,
          details: {
            remaining: health.github.remaining,
            resetAt: health.github.resetAt,
            ...(health.github.error ? { error: health.github.error } : {}),
          },
        },
      ]
      const { error } = await withTimeout(
        this.getClient().from('ApiHealthSnapshot').insert(rows),
        WRITE_TIMEOUT_MS,
      )
      if (error) throw error
      this.recordSuccess()
    } catch (err) {
      this.recordFailure()
      console.error('[metrics-writer] Failed to write ApiHealthSnapshots:', err)
    }
  }
}
