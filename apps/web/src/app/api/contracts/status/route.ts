import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: projectId' },
      { status: 400 },
    )
  }

  const contract = await prisma.contract.findFirst({
    where: { projectId, status: { not: 'VOIDED' } },
    orderBy: { createdAt: 'desc' },
  })

  if (!contract) {
    return NextResponse.json({
      projectId,
      status: 'NONE' as const,
      acknowledgments: { ip: false, age: false, aup: false },
    })
  }

  return NextResponse.json({
    projectId,
    contractId: contract.id,
    status: contract.status,
    signedAt: contract.signedAt?.toISOString() ?? null,
    acknowledgments: {
      ip: contract.ipAcknowledged,
      age: contract.ageAcknowledged,
      aup: contract.aupAcknowledged,
    },
  })
}
