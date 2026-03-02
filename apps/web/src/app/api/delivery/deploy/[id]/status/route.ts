import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const transfer = await prisma.hostingTransfer.findUnique({
    where: { id },
    select: {
      id: true,
      provider: true,
      status: true,
      deploymentUrl: true,
      deploymentOutput: true,
      transferOutput: true,
      monitoringEnabled: true,
      monitoringUntil: true,
      lastHealthCheck: true,
      healthStatus: true,
      failureCount: true,
      retryCount: true,
      errorLogs: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!transfer) {
    return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
  }

  return NextResponse.json(transfer)
}
