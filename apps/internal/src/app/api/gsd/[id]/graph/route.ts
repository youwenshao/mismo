import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import { buildGraphData, type GsdTask } from '@/lib/gsd-graph'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const commission = await prisma.commission.findUnique({
    where: { id },
    include: {
      builds: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          executionIds: true,
        },
      },
    },
  })

  if (!commission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const prd = commission.prdJson as Record<string, unknown> | null
  const decomposition = prd?.gsd_decomposition as
    | { tasks: GsdTask[] }
    | undefined

  if (!decomposition?.tasks) {
    // Generate a default set of tasks from the archetype pattern
    const defaultTasks: GsdTask[] = [
      { id: 'database', type: 'database', dependencies: [] },
      { id: 'backend', type: 'backend', dependencies: ['database'] },
      { id: 'frontend', type: 'frontend', dependencies: ['backend'] },
      { id: 'devops', type: 'devops', dependencies: [] },
      { id: 'qa', type: 'qa', dependencies: ['frontend', 'devops'] },
    ]

    const build = commission.builds[0]
    const executionIds = (build?.executionIds ?? []) as string[]
    const currentIdx = executionIds.length
    const sorted = defaultTasks.map((t) => t.id)

    const graph = buildGraphData({
      tasks: defaultTasks,
      completedTaskIds: executionIds,
      currentTaskId:
        build?.status === 'RUNNING' ? sorted[currentIdx] ?? null : null,
      buildFailed: build?.status === 'FAILED',
    })

    return NextResponse.json(graph)
  }

  const build = commission.builds[0]
  const executionIds = (build?.executionIds ?? []) as string[]
  const currentIdx = executionIds.length

  // Determine current task
  const taskIds = decomposition.tasks.map((t) => t.id)
  const currentTaskId =
    build?.status === 'RUNNING' ? taskIds[currentIdx] ?? null : null

  const graph = buildGraphData({
    tasks: decomposition.tasks,
    completedTaskIds: executionIds,
    currentTaskId,
    buildFailed: build?.status === 'FAILED',
  })

  return NextResponse.json(graph)
}
