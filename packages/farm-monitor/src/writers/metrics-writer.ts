import { createClient, SupabaseClient } from '@supabase/supabase-js'
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

export class MetricsWriter {
  private supabase: SupabaseClient | null = null

  constructor(private config: SupabaseConfig) {}

  private getClient(): SupabaseClient {
    if (!this.supabase) {
      this.supabase = createClient(this.config.url, this.config.serviceRoleKey)
    }
    return this.supabase
  }

  async writeStudioMetrics(
    studioId: string,
    metrics: ResourceMetrics,
    queueDepth: number,
  ): Promise<void> {
    try {
      await this.getClient()
        .from('StudioMetrics')
        .insert({
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
        })
    } catch (err) {
      console.error(`[metrics-writer] Failed to write StudioMetrics for ${studioId}:`, err)
    }
  }

  async writeApiHealthSnapshots(health: ApiHealthResult): Promise<void> {
    try {
      const rows = [
        {
          provider: 'kimi',
          status: health.kimi.status,
          latencyMs: health.kimi.latencyMs,
          details: health.kimi.error ? { error: health.kimi.error } : null,
        },
        {
          provider: 'supabase',
          status: health.supabase.status,
          latencyMs: health.supabase.latencyMs,
          details: health.supabase.error ? { error: health.supabase.error } : null,
        },
        {
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
      await this.getClient().from('ApiHealthSnapshot').insert(rows)
    } catch (err) {
      console.error('[metrics-writer] Failed to write ApiHealthSnapshots:', err)
    }
  }
}
