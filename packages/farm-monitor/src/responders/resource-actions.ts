import { NodeSSH } from 'node-ssh'
import type { MonitorState } from '../state'
import type { AlertRouter } from '../alerts/router'
import type { ResourceMetrics } from '../collectors/resource'

interface FarmConfig {
  thresholds: {
    RAM_WARN_PERCENT: number
    RAM_WARN_DURATION_MS: number
    DISK_CRITICAL_PERCENT: number
    CPU_CRITICAL_PERCENT: number
    CPU_CRITICAL_DURATION_MS: number
    WORKER_RESTART_THRESHOLD: number
    WORKER_RESTART_WINDOW_MS: number
  }
  ssh: { user: string; keyPath: string }
  studios: Array<{ id: string; host: string; role: string }>
}

export class ResourceResponder {
  constructor(
    private config: FarmConfig,
    private alertRouter: AlertRouter,
  ) {}

  async evaluate(studioId: string, metrics: ResourceMetrics, state: MonitorState): Promise<void> {
    const studioState = state.studios.get(studioId)
    if (!studioState) return

    studioState.lastMetrics = {
      cpuPercent: metrics.cpuPercent,
      ramPercent: metrics.ramPercent,
      diskPercent: metrics.diskPercent,
    }

    const now = Date.now()

    if (metrics.ramPercent > this.config.thresholds.RAM_WARN_PERCENT) {
      if (!studioState.ramHighSince) studioState.ramHighSince = now
      const duration = now - studioState.ramHighSince
      if (duration >= this.config.thresholds.RAM_WARN_DURATION_MS) {
        if (state.shouldAlert(`ram-high-${studioId}`, 'P1')) {
          await this.alertRouter.send('P1', 'RESOURCE', `High RAM on ${studioId}`, `RAM at ${metrics.ramPercent}% for ${Math.round(duration / 60_000)}min`, studioId)
          state.recordAlert(`ram-high-${studioId}`, 'P1')
          await this.reduceWorkerConcurrency(studioId)
        }
      }
    } else {
      studioState.ramHighSince = null
    }

    if (metrics.diskPercent > this.config.thresholds.DISK_CRITICAL_PERCENT) {
      if (state.shouldAlert(`disk-high-${studioId}`, 'P1')) {
        await this.alertRouter.send('P1', 'RESOURCE', `Disk critical on ${studioId}`, `Disk at ${metrics.diskPercent}%. Running docker prune.`, studioId)
        state.recordAlert(`disk-high-${studioId}`, 'P1')
        await this.dockerPrune(studioId)
      }
    }

    if (metrics.cpuPercent > this.config.thresholds.CPU_CRITICAL_PERCENT) {
      if (!studioState.cpuHighSince) studioState.cpuHighSince = now
      const duration = now - studioState.cpuHighSince
      if (duration >= this.config.thresholds.CPU_CRITICAL_DURATION_MS) {
        if (state.shouldAlert(`cpu-high-${studioId}`, 'P0')) {
          await this.alertRouter.send('P0', 'RESOURCE', `Sustained high CPU on ${studioId}`, `CPU at ${metrics.cpuPercent}% for ${Math.round(duration / 60_000)}min. Killing hung builds.`, studioId)
          state.recordAlert(`cpu-high-${studioId}`, 'P0')
          await this.killHungBuilds(studioId)
        }
      }
    } else {
      studioState.cpuHighSince = null
    }

    const cutoff = now - this.config.thresholds.WORKER_RESTART_WINDOW_MS
    studioState.workerRestarts = studioState.workerRestarts.filter(t => t > cutoff)
    if (!metrics.n8nWorkerRunning) {
      studioState.workerRestarts.push(now)
      if (studioState.workerRestarts.length >= this.config.thresholds.WORKER_RESTART_THRESHOLD) {
        if (state.shouldAlert(`worker-crash-loop-${studioId}`, 'P0')) {
          await this.alertRouter.send('P0', 'RESOURCE', `n8n worker crash loop on ${studioId}`, `Worker restarted ${studioState.workerRestarts.length} times in ${Math.round(this.config.thresholds.WORKER_RESTART_WINDOW_MS / 60_000)}min`, studioId)
          state.recordAlert(`worker-crash-loop-${studioId}`, 'P0')
        }
      } else {
        await this.restartWorker(studioId)
      }
    }
  }

  private getStudioHost(studioId: string): string {
    return this.config.studios.find(s => s.id === studioId)?.host || studioId
  }

  private async sshExec(studioId: string, command: string): Promise<string> {
    const ssh = new NodeSSH()
    try {
      await ssh.connect({
        host: this.getStudioHost(studioId),
        username: this.config.ssh.user,
        privateKeyPath: this.config.ssh.keyPath,
        readyTimeout: 10_000,
      })
      const result = await ssh.execCommand(command)
      return result.stdout
    } finally {
      ssh.dispose()
    }
  }

  private async reduceWorkerConcurrency(studioId: string): Promise<void> {
    try {
      console.log(`[resource-responder] Reducing worker concurrency on ${studioId}`)
      await this.sshExec(studioId,
        'cd /opt/mismo && docker compose -f docker/n8n-ha/docker-compose.worker.yml down && QUEUE_BULL_CONCURRENCY=10 docker compose -f docker/n8n-ha/docker-compose.worker.yml up -d'
      )
    } catch (err) {
      console.error(`[resource-responder] Failed to reduce concurrency on ${studioId}:`, err)
    }
  }

  private async dockerPrune(studioId: string): Promise<void> {
    try {
      console.log(`[resource-responder] Running docker prune on ${studioId}`)
      await this.sshExec(studioId, 'docker system prune -af')
    } catch (err) {
      console.error(`[resource-responder] Failed to prune on ${studioId}:`, err)
    }
  }

  private async killHungBuilds(studioId: string): Promise<void> {
    try {
      console.log(`[resource-responder] Killing hung builds on ${studioId}`)
      await this.sshExec(studioId,
        "docker ps --filter status=running --format '{{.ID}} {{.RunningFor}}' | while read cid rf; do echo \"$rf\" | grep -qE '([2-9]|[0-9]{2,}) hours|About an hour' && docker kill \"$cid\"; done"
      )
    } catch (err) {
      console.error(`[resource-responder] Failed to kill hung builds on ${studioId}:`, err)
    }
  }

  private async restartWorker(studioId: string): Promise<void> {
    try {
      console.log(`[resource-responder] Restarting n8n worker on ${studioId}`)
      await this.sshExec(studioId,
        'cd /opt/mismo && docker compose -f docker/n8n-ha/docker-compose.worker.yml up -d'
      )
    } catch (err) {
      console.error(`[resource-responder] Failed to restart worker on ${studioId}:`, err)
    }
  }
}
