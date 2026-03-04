import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { MonitorState } from '../state'
import type { AlertRouter } from '../alerts/router'
import type { ApiHealthResult } from '../collectors/api-health'

interface FarmConfig {
  supabase: { url: string; serviceRoleKey: string }
  thresholds: { SUPABASE_RETRY_INTERVAL_MS: number }
  localQueuePath: string
}

const KIMI_REVERT_THRESHOLD = 5

export class ApiFailoverResponder {
  private supabase: SupabaseClient | null = null

  constructor(
    private config: FarmConfig,
    private alertRouter: AlertRouter,
  ) {}

  private getClient(): SupabaseClient {
    if (!this.config.supabase.url) {
      throw new Error('SUPABASE_URL is not configured. Check .env or environment variables.')
    }
    if (!this.supabase) {
      this.supabase = createClient(this.config.supabase.url, this.config.supabase.serviceRoleKey)
    }
    return this.supabase
  }

  async evaluate(health: ApiHealthResult, state: MonitorState): Promise<void> {
    await this.handleKimi(health.kimi, state)
    await this.handleSupabase(health.supabase, state)
    await this.handleGitHub(health.github, state)
  }

  private async handleKimi(kimi: ApiHealthResult['kimi'], state: MonitorState): Promise<void> {
    if (kimi.status !== 'healthy') {
      if (!state.api.kimiDegradedSince) {
        state.api.kimiDegradedSince = Date.now()
      }
      state.api.kimiHealthyChecks = 0

      if (state.api.activeProvider !== 'deepseek') {
        state.api.activeProvider = 'deepseek'
        if (state.shouldAlert('kimi-failover', 'P1')) {
          await this.alertRouter.send(
            'P1',
            'API',
            'Kimi API degraded — switching to DeepSeek',
            `Kimi latency: ${kimi.latencyMs}ms, status: ${kimi.status}${kimi.error ? `, error: ${kimi.error}` : ''}`,
          )
          state.recordAlert('kimi-failover', 'P1')
        }
        await this.setActiveProvider('deepseek')
      }
    } else {
      state.api.kimiHealthyChecks++
      if (state.api.kimiDegradedSince && state.api.kimiHealthyChecks >= KIMI_REVERT_THRESHOLD) {
        state.api.kimiDegradedSince = null
        if (state.api.activeProvider !== 'kimi') {
          state.api.activeProvider = 'kimi'
          console.log('[api-failover] Kimi recovered, reverting to primary provider')
          await this.setActiveProvider('kimi')
        }
      }
    }
  }

  private async handleSupabase(
    supabase: ApiHealthResult['supabase'],
    state: MonitorState,
  ): Promise<void> {
    if (supabase.status === 'down') {
      if (!state.api.supabaseDown) {
        state.api.supabaseDown = true
        if (state.shouldAlert('supabase-down', 'P0')) {
          await this.alertRouter.send(
            'P0',
            'API',
            'Supabase connection lost',
            `Error: ${supabase.error || 'Connection failed'}. Builds will be queued locally.`,
          )
          state.recordAlert('supabase-down', 'P0')
        }
      }
      state.api.supabaseLastAttempt = Date.now()
    } else {
      if (state.api.supabaseDown) {
        state.api.supabaseDown = false
        console.log('[api-failover] Supabase connection restored')
        await this.alertRouter.send(
          'P2',
          'API',
          'Supabase connection restored',
          `Connection back online after ${state.api.supabaseLastAttempt ? Math.round((Date.now() - state.api.supabaseLastAttempt) / 1000) : '?'}s`,
        )
      }
    }
  }

  private async handleGitHub(
    github: ApiHealthResult['github'],
    state: MonitorState,
  ): Promise<void> {
    if (github.status === 'rate_limited') {
      if (!state.api.githubRateLimited) {
        state.api.githubRateLimited = true
        state.api.githubResetAt = github.resetAt
        const resetTime = new Date(github.resetAt).toISOString()
        if (state.shouldAlert('github-rate-limit', 'P1')) {
          await this.alertRouter.send(
            'P1',
            'API',
            'GitHub API rate limit approaching',
            `Remaining: ${github.remaining} requests. Resets at ${resetTime}. Pausing new repo creation.`,
          )
          state.recordAlert('github-rate-limit', 'P1')
        }
        await this.setGitHubPause(true, github.resetAt)
      }
    } else {
      if (state.api.githubRateLimited) {
        state.api.githubRateLimited = false
        state.api.githubResetAt = null
        console.log('[api-failover] GitHub rate limit cleared')
        await this.setGitHubPause(false, 0)
      }
    }
  }

  private async setActiveProvider(provider: string): Promise<void> {
    try {
      const client = this.getClient()
      await client.from('SystemConfig').upsert(
        {
          key: 'active_ai_provider',
          value: { provider, updatedAt: new Date().toISOString() },
          updatedBy: 'farm-monitor',
        },
        { onConflict: 'key' },
      )
    } catch (err) {
      console.error('[api-failover] Failed to update active provider in DB:', err)
    }
  }

  private async setGitHubPause(paused: boolean, resetAt: number): Promise<void> {
    try {
      const client = this.getClient()
      await client.from('SystemConfig').upsert(
        {
          key: 'github_builds_paused',
          value: {
            paused,
            resetAt: resetAt ? new Date(resetAt).toISOString() : null,
            updatedAt: new Date().toISOString(),
          },
          updatedBy: 'farm-monitor',
        },
        { onConflict: 'key' },
      )
    } catch (err) {
      console.error('[api-failover] Failed to update GitHub pause state:', err)
    }
  }
}
