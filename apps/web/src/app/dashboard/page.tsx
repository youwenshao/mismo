import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@mismo/db'
import { timeAgo } from '@/lib/format'
import type { ProjectStatus } from '@mismo/db'
import { ActiveSessionsList } from './components/ActiveSessionsList'

const statusLabels: Record<ProjectStatus, string> = {
  DISCOVERY: 'Talking to Mo',
  REVIEW: 'Reviewing your spec',
  CONTRACTED: 'Getting started',
  DEVELOPMENT: 'Being built',
  VERIFICATION: 'Final checks',
  DELIVERED: 'Ready for you',
  CANCELLED: 'Cancelled',
}

const statusDotConfig: Record<ProjectStatus, { color: string; pulse: boolean }> = {
  DISCOVERY: { color: 'bg-gray-400', pulse: true },
  REVIEW: { color: 'bg-amber-400', pulse: true },
  CONTRACTED: { color: 'bg-blue-400', pulse: false },
  DEVELOPMENT: { color: 'bg-blue-400', pulse: true },
  VERIFICATION: { color: 'bg-amber-400', pulse: true },
  DELIVERED: { color: 'bg-green-400', pulse: false },
  CANCELLED: { color: 'bg-red-400', pulse: false },
}

function StatusDot({ status }: { status: ProjectStatus }) {
  const { color, pulse } = statusDotConfig[status]
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`}
    />
  )
}

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) redirect('/auth')

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
  })

  const activeSessions = await prisma.interviewSession.findMany({
    where: {
      userId: user.id,
      projectId: null,
    },
    orderBy: { startedAt: 'desc' },
  })

  if (projects.length === 0 && activeSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <h1 className="text-2xl font-semibold">Welcome to Mismo</h1>
        <p className="mt-2 text-gray-500">Let&apos;s start by telling Mo about your idea</p>
        <Link
          href="/chat"
          className="mt-6 inline-block rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Talk to Mo
        </Link>
      </div>
    )
  }

  return (
    <div>
      {activeSessions.length > 0 && (
        <div className="mb-12">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Active conversations
          </h2>
          <ActiveSessionsList sessions={activeSessions} />
        </div>
      )}

      {projects.length > 0 && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Your projects
            </h2>
            <Link
              href="/chat"
              className="text-sm text-gray-500 transition-colors hover:text-gray-900"
            >
              Start a new project
            </Link>
          </div>

          <div>
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className="block border-b border-gray-100 px-2 py-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
                      <StatusDot status={project.status} />
                      {statusLabels[project.status]}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    Updated {timeAgo(project.updatedAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
