export interface ApiHealthResult {
  kimi: { status: 'healthy' | 'degraded' | 'down'; latencyMs: number; error?: string }
  supabase: { status: 'healthy' | 'down'; latencyMs: number; error?: string }
  github: { status: 'healthy' | 'rate_limited'; remaining: number; resetAt: number; error?: string }
}

interface FarmConfig {
  apis: {
    kimiBaseUrl: string
    kimiApiKey: string
    githubToken: string
  }
  supabase: {
    url: string
    serviceRoleKey: string
  }
  thresholds: {
    KIMI_LATENCY_THRESHOLD_MS: number
    GITHUB_RATE_LIMIT_MIN: number
  }
}

export class ApiHealthCollector {
  private config: FarmConfig

  constructor(config: FarmConfig) {
    this.config = config
  }

  async collectAll(): Promise<ApiHealthResult> {
    const [kimi, supabase, github] = await Promise.all([
      this.checkKimi(),
      this.checkSupabase(),
      this.checkGitHub(),
    ])
    return { kimi, supabase, github }
  }

  private async checkKimi(): Promise<ApiHealthResult['kimi']> {
    if (!this.config.apis.kimiApiKey) {
      return { status: 'down', latencyMs: 0, error: 'No API key configured' }
    }
    const start = Date.now()
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000)
      const res = await fetch(`${this.config.apis.kimiBaseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.config.apis.kimiApiKey}` },
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const latencyMs = Date.now() - start

      if (!res.ok) return { status: 'down', latencyMs, error: `HTTP ${res.status}` }
      if (latencyMs > this.config.thresholds.KIMI_LATENCY_THRESHOLD_MS) {
        return { status: 'degraded', latencyMs }
      }
      return { status: 'healthy', latencyMs }
    } catch (err) {
      return { status: 'down', latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async checkSupabase(): Promise<ApiHealthResult['supabase']> {
    if (!this.config.supabase.url) {
      return { status: 'down', latencyMs: 0, error: 'No Supabase URL configured' }
    }
    const start = Date.now()
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000)
      const res = await fetch(`${this.config.supabase.url}/rest/v1/SystemConfig?select=key&limit=1`, {
        headers: {
          apikey: this.config.supabase.serviceRoleKey,
          Authorization: `Bearer ${this.config.supabase.serviceRoleKey}`,
        },
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const latencyMs = Date.now() - start

      if (!res.ok) return { status: 'down', latencyMs, error: `HTTP ${res.status}` }
      return { status: 'healthy', latencyMs }
    } catch (err) {
      return { status: 'down', latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async checkGitHub(): Promise<ApiHealthResult['github']> {
    if (!this.config.apis.githubToken) {
      return { status: 'healthy', remaining: 999, resetAt: 0, error: 'No token configured' }
    }
    try {
      const res = await fetch('https://api.github.com/rate_limit', {
        headers: { Authorization: `Bearer ${this.config.apis.githubToken}` },
      })
      const data = await res.json() as { resources: { core: { remaining: number; reset: number } } }
      const { remaining, reset } = data.resources.core

      if (remaining < this.config.thresholds.GITHUB_RATE_LIMIT_MIN) {
        return { status: 'rate_limited', remaining, resetAt: reset * 1000 }
      }
      return { status: 'healthy', remaining, resetAt: reset * 1000 }
    } catch (err) {
      return { status: 'healthy', remaining: -1, resetAt: 0, error: err instanceof Error ? err.message : String(err) }
    }
  }
}
