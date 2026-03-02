import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import { createBugReport } from '@mismo/comms'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      commissionId?: string
      title?: string
      description?: string
      stepsToReproduce?: string
    }

    if (!body.commissionId || typeof body.commissionId !== 'string') {
      return NextResponse.json({ error: 'Missing commissionId' }, { status: 400 })
    }
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 })
    }
    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json({ error: 'Missing description' }, { status: 400 })
    }

    const commission = await prisma.commission.findUnique({
      where: { id: body.commissionId },
      include: { builds: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })

    if (!commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
    }

    const latestBuild = commission.builds[0]
    if (!latestBuild?.githubUrl) {
      return NextResponse.json(
        { error: 'No GitHub repository associated with this commission' },
        { status: 400 },
      )
    }

    const result = await createBugReport({
      commissionId: body.commissionId,
      githubUrl: latestBuild.githubUrl,
      title: body.title,
      description: body.description,
      stepsToReproduce: body.stepsToReproduce,
      reporterEmail: commission.clientEmail,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[feedback/bug-report] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
