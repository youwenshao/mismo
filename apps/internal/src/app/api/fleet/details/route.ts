import { NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import { FLEET_CONFIG, FLEET_STALENESS_THRESHOLD_MS } from '@mismo/shared'

export async function GET() {
  const studioIds = Object.keys(FLEET_CONFIG) as Array<keyof typeof FLEET_CONFIG>

  const latestMetrics = await Promise.all(
    studioIds.map((id) =>
      prisma.studioMetrics.findFirst({
        where: { studioId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ),
  )

  const activeBuilds = await prisma.build.findMany({
    where: { status: 'RUNNING' },
    select: {
      id: true,
      commissionId: true,
      status: true,
      studioAssignment: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const [unresolvedAlerts, farmStatus] = await Promise.all([
    prisma.monitoringAlert.groupBy({
      by: ['priority'],
      where: { resolvedAt: null },
      _count: { id: true },
    }),
    Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'active_ai_provider' } }),
      prisma.systemConfig.findUnique({ where: { key: 'github_builds_paused' } }),
    ]),
  ])

  const alertCounts = { P0: 0, P1: 0, P2: 0 }
  for (const row of unresolvedAlerts) {
    alertCounts[row.priority as keyof typeof alertCounts] = row._count.id
  }

  const now = Date.now()
  const studios = studioIds.map((id, i) => {
    const hw = FLEET_CONFIG[id]
    const metrics = latestMetrics[i]
    const isOnline = metrics
      ? now - new Date(metrics.createdAt).getTime() < FLEET_STALENESS_THRESHOLD_MS
      : false

    return {
      ...hw,
      online: isOnline,
      metrics: metrics
        ? {
            cpuPercent: metrics.cpuPercent,
            ramPercent: metrics.ramPercent,
            diskPercent: metrics.diskPercent,
            networkIn: metrics.networkIn,
            networkOut: metrics.networkOut,
            queueDepth: metrics.queueDepth,
            containerCount: metrics.containerCount,
            workerRunning: metrics.workerRunning,
            workerRestartCount: metrics.workerRestartCount,
            lastUpdated: metrics.createdAt,
          }
        : null,
      activeBuilds: activeBuilds.filter((b) => b.studioAssignment === id),
    }
  })

  return NextResponse.json({
    studios,
    alertCounts,
    activeProvider: (farmStatus[0]?.value as Record<string, unknown>)?.provider || 'default',
    githubPaused: (farmStatus[1]?.value as Record<string, unknown>)?.paused || false,
  })
}
