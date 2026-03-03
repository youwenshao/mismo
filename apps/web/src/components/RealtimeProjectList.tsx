'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Project {
  id: string
  name: string
  status: string
  updatedAt: string
}

interface Props {
  initialProjects: Project[]
  userId: string
}

const STATUS_LABELS: Record<string, string> = {
  DISCOVERY: 'Talking to Mo',
  REVIEW: 'Reviewing your spec',
  CONTRACTED: 'Getting started',
  DEVELOPMENT: 'Being built',
  VERIFICATION: 'Final checks',
  DELIVERED: 'Ready for you',
  CANCELLED: 'Cancelled',
}

const STATUS_DOT: Record<string, { color: string; pulse: boolean }> = {
  DISCOVERY: { color: 'bg-gray-400', pulse: true },
  REVIEW: { color: 'bg-amber-400', pulse: true },
  CONTRACTED: { color: 'bg-blue-400', pulse: false },
  DEVELOPMENT: { color: 'bg-blue-400', pulse: true },
  VERIFICATION: { color: 'bg-amber-400', pulse: true },
  DELIVERED: { color: 'bg-green-400', pulse: false },
  CANCELLED: { color: 'bg-red-400', pulse: false },
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function RealtimeProjectList({ initialProjects, userId }: Props) {
  const [projects, setProjects] = useState(initialProjects)

  const refreshProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects)
      }
    } catch {
      // Non-critical
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`projects-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Project' }, () => {
        refreshProjects()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId, refreshProjects])

  if (projects.length === 0) return null

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Your projects
        </h2>
        <Link href="/chat" className="text-sm text-gray-500 transition-colors hover:text-gray-900">
          Start a new project
        </Link>
      </div>

      <div>
        {projects.map((project) => {
          const dot = STATUS_DOT[project.status] || { color: 'bg-gray-400', pulse: false }
          return (
            <Link
              key={project.id}
              href={`/project/${project.id}`}
              className="block border-b border-gray-100 px-2 py-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${dot.color} ${
                        dot.pulse ? 'animate-pulse' : ''
                      }`}
                    />
                    {STATUS_LABELS[project.status] || project.status}
                  </p>
                </div>
                <span className="text-xs text-gray-400">Updated {timeAgo(project.updatedAt)}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
