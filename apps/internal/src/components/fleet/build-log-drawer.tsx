'use client'

import { useEffect, useState, useCallback } from 'react'

interface BuildLogDrawerProps {
  buildId: string | null
  onClose: () => void
}

interface BuildData {
  id: string
  commissionId: string
  status: string
  errorLogs: unknown
  failureCount: number
  studioAssignment: string | null
  createdAt: string
  updatedAt: string
}

export function BuildLogDrawer({ buildId, onClose }: BuildLogDrawerProps) {
  const [build, setBuild] = useState<BuildData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchBuild = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/fleet/build/${id}`)
      if (res.ok) {
        const data = await res.json()
        setBuild(data.build)
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (buildId) {
      fetchBuild(buildId)
    } else {
      setBuild(null)
    }
  }, [buildId, fetchBuild])

  if (!buildId) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/10 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-white border-l border-gray-200 z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold">Build Logs</h3>
            <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">
              Close
            </button>
          </div>

          {loading && (
            <div className="space-y-3">
              <div className="h-4 bg-gray-100 rounded w-48 animate-pulse" />
              <div className="h-32 bg-gray-50 rounded animate-pulse" />
            </div>
          )}

          {!loading && build && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Build ID</p>
                  <p className="text-xs font-mono">{build.id.slice(0, 12)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Status</p>
                  <p className="text-xs font-mono">{build.status}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Studio</p>
                  <p className="text-xs">{build.studioAssignment || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Failures</p>
                  <p className="text-xs">{build.failureCount}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 uppercase mb-2">Error Logs</p>
                {build.errorLogs ? (
                  <pre className="text-[11px] font-mono bg-gray-50 border border-gray-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-[60vh]">
                    {typeof build.errorLogs === 'string'
                      ? build.errorLogs
                      : JSON.stringify(build.errorLogs, null, 2)}
                  </pre>
                ) : (
                  <p className="text-xs text-gray-400">No error logs recorded</p>
                )}
              </div>
            </div>
          )}

          {!loading && !build && <p className="text-xs text-gray-400">Build not found</p>}
        </div>
      </div>
    </>
  )
}
