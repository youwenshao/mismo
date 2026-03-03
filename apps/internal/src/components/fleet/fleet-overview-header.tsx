'use client'

import type { StudioDetail } from '@/hooks/use-fleet-details'

interface FleetOverviewHeaderProps {
  studios: StudioDetail[]
  alertCounts: { P0: number; P1: number; P2: number }
}

export function FleetOverviewHeader({ studios, alertCounts }: FleetOverviewHeaderProps) {
  const totalCpu =
    studios.reduce((sum, s) => sum + (s.metrics?.cpuPercent || 0), 0) / (studios.length || 1)
  const totalRam =
    studios.reduce((sum, s) => sum + (s.metrics?.ramPercent || 0), 0) / (studios.length || 1)
  const totalQueue = studios.reduce((sum, s) => sum + (s.metrics?.queueDepth || 0), 0)
  const totalBuilds = studios.reduce((sum, s) => sum + s.activeBuilds.length, 0)
  const onlineCount = studios.filter((s) => s.online).length

  const stats = [
    { label: 'Studios Online', value: `${onlineCount}/${studios.length}` },
    { label: 'Avg CPU', value: `${Math.round(totalCpu)}%` },
    { label: 'Avg RAM', value: `${Math.round(totalRam)}%` },
    { label: 'Queue Depth', value: totalQueue },
    { label: 'Active Builds', value: totalBuilds },
  ]

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex gap-6">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className="text-lg font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {alertCounts.P0 > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">
            {alertCounts.P0} P0
          </span>
        )}
        {alertCounts.P1 > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
            {alertCounts.P1} P1
          </span>
        )}
        {alertCounts.P0 === 0 && alertCounts.P1 === 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
            No alerts
          </span>
        )}
      </div>
    </div>
  )
}
