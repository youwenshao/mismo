'use client'

import { useState, useEffect, useCallback } from 'react'

interface ActiveBuild {
  id: string
  commissionId: string
  status: string
  studioAssignment: string | null
  createdAt: string
  updatedAt: string
}

export interface StudioMetric {
  id: string
  studioId: string
  studioName: string
  cpuPercent: number
  ramPercent: number
  diskPercent: number
  networkIn: number
  networkOut: number
  queueDepth: number
  createdAt: string
  activeBuilds: ActiveBuild[]
}

interface FleetMetrics {
  studios: StudioMetric[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useFleetMetrics(intervalMs = 10000): FleetMetrics {
  const [studios, setStudios] = useState<StudioMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/fleet/metrics')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setStudios(data.studios)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [refresh, intervalMs])

  return { studios, loading, error, refresh }
}
