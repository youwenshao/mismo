'use client'

import { MetricGauge } from './metric-gauge'
import { BuildProgress } from './build-progress'

interface ActiveBuild {
  id: string
  commissionId: string
  status: string
  studioAssignment: string | null
  createdAt: string
  updatedAt: string
}

interface StudioCardProps {
  studioId: string
  studioName: string
  cpuPercent: number
  ramPercent: number
  diskPercent: number
  networkIn: number
  networkOut: number
  queueDepth: number
  activeBuilds: ActiveBuild[]
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)} B/s`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`
}

export function StudioCard({
  studioName,
  cpuPercent,
  ramPercent,
  diskPercent,
  networkIn,
  networkOut,
  queueDepth,
  activeBuilds,
}: StudioCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{studioName}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
          Online
        </span>
      </div>

      <div className="flex justify-between mb-4">
        <MetricGauge label="CPU" value={cpuPercent} />
        <MetricGauge label="RAM" value={ramPercent} />
        <MetricGauge label="Disk" value={diskPercent} />
      </div>

      <div className="flex justify-between text-[10px] text-gray-400 mb-4 px-2">
        <span>In: {formatBytes(networkIn)}</span>
        <span>Out: {formatBytes(networkOut)}</span>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">Queue</span>
          <span className="text-xs font-mono font-medium">{queueDepth}</span>
        </div>

        {activeBuilds.length > 0 ? (
          <div className="space-y-2">
            <span className="text-xs text-gray-500">Active Builds</span>
            {activeBuilds.map((build) => (
              <BuildProgress key={build.id} build={build} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-300">No active builds</p>
        )}
      </div>
    </div>
  )
}
