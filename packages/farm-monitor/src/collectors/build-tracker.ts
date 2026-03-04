import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as net from 'net'

export interface BuildStatus {
  stuckBuilds: Array<{
    id: string
    commissionId: string
    studioAssignment: string | null
    createdAt: string
  }>
  recentFailures: Array<{ commissionId: string; failureCount: number; buildId: string }>
  recentResults: Array<{ id: string; commissionId: string; status: string; updatedAt: string }>
  queueDepth: number
}

interface FarmConfig {
  supabase: { url: string; serviceRoleKey: string }
  thresholds: {
    BUILD_STUCK_TIMEOUT_MS: number
    SUCCESS_RATE_WINDOW_MS: number
    QUEUE_DEPTH_SCALE_TRIGGER?: number
    QUEUE_DEPTH_SCALE_DURATION_MS?: number
  }
  redis?: { host: string; port: number; password: string }
}

export class BuildTracker {
  private config: FarmConfig
  private supabase: SupabaseClient | null = null

  constructor(config: FarmConfig) {
    this.config = config
  }

  private getClient(): SupabaseClient {
    if (!this.config.supabase.url) {
      throw new Error('SUPABASE_URL is not configured. Check .env or environment variables.')
    }
    if (!this.supabase) {
      this.supabase = createClient(this.config.supabase.url, this.config.supabase.serviceRoleKey)
    }
    return this.supabase
  }

  private async getRedisQueueDepth(): Promise<number> {
    const redis = this.config.redis
    if (!redis) return 0

    return new Promise((resolve) => {
      const socket = net.createConnection({ host: redis.host, port: redis.port }, () => {
        if (redis.password) socket.write(`AUTH ${redis.password}\r\n`)
        socket.write('LLEN bull:n8n:wait\r\n')
        socket.write('QUIT\r\n')
      })

      let data = ''
      socket.on('data', (chunk) => {
        data += chunk.toString()
      })
      socket.on('end', () => {
        const match = data.match(/:(\d+)/)
        resolve(match ? parseInt(match[1], 10) : 0)
      })
      socket.on('error', () => resolve(0))
      socket.setTimeout(5000, () => {
        socket.destroy()
        resolve(0)
      })
    })
  }

  async collect(): Promise<BuildStatus | null> {
    try {
      const client = this.getClient()
      const stuckCutoff = new Date(
        Date.now() - this.config.thresholds.BUILD_STUCK_TIMEOUT_MS,
      ).toISOString()
      const windowCutoff = new Date(
        Date.now() - this.config.thresholds.SUCCESS_RATE_WINDOW_MS,
      ).toISOString()

      const [stuckResult, failureResult, recentResult, queueDepth] = await Promise.all([
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
        this.getRedisQueueDepth(),
      ])

      return {
        stuckBuilds: stuckResult.data || [],
        recentFailures: (failureResult.data || []).map((b) => ({
          commissionId: b.commissionId,
          failureCount: b.failureCount,
          buildId: b.id,
        })),
        recentResults: recentResult.data || [],
        queueDepth,
      }
    } catch (err) {
      console.error('[build-tracker] Failed to collect build status:', err)
      return null
    }
  }
}
