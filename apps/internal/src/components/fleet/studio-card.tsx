'use client'

import { MetricGauge } from './metric-gauge'
import { BuildProgress } from './build-progress'
import { SparklineChart } from './sparkline-chart'

interface ActiveBuild {
  id: string
  commissionId: string
  status: string
  studioAssignment: string | null
  createdAt: string
  updatedAt: string
}

interface HistoryPoint {
  timestamp: string
  cpu: number
  ram: number
  disk: number
  queueDepth: number
  containers: number
}

interface StudioCardProps {
  studioId: string
  studioName: string
  role: 'control-plane' | 'worker'
  chip: string
  ram: string
  workerConcurrency: number
  services: readonly string[]
  online: boolean
  cpuPercent: number
  ramPercent: number
  diskPercent: number
  networkIn: number
  networkOut: number
  queueDepth: number
  containerCount: number
  workerRunning: boolean
  workerRestartCount: number
  activeBuilds: ActiveBuild[]
  history?: HistoryPoint[]
  onBuildClick?: (buildId: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)} B/s`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`
}

export function StudioCard({
  studioName,
  role,
  chip,
  ram,
  workerConcurrency,
  services,
  online,
  cpuPercent,
  ramPercent,
  diskPercent,
  networkIn,
  networkOut,
  queueDepth,
  containerCount,
  workerRunning,
  workerRestartCount,
  activeBuilds,
  history = [],
  onBuildClick,
}: StudioCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold">{studioName}</h3>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${
            online
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {online ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Hardware specs */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] text-gray-400">{chip}</span>
        <span className="text-[10px] text-gray-300">/</span>
        <span className="text-[10px] text-gray-400">{ram}</span>
        <span className="text-[10px] text-gray-300">/</span>
        <span className="text-[10px] text-gray-400 capitalize">{role.replace('-', ' ')}</span>
      </div>

      {/* Gauges */}
      <div className="flex justify-between mb-4">
        <MetricGauge label="CPU" value={cpuPercent} />
        <MetricGauge label="RAM" value={ramPercent} />
        <MetricGauge label="Disk" value={diskPercent} />
      </div>

      {/* Sparklines */}
      {history.length > 1 && (
        <div className="flex gap-2 mb-4">
          <SparklineChart data={history.map((h) => h.cpu)} label="CPU" color="#000" />
          <SparklineChart data={history.map((h) => h.ram)} label="RAM" color="#6b7280" />
        </div>
      )}

      {/* Network */}
      <div className="flex justify-between text-[10px] text-gray-400 mb-3 px-2">
        <span>In: {formatBytes(networkIn)}</span>
        <span>Out: {formatBytes(networkOut)}</span>
      </div>

      {/* Operational stats */}
      <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-3 border-t border-gray-100 pt-3">
        <span>{containerCount} containers</span>
        <span className="text-gray-200">|</span>
        {workerConcurrency > 0 ? (
          <>
            <span className={workerRunning ? 'text-green-600' : 'text-red-500'}>
              Worker {workerRunning ? 'up' : 'down'}
            </span>
            {workerRestartCount > 0 && (
              <>
                <span className="text-gray-200">|</span>
                <span className={workerRestartCount >= 3 ? 'text-red-500' : 'text-gray-500'}>
                  {workerRestartCount} restarts
                </span>
              </>
            )}
          </>
        ) : (
          <span className="text-gray-400">No worker</span>
        )}
      </div>

      {/* Services */}
      <div className="flex flex-wrap gap-1 mb-3">
        {services.map((svc) => (
          <span key={svc} className="text-[9px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded">
            {svc}
          </span>
        ))}
      </div>

      {/* Queue + builds */}
      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">Queue</span>
          <span className="text-xs font-mono font-medium">{queueDepth}</span>
        </div>

        {activeBuilds.length > 0 ? (
          <div className="space-y-2">
            <span className="text-xs text-gray-500">Active Builds</span>
            {activeBuilds.map((build) => (
              <div
                key={build.id}
                className={onBuildClick ? 'cursor-pointer' : ''}
                onClick={() => onBuildClick?.(build.id)}
              >
                <BuildProgress build={build} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-300">No active builds</p>
        )}
      </div>
    </div>
  )
}
