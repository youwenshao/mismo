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

interface StudioMetricsData {
  cpuPercent: number
  ramPercent: number
  diskPercent: number
  networkIn: number
  networkOut: number
  queueDepth: number
  containerCount: number
  workerRunning: boolean
  workerRestartCount: number
  lastUpdated: string
}

export interface StudioDetail {
  id: string
  name: string
  role: 'control-plane' | 'worker'
  chip: string
  ram: string
  workerConcurrency: number
  services: readonly string[]
  online: boolean
  metrics: StudioMetricsData | null
  activeBuilds: ActiveBuild[]
}

interface ServiceHealth {
  provider: string
  status: string
  latencyMs: number
  details: Record<string, unknown> | null
  lastChecked: string | null
}

export interface FleetDetails {
  studios: StudioDetail[]
  alertCounts: { P0: number; P1: number; P2: number }
  activeProvider: string
  githubPaused: boolean
  serviceHealth: { overall: string; services: ServiceHealth[] }
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useFleetDetails(intervalMs = 10000): FleetDetails {
  const [studios, setStudios] = useState<StudioDetail[]>([])
  const [alertCounts, setAlertCounts] = useState({ P0: 0, P1: 0, P2: 0 })
  const [activeProvider, setActiveProvider] = useState('default')
  const [githubPaused, setGithubPaused] = useState(false)
  const [serviceHealth, setServiceHealth] = useState<FleetDetails['serviceHealth']>({
    overall: 'unknown',
    services: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [detailsRes, servicesRes] = await Promise.all([
        fetch('/api/fleet/details'),
        fetch('/api/fleet/services'),
      ])

      if (!detailsRes.ok) throw new Error(`Fleet details: HTTP ${detailsRes.status}`)

      const details = await detailsRes.json()
      setStudios(details.studios)
      setAlertCounts(details.alertCounts)
      setActiveProvider(details.activeProvider)
      setGithubPaused(details.githubPaused)

      if (servicesRes.ok) {
        const svc = await servicesRes.json()
        setServiceHealth(svc)
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fleet details')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [refresh, intervalMs])

  return {
    studios,
    alertCounts,
    activeProvider,
    githubPaused,
    serviceHealth,
    loading,
    error,
    refresh,
  }
}
