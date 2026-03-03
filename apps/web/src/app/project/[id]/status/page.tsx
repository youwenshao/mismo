import { prisma } from '@mismo/db'
import type { ProjectStatus } from '@mismo/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import { ProjectStatusTracker } from './project-status-tracker'

const STATUS_ORDER: ProjectStatus[] = [
  'DISCOVERY',
  'REVIEW',
  'CONTRACTED',
  'DEVELOPMENT',
  'VERIFICATION',
  'DELIVERED',
]

const STAGES = [
  { key: 'DISCOVERY', label: 'Spec', description: 'Talking to Mo about your idea' },
  { key: 'REVIEW', label: 'Review', description: 'Our team is reviewing your spec' },
  { key: 'CONTRACTED', label: 'Contracted', description: 'Ready to start building' },
  { key: 'DEVELOPMENT', label: 'Building', description: 'Your app is being built by our agents' },
  { key: 'VERIFICATION', label: 'Testing', description: 'Running final quality checks' },
  { key: 'DELIVERED', label: 'Delivered', description: 'Your project is ready' },
] as const

export default async function ProjectStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) redirect('/auth')

  const project = await prisma.project.findUnique({
    where: { id, userId: user.id },
    select: {
      id: true,
      name: true,
      status: true,
      updatedAt: true,
    },
  })

  if (!project) notFound()

  const commission = await prisma.commission.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  })

  let latestBuild = null
  if (commission) {
    latestBuild = await prisma.build.findFirst({
      where: { commissionId: commission.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  const currentIndex = STATUS_ORDER.indexOf(project.status)

  const stages = STAGES.map((stage, i) => {
    const stageIndex = STATUS_ORDER.indexOf(stage.key as ProjectStatus)
    return {
      ...stage,
      status:
        project.status === 'CANCELLED'
          ? ('cancelled' as const)
          : stageIndex < currentIndex
            ? ('complete' as const)
            : stageIndex === currentIndex
              ? ('active' as const)
              : ('pending' as const),
    }
  })

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-4 shrink-0 bg-white/80 backdrop-blur-md z-50">
        <Link href="/dashboard" className="text-lg font-semibold text-gray-900">
          Mismo
        </Link>
        <Link
          href={`/project/${id}`}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          View spec
        </Link>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <h1 className="text-xl font-semibold mb-1">{project.name}</h1>
          <p className="text-sm text-gray-400 mb-10">Project status</p>

          <ProjectStatusTracker
            stages={stages}
            build={
              latestBuild
                ? {
                    ...latestBuild,
                    createdAt: latestBuild.createdAt.toISOString(),
                    updatedAt: latestBuild.updatedAt.toISOString(),
                  }
                : null
            }
            projectId={project.id}
          />
        </div>
      </main>
    </div>
  )
}
