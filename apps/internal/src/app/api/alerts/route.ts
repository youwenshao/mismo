import { NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import { evaluateAlerts } from '@/lib/alert-evaluator'

export async function GET() {
  const [builds, deliveries] = await Promise.all([
    prisma.build.findMany({
      where: {
        status: { in: ['RUNNING', 'FAILED'] },
      },
      select: {
        id: true,
        commissionId: true,
        status: true,
        kimiqTokensUsed: true,
        executionIds: true,
        createdAt: true,
        updatedAt: true,
        commission: {
          select: {
            feasibilityScore: true,
            prdJson: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    prisma.delivery.findMany({
      where: { contractCheckPassed: false },
      select: {
        id: true,
        commissionId: true,
        contractCheckPassed: true,
      },
    }),
  ])

  const alerts = evaluateAlerts(builds, deliveries)

  return NextResponse.json({ alerts })
}
