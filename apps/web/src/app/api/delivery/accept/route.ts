import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import { dispatch } from '@mismo/comms'
import type { Locale } from '@mismo/comms'
import { createRelayerFromEnv } from '@mismo/decidendi'
import { getSessionUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { commissionId, accepted, reason } = body as {
      commissionId?: string
      accepted?: boolean
      reason?: string
    }

    if (!commissionId || typeof accepted !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: commissionId, accepted' },
        { status: 400 },
      )
    }

    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: { clientPreference: true },
    })

    if (!commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
    }

    if (commission.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (commission.clientAcceptedAt || commission.clientRejectedAt) {
      return NextResponse.json({ error: 'Deliverable has already been reviewed' }, { status: 409 })
    }

    if (accepted) {
      await prisma.commission.update({
        where: { id: commissionId },
        data: { clientAcceptedAt: new Date() },
      })

      const relayer = createRelayerFromEnv()
      if (relayer) {
        try {
          await relayer.clientAccept(commissionId)
          await relayer.recordAccepted(commissionId)
          logger.info('Decidendi clientAccept relayed on-chain', { commissionId })
        } catch (err) {
          logger.error('Failed to relay clientAccept on-chain (non-blocking)', {
            commissionId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }

      return NextResponse.json({
        accepted: true,
        commissionId,
        message: 'Deliverables accepted. Final invoice will be issued.',
      })
    }

    await prisma.commission.update({
      where: { id: commissionId },
      data: {
        clientRejectedAt: new Date(),
        rejectionReason: reason ?? null,
        status: 'ESCALATED',
      },
    })

    const locale = (commission.clientPreference?.locale ?? 'en') as Locale
    const projectName =
      ((commission.prdJson as Record<string, unknown>)?.name as string) ?? 'Your Project'

    await dispatch({
      event: 'SUPPORT_REQUIRED',
      data: {
        clientName: commission.clientEmail.split('@')[0],
        clientEmail: commission.clientEmail,
        projectName,
        commissionId,
        locale,
        reason: reason ?? 'Client rejected deliverables',
        failureCount: 0,
      },
      slackWebhookUrl: commission.clientPreference?.slackWebhookUrl,
    })

    return NextResponse.json({
      accepted: false,
      commissionId,
      escalated: true,
      message: 'Deliverables rejected. Support team has been notified.',
    })
  } catch (error) {
    console.error('[delivery/accept] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
