import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const hours = Math.min(parseInt(searchParams.get('hours') || '6', 10), 48)
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)

  const studioIds = ['studio-1', 'studio-2', 'studio-3']

  const metrics = await prisma.studioMetrics.findMany({
    where: {
      studioId: { in: studioIds },
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      studioId: true,
      cpuPercent: true,
      ramPercent: true,
      diskPercent: true,
      queueDepth: true,
      containerCount: true,
      createdAt: true,
    },
  })

  const byStudio: Record<
    string,
    Array<{
      timestamp: string
      cpu: number
      ram: number
      disk: number
      queueDepth: number
      containers: number
    }>
  > = {}

  for (const id of studioIds) {
    byStudio[id] = []
  }

  for (const m of metrics) {
    byStudio[m.studioId]?.push({
      timestamp: m.createdAt.toISOString(),
      cpu: m.cpuPercent,
      ram: m.ramPercent,
      disk: m.diskPercent,
      queueDepth: m.queueDepth,
      containers: m.containerCount,
    })
  }

  return NextResponse.json({ hours, history: byStudio })
}
