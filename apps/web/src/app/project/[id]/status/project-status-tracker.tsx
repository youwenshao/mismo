'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Stage {
  key: string
  label: string
  description: string
  status: 'complete' | 'active' | 'pending' | 'cancelled'
}

interface Build {
  id: string
  status: string
  createdAt: string
  updatedAt: string
}

interface Props {
  stages: Stage[]
  build: Build | null
  projectId: string
}

function timeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function ProjectStatusTracker({ stages: initialStages, build, projectId }: Props) {
  const [stages, setStages] = useState(initialStages)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`project-status-${projectId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Project', filter: `id=eq.${projectId}` },
        () => {
          window.location.reload()
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [projectId])

  return (
    <div className="space-y-0">
      {stages.map((stage, i) => {
        const isLast = i === stages.length - 1

        let dotClass = ''
        let lineClass = ''
        let labelClass = ''

        switch (stage.status) {
          case 'complete':
            dotClass = 'bg-black'
            lineClass = 'bg-black'
            labelClass = 'text-gray-900'
            break
          case 'active':
            dotClass = 'bg-black ring-4 ring-gray-100'
            lineClass = 'bg-gray-200'
            labelClass = 'text-gray-900 font-medium'
            break
          case 'pending':
            dotClass = 'bg-gray-200'
            lineClass = 'bg-gray-100'
            labelClass = 'text-gray-400'
            break
          case 'cancelled':
            dotClass = 'bg-red-400'
            lineClass = 'bg-gray-100'
            labelClass = 'text-red-500'
            break
        }

        return (
          <div key={stage.key} className="flex">
            {/* Timeline */}
            <div className="flex flex-col items-center mr-4">
              <div className={`w-3 h-3 rounded-full shrink-0 ${dotClass}`} />
              {!isLast && <div className={`w-0.5 flex-1 min-h-[40px] ${lineClass}`} />}
            </div>

            {/* Content */}
            <div className="pb-8">
              <p className={`text-sm ${labelClass}`}>{stage.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stage.description}</p>

              {stage.status === 'active' && stage.key === 'DEVELOPMENT' && build && (
                <div className="mt-3 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      Build{' '}
                      {build.status === 'RUNNING' ? 'in progress' : build.status.toLowerCase()}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Started {timeAgo(build.createdAt)} ago
                    </span>
                  </div>

                  {build.status === 'RUNNING' && (
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black rounded-full animate-pulse"
                        style={{
                          width: `${Math.min(
                            ((Date.now() - new Date(build.createdAt).getTime()) /
                              (30 * 60 * 1000)) *
                              100,
                            95,
                          )}%`,
                        }}
                      />
                    </div>
                  )}

                  {build.status === 'SUCCESS' && (
                    <div className="w-full h-1.5 bg-green-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full w-full" />
                    </div>
                  )}

                  {build.status === 'FAILED' && (
                    <p className="text-xs text-red-500 mt-1">
                      Build encountered an issue. Our team is on it.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
