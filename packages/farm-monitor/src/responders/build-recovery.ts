import { NodeSSH } from 'node-ssh'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { MonitorState } from '../state'
import type { AlertRouter } from '../alerts/router'
import type { BuildStatus } from '../collectors/build-tracker'

interface FarmConfig {
  ssh: { user: string; keyPath: string; passphrase?: string }
  studios: Array<{ id: string; host: string; role: string; workerConcurrency: number }>
  supabase: { url: string; serviceRoleKey: string }
  thresholds: {
    BUILD_MAX_RETRIES: number
    SUCCESS_RATE_CRITICAL: number
    SUCCESS_RATE_WINDOW_MS: number
    QUEUE_DEPTH_SCALE_TRIGGER?: number
    QUEUE_DEPTH_SCALE_DURATION_MS?: number
  }
}

export class BuildRecoveryResponder {
  private supabase: SupabaseClient | null = null

  constructor(
    private config: FarmConfig,
    private alertRouter: AlertRouter,
  ) {}

  private getClient(): SupabaseClient {
    if (!this.supabase) {
      this.supabase = createClient(this.config.supabase.url, this.config.supabase.serviceRoleKey)
    }
    return this.supabase
  }

  async evaluate(builds: BuildStatus | null, state: MonitorState): Promise<void> {
    if (!builds) return

    await this.handleStuckBuilds(builds.stuckBuilds, state)
    await this.handleRepeatedFailures(builds.recentFailures, state)
    this.updateSuccessRate(builds.recentResults, state)
    await this.checkSuccessRate(state)
    await this.checkQueueDepth(builds.queueDepth, state)
  }

  private async handleStuckBuilds(
    stuckBuilds: BuildStatus['stuckBuilds'],
    state: MonitorState,
  ): Promise<void> {
    for (const build of stuckBuilds) {
      const alertKey = `stuck-build-${build.id}`
      if (!state.shouldAlert(alertKey, 'P1')) continue

      await this.alertRouter.send(
        'P1',
        'BUILD',
        `Build stuck >1hr`,
        `Build ${build.id} for commission ${build.commissionId} on ${build.studioAssignment || 'unknown'}`,
        build.studioAssignment || undefined,
      )
      state.recordAlert(alertKey, 'P1')

      if (build.studioAssignment) {
        await this.killBuildOnStudio(build.studioAssignment, build.id)
      }

      try {
        await this.getClient()
          .from('Build')
          .update({
            status: 'FAILED',
            errorLogs: {
              reason: 'Auto-killed: exceeded 1-hour timeout',
              killedAt: new Date().toISOString(),
            },
          })
          .eq('id', build.id)
      } catch (err) {
        console.error(`[build-recovery] Failed to update build ${build.id}:`, err)
      }
    }
  }

  private async handleRepeatedFailures(
    failures: BuildStatus['recentFailures'],
    state: MonitorState,
  ): Promise<void> {
    for (const build of failures) {
      if (build.failureCount >= this.config.thresholds.BUILD_MAX_RETRIES) {
        const alertKey = `escalate-${build.commissionId}`
        if (!state.shouldAlert(alertKey, 'P0')) continue

        await this.alertRouter.send(
          'P0',
          'BUILD',
          `Commission ${build.commissionId} failed ${build.failureCount} times — escalating`,
          `Build ${build.buildId} has failed ${build.failureCount} times. Escalating to human review.`,
        )
        state.recordAlert(alertKey, 'P0')

        try {
          await this.getClient()
            .from('Commission')
            .update({
              status: 'ESCALATED',
            })
            .eq('id', build.commissionId)

          await this.getClient()
            .from('Build')
            .update({
              humanReview: true,
            })
            .eq('id', build.buildId)
        } catch (err) {
          console.error(
            `[build-recovery] Failed to escalate commission ${build.commissionId}:`,
            err,
          )
        }
      }
    }
  }

  private updateSuccessRate(
    recentResults: BuildStatus['recentResults'],
    state: MonitorState,
  ): void {
    state.pruneOldBuildResults(this.config.thresholds.SUCCESS_RATE_WINDOW_MS)

    for (const result of recentResults) {
      const existing = state.builds.recentResults.find(
        (r) =>
          r.commissionId === result.commissionId &&
          r.timestamp === new Date(result.updatedAt).getTime(),
      )
      if (!existing) {
        state.builds.recentResults.push({
          commissionId: result.commissionId,
          success: result.status === 'SUCCESS',
          timestamp: new Date(result.updatedAt).getTime(),
        })
      }
    }
  }

  private async checkSuccessRate(state: MonitorState): Promise<void> {
    const rate = state.getSuccessRate()
    if (state.builds.recentResults.length < 3) return

    if (rate < this.config.thresholds.SUCCESS_RATE_CRITICAL) {
      if (state.shouldAlert('low-success-rate', 'P0')) {
        const total = state.builds.recentResults.length
        const failures = state.builds.recentResults.filter((r) => !r.success).length
        await this.alertRouter.send(
          'P0',
          'BUILD',
          `Build success rate critical: ${Math.round(rate * 100)}%`,
          `${failures}/${total} builds failed in the last hour. Threshold: ${this.config.thresholds.SUCCESS_RATE_CRITICAL * 100}%`,
        )
        state.recordAlert('low-success-rate', 'P0')
      }
    }
  }

  private async checkQueueDepth(queueDepth: number, state: MonitorState): Promise<void> {
    const trigger = this.config.thresholds.QUEUE_DEPTH_SCALE_TRIGGER ?? 20
    const durationMs = this.config.thresholds.QUEUE_DEPTH_SCALE_DURATION_MS ?? 60 * 60_000

    if (queueDepth < 0) return

    if (queueDepth > trigger) {
      if (!state.builds.queueDepthHighSince) {
        state.builds.queueDepthHighSince = Date.now()
      }

      const elapsed = Date.now() - state.builds.queueDepthHighSince
      if (elapsed >= durationMs && state.shouldAlert('queue-depth-high', 'P1')) {
        await this.alertRouter.send(
          'P1',
          'BUILD',
          `Queue depth sustained >${trigger} for >${Math.round(elapsed / 60_000)}min`,
          `Current queue depth: ${queueDepth}. Consider adding Studio 4 to increase build capacity.`,
        )
        state.recordAlert('queue-depth-high', 'P1')
      }
    } else {
      state.builds.queueDepthHighSince = null
    }
  }

  private async killBuildOnStudio(studioId: string, buildId: string): Promise<void> {
    const host = this.config.studios.find((s) => s.id === studioId)?.host
    if (!host) return

    const ssh = new NodeSSH()
    try {
      await ssh.connect({
        host,
        username: this.config.ssh.user,
        privateKeyPath: this.config.ssh.keyPath,
        passphrase: this.config.ssh.passphrase,
        readyTimeout: 30_000,
      })
      await ssh.execCommand(
        `docker ps --filter label=build_id=${buildId} -q | xargs -r docker kill 2>/dev/null || true`,
      )
    } catch (err) {
      console.error(`[build-recovery] Failed to kill build on ${studioId}:`, err)
    } finally {
      ssh.dispose()
    }
  }
}
