import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import { predictEta } from '@/lib/eta-predictor'

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
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  })

  if (!commission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const currentBuild = commission.builds[0]
  if (!currentBuild || currentBuild.status === 'SUCCESS') {
    return NextResponse.json({
      prediction: null,
      message: currentBuild?.status === 'SUCCESS'
        ? 'Build already completed'
        : 'No active build',
    })
  }

  // Fetch historical builds for the same archetype
  const historicalBuilds = await prisma.build.findMany({
    where: {
      commission: {
        archetypeId: commission.archetypeId ?? undefined,
      },
      status: { in: ['SUCCESS', 'FAILED'] },
    },
    select: {
      createdAt: true,
      updatedAt: true,
      status: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const prediction = predictEta(currentBuild.createdAt, historicalBuilds)

  return NextResponse.json({ prediction })
}
