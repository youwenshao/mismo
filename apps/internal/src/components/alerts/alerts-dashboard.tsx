'use client'

import { useState, useCallback } from 'react'

interface BuildAlert {
  id: string
  severity: 'info' | 'warning' | 'error'
  message: string
  timestamp: Date
}

interface MonitoringAlert {
  id: string
  priority: 'P0' | 'P1' | 'P2'
  category: string
  studio: string | null
  title: string
  details: Record<string, unknown> | null
  resolvedAt: string | null
  createdAt: string
}

interface ExpiringCredential {
  id: string
  commissionId: string
  service: string
  rotationDate: string
}

interface Props {
  buildAlerts: BuildAlert[]
  monitoringAlerts: MonitoringAlert[]
  expiringCredentials: ExpiringCredential[]
}

type PriorityFilter = 'ALL' | 'P0' | 'P1' | 'P2'
type CategoryFilter = 'ALL' | 'RESOURCE' | 'API' | 'BUILD' | 'SECURITY' | 'BACKUP'
type Tab = 'monitoring' | 'build' | 'credentials'

const PRIORITY_STYLES: Record<string, string> = {
  P0: 'bg-red-50 border-red-200 text-red-800',
  P1: 'bg-amber-50 border-amber-200 text-amber-800',
  P2: 'bg-gray-50 border-gray-200 text-gray-700',
}

const PRIORITY_DOT: Record<string, string> = {
  P0: 'bg-red-500',
  P1: 'bg-amber-500',
  P2: 'bg-gray-400',
}

const SEVERITY_STYLES: Record<string, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
}

const SEVERITY_DOT: Record<string, string> = {
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
}

function formatTimestamp(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function AlertsDashboard({ buildAlerts, monitoringAlerts, expiringCredentials }: Props) {
  const [tab, setTab] = useState<Tab>('monitoring')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL')
  const [showResolved, setShowResolved] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [alerts, setAlerts] = useState(monitoringAlerts)

  const resolveAlert = useCallback(async (id: string) => {
    try {
      const res = await fetch('/api/farm/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'resolve' }),
      })
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, resolvedAt: new Date().toISOString() } : a)),
        )
      }
    } catch {
      // Non-critical
    }
  }, [])

  const filteredAlerts = alerts.filter((a) => {
    if (!showResolved && a.resolvedAt) return false
    if (priorityFilter !== 'ALL' && a.priority !== priorityFilter) return false
    if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false
    return true
  })

  const unresolvedCount = alerts.filter((a) => !a.resolvedAt).length

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'monitoring', label: 'Farm Monitoring', count: unresolvedCount },
    { key: 'build', label: 'Build Alerts', count: buildAlerts.length },
    { key: 'credentials', label: 'Credential Expiry', count: expiringCredentials.length },
  ]

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100 pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs rounded-t transition-colors ${
              tab === t.key
                ? 'bg-white border border-b-white border-gray-200 font-medium -mb-[1px]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Monitoring tab */}
      {tab === 'monitoring' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              {(['ALL', 'P0', 'P1', 'P2'] as PriorityFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                    priorityFilter === p
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {(['ALL', 'RESOURCE', 'API', 'BUILD', 'SECURITY', 'BACKUP'] as CategoryFilter[]).map(
                (c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                      categoryFilter === c
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {c === 'ALL' ? 'All' : c.charAt(0) + c.slice(1).toLowerCase()}
                  </button>
                ),
              )}
            </div>
            <label className="flex items-center gap-1.5 text-[10px] text-gray-500 ml-auto cursor-pointer">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show resolved
            </label>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="border border-green-200 rounded-lg bg-green-50 p-6 text-center">
              <p className="text-sm text-green-700">No active monitoring alerts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg overflow-hidden ${
                    alert.resolvedAt ? 'opacity-50' : ''
                  } ${PRIORITY_STYLES[alert.priority] || PRIORITY_STYLES.P2}`}
                >
                  <div
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                  >
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        PRIORITY_DOT[alert.priority] || PRIORITY_DOT.P2
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{alert.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] opacity-60">
                          {formatTimestamp(alert.createdAt)}
                        </span>
                        {alert.studio && (
                          <span className="text-[10px] opacity-60">{alert.studio}</span>
                        )}
                        <span className="text-[10px] opacity-50 uppercase">{alert.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-semibold opacity-60">
                        {alert.priority}
                      </span>
                      {!alert.resolvedAt && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            resolveAlert(alert.id)
                          }}
                          className="text-[10px] px-2 py-0.5 border border-current rounded hover:bg-white/50 transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                      {alert.resolvedAt && (
                        <span className="text-[10px] text-green-600">Resolved</span>
                      )}
                    </div>
                  </div>

                  {expandedId === alert.id && alert.details && (
                    <div className="px-4 pb-3 border-t border-current/10">
                      <pre className="text-[11px] font-mono mt-2 whitespace-pre-wrap break-words">
                        {JSON.stringify(alert.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Build alerts tab */}
      {tab === 'build' && (
        <div className="space-y-2">
          {buildAlerts.length === 0 ? (
            <div className="border border-green-200 rounded-lg bg-green-50 p-6 text-center">
              <p className="text-sm text-green-700">All systems nominal — no build alerts</p>
            </div>
          ) : (
            buildAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 px-4 py-3 border rounded-lg ${
                  SEVERITY_STYLES[alert.severity]
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    SEVERITY_DOT[alert.severity]
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm">{alert.message}</p>
                  <p className="text-[10px] opacity-60 mt-1">{formatTimestamp(alert.timestamp)}</p>
                </div>
                <span className="text-[10px] uppercase font-semibold opacity-60">
                  {alert.severity}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Credential expiry tab */}
      {tab === 'credentials' && (
        <div className="space-y-2">
          {expiringCredentials.length === 0 ? (
            <div className="border border-green-200 rounded-lg bg-green-50 p-6 text-center">
              <p className="text-sm text-green-700">No credentials expiring within 30 days</p>
            </div>
          ) : (
            expiringCredentials.map((cred) => {
              const daysLeft = Math.ceil(
                (new Date(cred.rotationDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
              )
              const isUrgent = daysLeft <= 7

              return (
                <div
                  key={cred.id}
                  className={`flex items-center gap-3 px-4 py-3 border rounded-lg ${
                    isUrgent
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isUrgent ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{cred.service}</span> credential for commission{' '}
                      {cred.commissionId.slice(0, 8)}
                    </p>
                    <p className="text-[10px] opacity-60 mt-0.5">
                      Expires {formatTimestamp(cred.rotationDate)} ({daysLeft} days)
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-semibold opacity-60">
                    {isUrgent ? 'urgent' : 'warning'}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
