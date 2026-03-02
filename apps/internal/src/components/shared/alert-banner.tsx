'use client'

import { useState } from 'react'

export interface Alert {
  id: string
  severity: 'info' | 'warning' | 'error'
  message: string
  timestamp: Date
}

interface AlertBannerProps {
  alerts: Alert[]
  onDismiss?: (id: string) => void
}

const severityStyles: Record<Alert['severity'], string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = alerts.filter((a) => !dismissed.has(a.id))
  if (visible.length === 0) return null

  function dismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id))
    onDismiss?.(id)
  }

  return (
    <div className="space-y-2 mb-6">
      {visible.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-center justify-between px-4 py-2 border rounded-lg text-sm ${severityStyles[alert.severity]}`}
        >
          <span>{alert.message}</span>
          <button
            onClick={() => dismiss(alert.id)}
            className="ml-4 opacity-60 hover:opacity-100 text-lg leading-none"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  )
}
