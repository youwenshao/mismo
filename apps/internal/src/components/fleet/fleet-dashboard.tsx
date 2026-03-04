'use client'

import { useState, useCallback, useEffect } from 'react'
import { useFleetDetails } from '@/hooks/use-fleet-details'
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription'
import { StudioCard } from './studio-card'
import { QueueDepthChart } from './queue-depth-chart'
import { FleetOverviewHeader } from './fleet-overview-header'
import { ServiceHealthBar } from './service-health-bar'
import { BuildLogDrawer } from './build-log-drawer'

interface HistoryPoint {
  timestamp: string
  cpu: number
  ram: number
  disk: number
  queueDepth: number
  containers: number
}

export function FleetDashboard() {
  const {
    studios,
    alertCounts,
    activeProvider,
    githubPaused,
    serviceHealth,
    loading,
    error,
    refresh,
  } = useFleetDetails(10000)

  const [history, setHistory] = useState<Record<string, HistoryPoint[]>>({})
  const [queueData, setQueueData] = useState<
    Array<{ time: string; studio1: number; studio2: number; studio3: number }>
  >([])
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/fleet/history?hours=2')
      if (!res.ok) return
      const data = await res.json()
      setHistory(data.history)

      const merged = mergeQueueHistory(data.history)
      setQueueData(merged)
    } catch {
      // Non-critical
    }
  }, [])

  useEffect(() => {
    fetchHistory()
    const id = setInterval(fetchHistory, 60000)
    return () => clearInterval(id)
  }, [fetchHistory])

  useRealtimeSubscription(
    'Build',
    useCallback(() => {
      refresh()
    }, [refresh]),
  )

  useRealtimeSubscription(
    'StudioMetrics',
    useCallback(() => {
      refresh()
      fetchHistory()
    }, [refresh, fetchHistory]),
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-gray-50 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-lg bg-white p-5 h-80 animate-pulse"
            >
              <div className="h-4 bg-gray-100 rounded w-24 mb-4" />
              <div className="h-20 bg-gray-50 rounded mb-4" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-red-200 rounded-lg bg-red-50 p-4 text-sm text-red-700">
        Failed to load fleet details: {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FleetOverviewHeader studios={studios} alertCounts={alertCounts} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {studios.map((studio) => (
          <StudioCard
            key={studio.id}
            studioId={studio.id}
            studioName={studio.name}
            role={studio.role}
            chip={studio.chip}
            ram={studio.ram}
            workerConcurrency={studio.workerConcurrency}
            services={studio.services}
            online={studio.online}
            cpuPercent={studio.metrics?.cpuPercent ?? 0}
            ramPercent={studio.metrics?.ramPercent ?? 0}
            diskPercent={studio.metrics?.diskPercent ?? 0}
            networkIn={studio.metrics?.networkIn ?? 0}
            networkOut={studio.metrics?.networkOut ?? 0}
            queueDepth={studio.metrics?.queueDepth ?? 0}
            containerCount={studio.metrics?.containerCount ?? 0}
            workerRunning={studio.metrics?.workerRunning ?? false}
            workerRestartCount={studio.metrics?.workerRestartCount ?? 0}
            activeBuilds={studio.activeBuilds}
            history={history[studio.id]}
            onBuildClick={setSelectedBuildId}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QueueDepthChart data={queueData} />
        <ServiceHealthBar
          overall={serviceHealth.overall}
          services={serviceHealth.services}
          activeProvider={activeProvider}
          githubPaused={githubPaused}
        />
      </div>

      <BuildLogDrawer buildId={selectedBuildId} onClose={() => setSelectedBuildId(null)} />
    </div>
  )
}

function mergeQueueHistory(
  history: Record<string, Array<{ timestamp: string; queueDepth: number }>>,
): Array<{ time: string; studio1: number; studio2: number; studio3: number }> {
  const timeMap = new Map<string, { studio1: number; studio2: number; studio3: number }>()
  const studioKeys: Record<string, 'studio1' | 'studio2' | 'studio3'> = {
    'studio-1': 'studio1',
    'studio-2': 'studio2',
    'studio-3': 'studio3',
  }

  for (const [studioId, points] of Object.entries(history)) {
    const key = studioKeys[studioId]
    if (!key) continue
    for (const point of points) {
      const date = new Date(point.timestamp)
      const timeKey = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Hong_Kong',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date)

      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, { studio1: 0, studio2: 0, studio3: 0 })
      }
      timeMap.get(timeKey)![key] = Math.max(0, point.queueDepth)
    }
  }

  return Array.from(timeMap.entries())
    .map(([time, values]) => ({ time, ...values }))
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(-30)
}
