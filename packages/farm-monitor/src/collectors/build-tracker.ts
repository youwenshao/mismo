import { createClient, SupabaseClient } from '@supabase/supabase-js'

export interface BuildStatus {
  stuckBuilds: Array<{ id: string; commissionId: string; studioAssignment: string | null; createdAt: string }>
  recentFailures: Array<{ commissionId: string; failureCount: number; buildId: string }>
  recentResults: Array<{ id: string; commissionId: string; status: string; updatedAt: string }>
}

interface FarmConfig {
  supabase: { url: string; serviceRoleKey: string }
  thresholds: { BUILD_STUCK_TIMEOUT_MS: number; SUCCESS_RATE_WINDOW_MS: number }
}

export class BuildTracker {
  private config: FarmConfig
  private supabase: SupabaseClient | null = null

  constructor(config: FarmConfig) {
    this.config = config
  }

  private getClient(): SupabaseClient {
    if (!this.supabase) {
      this.supabase = createClient(this.config.supabase.url, this.config.supabase.serviceRoleKey)
    }
    return this.supabase
  }

  async collect(): Promise<BuildStatus | null> {
    try {
      const client = this.getClient()
      const stuckCutoff = new Date(Date.now() - this.config.thresholds.BUILD_STUCK_TIMEOUT_MS).toISOString()
      const windowCutoff = new Date(Date.now() - this.config.thresholds.SUCCESS_RATE_WINDOW_MS).toISOString()

      const [stuckResult, failureResult, recentResult] = await Promise.all([
        client
          .from('Build')
          .select('id, commissionId, studioAssignment, createdAt')
          .eq('status', 'RUNNING')
          .lt('createdAt', stuckCutoff),
        client
          .from('Build')
          .select('id, commissionId, failureCount')
          .gte('failureCount', 2)
          .in('status', ['FAILED', 'RUNNING']),
        client
          .from('Build')
          .select('id, commissionId, status, updatedAt')
          .gte('updatedAt', windowCutoff)
          .in('status', ['SUCCESS', 'FAILED']),
      ])

      return {
        stuckBuilds: stuckResult.data || [],
        recentFailures: (failureResult.data || []).map(b => ({
          commissionId: b.commissionId,
          failureCount: b.failureCount,
          buildId: b.id,
        })),
        recentResults: recentResult.data || [],
      }
    } catch (err) {
      console.error('[build-tracker] Failed to collect build status:', err)
      return null
    }
  }
}
