import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import { dispatch } from '@mismo/comms'
import type { Locale } from '@mismo/comms'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      commissionId?: string
      rating?: number
      comment?: string
    }

    if (!body.commissionId || typeof body.commissionId !== 'string') {
      return NextResponse.json({ error: 'Missing commissionId' }, { status: 400 })
    }
    if (!body.rating || typeof body.rating !== 'number' || body.rating < 1 || body.rating > 10) {
      return NextResponse.json({ error: 'Rating must be 1-10' }, { status: 400 })
    }

    const commission = await prisma.commission.findUnique({
      where: { id: body.commissionId },
      include: { clientPreference: true },
    })

    if (!commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
    }

    await prisma.feedback.create({
      data: {
        commissionId: body.commissionId,
        rating: body.rating,
        comment: body.comment ?? null,
      },
    })

    if (body.rating < 7) {
      await prisma.commission.update({
        where: { id: body.commissionId },
        data: { status: 'ESCALATED' },
      })

      const locale = (commission.clientPreference?.locale ?? 'en') as Locale
      const projectName = (commission.prdJson as Record<string, unknown>)?.name as string ?? 'Your Project'

      await dispatch({
        event: 'SUPPORT_REQUIRED',
        data: {
          clientName: commission.clientEmail.split('@')[0],
          clientEmail: commission.clientEmail,
          projectName,
          commissionId: commission.id,
          locale,
          reason: `Client rated the build ${body.rating}/10`,
          failureCount: 0,
        },
        slackWebhookUrl: commission.clientPreference?.slackWebhookUrl,
      })
    }

    return NextResponse.json({ saved: true, escalated: body.rating < 7 })
  } catch (err) {
    console.error('[feedback] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
