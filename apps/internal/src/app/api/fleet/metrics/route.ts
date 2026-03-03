import { NextResponse } from 'next/server'
import { prisma } from '@mismo/db'

export async function GET() {
  const studios = ['studio-1', 'studio-2', 'studio-3']

  const latestMetrics = await Promise.all(
    studios.map((studioId) =>
      prisma.studioMetrics.findFirst({
        where: { studioId },
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

  const defaults = studios.map((id, i) => ({
    id: `default-${id}`,
    studioId: id,
    studioName: ['Studio 1 (Main)', 'Studio 2 (Build)', 'Studio 3 (QA)'][i],
    cpuPercent: 0,
    ramPercent: 0,
    diskPercent: 0,
    networkIn: 0,
    networkOut: 0,
    queueDepth: 0,
    containerCount: 0,
    workerRunning: false,
    workerRestartCount: 0,
    createdAt: new Date(),
  }))

  const result = defaults.map((def, i) => ({
    ...(latestMetrics[i] ?? def),
    activeBuilds: activeBuilds.filter((b) => b.studioAssignment === def.studioId),
  }))

  // Fetch recent queue history (last 30 data points per studio)
  const queueHistory = await prisma.studioMetrics.findMany({
    where: { studioId: { in: studios } },
    orderBy: { createdAt: 'desc' },
    take: 90,
    select: {
      studioId: true,
      queueDepth: true,
      createdAt: true,
    },
  })

  const timeMap = new Map<string, Record<string, number>>()
  for (const point of queueHistory) {
    const timeKey = point.createdAt.toISOString().slice(11, 16)
    if (!timeMap.has(timeKey)) {
      timeMap.set(timeKey, { studio1: 0, studio2: 0, studio3: 0 })
    }
    const entry = timeMap.get(timeKey)!
    const studioKey = point.studioId.replace('studio-', 'studio') as
      | 'studio1'
      | 'studio2'
      | 'studio3'
    entry[studioKey] = point.queueDepth
  }

  const queueData = Array.from(timeMap.entries())
    .map(([time, values]) => ({ time, ...values }))
    .reverse()
    .slice(-30)

  return NextResponse.json({ studios: result, queueHistory: queueData })
}
