'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertBanner, type Alert } from '@/components/shared/alert-banner'

export function AlertBar() {
  const [alerts, setAlerts] = useState<Alert[]>([])

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts')
      if (!res.ok) return
      const data = await res.json()
      setAlerts(
        (data.alerts as Array<{ id: string; severity: Alert['severity']; message: string; timestamp: string }>).map(
          (a) => ({
            ...a,
            timestamp: new Date(a.timestamp),
          })
        )
      )
    } catch {
      // Silently fail — alert bar is non-critical
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
    const id = setInterval(fetchAlerts, 30000)
    return () => clearInterval(id)
  }, [fetchAlerts])

  if (alerts.length === 0) return null

  return <AlertBanner alerts={alerts} />
}
