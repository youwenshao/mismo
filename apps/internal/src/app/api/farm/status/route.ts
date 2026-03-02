import { NextResponse } from 'next/server'
import { prisma } from '@mismo/db'

export async function GET() {
  const [alerts, studioMetrics] = await Promise.all([
    prisma.monitoringAlert.findMany({
      where: { resolvedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.studioMetrics.findMany({
      where: {
        studioId: { in: ['studio-1', 'studio-2', 'studio-3'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      distinct: ['studioId'],
    }),
  ])

  const unresolvedP0 = alerts.filter(a => a.priority === 'P0').length
  const unresolvedP1 = alerts.filter(a => a.priority === 'P1').length

  let overall: 'healthy' | 'degraded' | 'critical' = 'healthy'
  if (unresolvedP0 > 0) overall = 'critical'
  else if (unresolvedP1 > 0) overall = 'degraded'

  const providerOverride = await prisma.systemConfig.findUnique({
    where: { key: 'active_ai_provider' },
  })

  const githubPause = await prisma.systemConfig.findUnique({
    where: { key: 'github_builds_paused' },
  })

  return NextResponse.json({
    overall,
    unresolvedAlerts: { P0: unresolvedP0, P1: unresolvedP1, total: alerts.length },
    studios: studioMetrics,
    activeProvider: (providerOverride?.value as Record<string, unknown>)?.provider || 'default',
    githubPaused: (githubPause?.value as Record<string, unknown>)?.paused || false,
    lastAlertAt: alerts[0]?.createdAt || null,
  })
}
