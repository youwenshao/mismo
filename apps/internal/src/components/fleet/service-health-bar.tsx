'use client'

interface ServiceStatus {
  provider: string
  status: string
  latencyMs: number
  details: Record<string, unknown> | null
  lastChecked: string | null
}

interface ServiceHealthBarProps {
  overall: string
  services: ServiceStatus[]
  activeProvider: string
  githubPaused: boolean
}

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  healthy: { dot: 'bg-green-500', label: 'Healthy' },
  degraded: { dot: 'bg-amber-500', label: 'Degraded' },
  down: { dot: 'bg-red-500', label: 'Down' },
  rate_limited: { dot: 'bg-amber-500', label: 'Rate Limited' },
  unknown: { dot: 'bg-gray-300', label: 'Unknown' },
}

const PROVIDER_LABELS: Record<string, string> = {
  kimi: 'Kimi (Moonshot)',
  supabase: 'Supabase',
  github: 'GitHub',
}

export function ServiceHealthBar({
  overall,
  services,
  activeProvider,
  githubPaused,
}: ServiceHealthBarProps) {
  const overallCfg = STATUS_CONFIG[overall] || STATUS_CONFIG.unknown

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Service Health</h3>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${overallCfg.dot}`} />
          <span className="text-[10px] text-gray-500">{overallCfg.label}</span>
        </div>
      </div>

      <div className="space-y-2">
        {services.map((svc) => {
          const cfg = STATUS_CONFIG[svc.status] || STATUS_CONFIG.unknown
          const isActive = svc.provider === activeProvider

          return (
            <div key={svc.provider} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                <span className="text-xs text-gray-700">
                  {PROVIDER_LABELS[svc.provider] || svc.provider}
                </span>
                {isActive && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-black text-white rounded">
                    active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {svc.latencyMs > 0 && (
                  <span className="text-[10px] font-mono text-gray-400">{svc.latencyMs}ms</span>
                )}
                <span className="text-[10px] text-gray-400">{cfg.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {githubPaused && (
        <div className="mt-3 text-[10px] px-2 py-1.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
          GitHub builds paused due to rate limiting
        </div>
      )}
    </div>
  )
}
