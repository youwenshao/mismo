type AlertPriority = 'P0' | 'P1' | 'P2'

export interface StudioState {
  ramHighSince: number | null
  cpuHighSince: number | null
  lastMetrics: {
    cpuPercent: number
    ramPercent: number
    diskPercent: number
  } | null
  workerRestarts: number[]
}

export interface ApiState {
  kimiDegradedSince: number | null
  kimiHealthyChecks: number
  supabaseDown: boolean
  supabaseLastAttempt: number | null
  githubRateLimited: boolean
  githubResetAt: number | null
  activeProvider: string
}

export interface BuildState {
  recentResults: Array<{ commissionId: string; success: boolean; timestamp: number }>
  commissionFailures: Map<string, number>
  queueDepthHighSince: number | null
}

interface SentAlert {
  key: string
  priority: AlertPriority
  sentAt: number
}

export class MonitorState {
  studios: Map<string, StudioState> = new Map()
  api: ApiState = {
    kimiDegradedSince: null,
    kimiHealthyChecks: 0,
    supabaseDown: false,
    supabaseLastAttempt: null,
    githubRateLimited: false,
    githubResetAt: null,
    activeProvider: 'kimi',
  }
  builds: BuildState = {
    recentResults: [],
    commissionFailures: new Map(),
    queueDepthHighSince: null,
  }
  private sentAlerts: Map<string, SentAlert> = new Map()
  private alertCooldownMs: Record<AlertPriority, number> = {
    P0: 5 * 60_000,
    P1: 15 * 60_000,
    P2: 60 * 60_000,
  }

  constructor() {
    for (const id of ['studio-1', 'studio-2', 'studio-3']) {
      this.studios.set(id, {
        ramHighSince: null,
        cpuHighSince: null,
        lastMetrics: null,
        workerRestarts: [],
      })
    }
  }

  shouldAlert(key: string, priority: AlertPriority): boolean {
    const existing = this.sentAlerts.get(key)
    if (!existing) return true
    return Date.now() - existing.sentAt > this.alertCooldownMs[priority]
  }

  recordAlert(key: string, priority: AlertPriority): void {
    this.sentAlerts.set(key, { key, priority, sentAt: Date.now() })
  }

  pruneOldBuildResults(windowMs: number): void {
    const cutoff = Date.now() - windowMs
    this.builds.recentResults = this.builds.recentResults.filter(r => r.timestamp > cutoff)
  }

  getSuccessRate(): number {
    const results = this.builds.recentResults
    if (results.length === 0) return 1
    const successes = results.filter(r => r.success).length
    return successes / results.length
  }
}
