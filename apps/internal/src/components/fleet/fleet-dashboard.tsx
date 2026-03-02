'use client'

import { useCallback } from 'react'
import { useFleetMetrics } from '@/hooks/use-fleet-metrics'
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription'
import { StudioCard } from './studio-card'
import { QueueDepthChart } from './queue-depth-chart'

export function FleetDashboard() {
  const { studios, loading, error, refresh } = useFleetMetrics(10000)

  useRealtimeSubscription(
    'Build',
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  useRealtimeSubscription(
    'StudioMetrics',
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-lg bg-white p-5 h-64 animate-pulse"
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
        Failed to load fleet metrics: {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {studios.map((studio) => (
          <StudioCard
            key={studio.studioId}
            studioId={studio.studioId}
            studioName={studio.studioName}
            cpuPercent={studio.cpuPercent}
            ramPercent={studio.ramPercent}
            diskPercent={studio.diskPercent}
            networkIn={studio.networkIn}
            networkOut={studio.networkOut}
            queueDepth={studio.queueDepth}
            activeBuilds={studio.activeBuilds ?? []}
          />
        ))}
      </div>

      <QueueDepthChart data={[]} />
    </div>
  )
}
