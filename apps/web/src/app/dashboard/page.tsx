import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@mismo/db'
import { ActiveSessionsList } from './components/ActiveSessionsList'
import { RealtimeProjectList } from '@/components/RealtimeProjectList'

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) redirect('/auth')

  const [projects, activeSessions] = await Promise.all([
    prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.interviewSession.findMany({
      where: { userId: user.id, projectId: null },
      orderBy: { startedAt: 'desc' },
    }),
  ])

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

  const serializedProjects = projects.map((p) => ({
    ...p,
    updatedAt: p.updatedAt.toISOString(),
  }))

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

      <RealtimeProjectList initialProjects={serializedProjects} userId={user.id} />
    </div>
  )
}
