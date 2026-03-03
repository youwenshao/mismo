import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const build = await prisma.build.findUnique({
    where: { id },
    select: {
      id: true,
      commissionId: true,
      status: true,
      errorLogs: true,
      failureCount: true,
      studioAssignment: true,
      kimiqTokensUsed: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!build) {
    return NextResponse.json({ error: 'Build not found' }, { status: 404 })
  }

  return NextResponse.json({ build })
}
