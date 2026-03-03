import { NextResponse } from 'next/server'
import { prisma } from '@mismo/db'

export async function GET() {
  const providers = ['kimi', 'supabase', 'github']

  const latestSnapshots = await Promise.all(
    providers.map((provider) =>
      prisma.apiHealthSnapshot.findFirst({
        where: { provider },
        orderBy: { createdAt: 'desc' },
      }),
    ),
  )

  const services = providers.map((provider, i) => {
    const snap = latestSnapshots[i]
    return {
      provider,
      status: snap?.status || 'unknown',
      latencyMs: snap?.latencyMs || 0,
      details: snap?.details || null,
      lastChecked: snap?.createdAt || null,
    }
  })

  const hasDown = services.some((s) => s.status === 'down')
  const hasDegraded = services.some((s) => s.status === 'degraded' || s.status === 'rate_limited')
  const overall = hasDown ? 'critical' : hasDegraded ? 'degraded' : 'healthy'

  return NextResponse.json({ overall, services })
}
