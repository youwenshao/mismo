import { NextResponse } from 'next/server'
import { prisma } from '@mismo/db'

export async function GET() {
  try {
    const monitors = await prisma.hostingTransfer.findMany({
      where: {
        monitoringEnabled: true,
        monitoringUntil: { gt: new Date() },
        deploymentUrl: { not: null },
      },
      select: {
        id: true,
        provider: true,
        deploymentUrl: true,
        monitoringUntil: true,
        lastHealthCheck: true,
        healthStatus: true,
      },
    })

    return NextResponse.json({ monitors })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[monitors/active] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
