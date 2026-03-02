import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      commissionId?: string
      result?: string
    }

    if (!body.commissionId || typeof body.commissionId !== 'string') {
      return NextResponse.json({ error: 'Missing commissionId' }, { status: 400 })
    }

    const resultData = typeof body.result === 'string' ? JSON.parse(body.result) : body.result

    const nextCheck = new Date()
    nextCheck.setMonth(nextCheck.getMonth() + 1)

    await prisma.maintenancePlan.update({
      where: { commissionId: body.commissionId },
      data: {
        lastCheckAt: new Date(),
        nextCheckAt: nextCheck,
        dependencyState: resultData,
      },
    })

    return NextResponse.json({ saved: true })
  } catch (err) {
    console.error('[maintenance/report] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
