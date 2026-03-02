import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import { dispatch, mapBuildStatusToEvent, STAGE_LABELS, stageToProgress } from '@mismo/comms'
import type {
  BuildStartedData,
  BuildCompleteData,
  SupportRequiredData,
  BuildProgressData,
} from '@mismo/comms'
import type { Locale } from '@mismo/comms'

interface BuildStagePayload {
  type: 'build_stage_change'
  build_id: string
  commission_id: string
  old_status: string
  new_status: string
  github_url: string | null
  vercel_url: string | null
  failure_count: number
}

interface CommissionStatusPayload {
  type: 'commission_status_change'
  commission_id: string
  old_status: string
  new_status: string
}

type WebhookPayload = BuildStagePayload | CommissionStatusPayload

function verifyWebhookSecret(req: NextRequest): boolean {
  const secret = process.env.COMMS_WEBHOOK_SECRET
  if (!secret) return true
  const provided = req.headers.get('x-webhook-secret')
  return provided === secret
}

export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = (await req.json()) as WebhookPayload

    if (payload.type === 'build_stage_change') {
      return handleBuildStageChange(payload)
    }

    if (payload.type === 'commission_status_change') {
      return handleCommissionStatusChange(payload)
    }

    return NextResponse.json({ error: 'Unknown payload type' }, { status: 400 })
  } catch (err) {
    console.error('[comms/webhook] Processing failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function handleBuildStageChange(payload: BuildStagePayload) {
  const event = mapBuildStatusToEvent(payload.old_status, payload.new_status)
  if (!event) {
    return NextResponse.json({ skipped: true, reason: 'No notification mapped for this transition' })
  }

  const commission = await prisma.commission.findUnique({
    where: { id: payload.commission_id },
    include: { clientPreference: true },
  })

  if (!commission) {
    return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
  }

  const locale = (commission.clientPreference?.locale ?? 'en') as Locale
  const slackWebhookUrl = commission.clientPreference?.slackWebhookUrl
  const projectName = (commission.prdJson as Record<string, unknown>)?.name as string ?? 'Your Project'
  const clientName = commission.clientEmail.split('@')[0]

  const baseData = {
    clientName,
    clientEmail: commission.clientEmail,
    projectName,
    commissionId: commission.id,
    locale,
  }

  let dispatchData
  switch (event) {
    case 'BUILD_STARTED': {
      const stageLabel = STAGE_LABELS[payload.new_status]?.[locale] ?? payload.new_status
      dispatchData = { ...baseData, stage: stageLabel } satisfies BuildStartedData
      break
    }
    case 'BUILD_COMPLETE': {
      dispatchData = {
        ...baseData,
        buildId: payload.build_id,
        githubUrl: payload.github_url ?? '',
        vercelUrl: payload.vercel_url ?? undefined,
      } satisfies BuildCompleteData
      break
    }
    case 'SUPPORT_REQUIRED': {
      dispatchData = {
        ...baseData,
        reason: `Build failed (attempt ${payload.failure_count})`,
        failureCount: payload.failure_count,
      } satisfies SupportRequiredData
      break
    }
    default:
      return NextResponse.json({ skipped: true })
  }

  const result = await dispatch({ event, data: dispatchData, slackWebhookUrl })

  await prisma.notification.create({
    data: {
      commissionId: commission.id,
      event,
      channel: 'EMAIL',
      subject: `${event} notification`,
      bodySnapshot: JSON.stringify(dispatchData),
      metadata: JSON.parse(JSON.stringify(result)),
    },
  })

  return NextResponse.json({ dispatched: true, result })
}

async function handleCommissionStatusChange(payload: CommissionStatusPayload) {
  const commission = await prisma.commission.findUnique({
    where: { id: payload.commission_id },
    include: { clientPreference: true },
  })

  if (!commission) {
    return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
  }

  const locale = (commission.clientPreference?.locale ?? 'en') as Locale
  const slackWebhookUrl = commission.clientPreference?.slackWebhookUrl
  const projectName = (commission.prdJson as Record<string, unknown>)?.name as string ?? 'Your Project'
  const clientName = commission.clientEmail.split('@')[0]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (payload.new_status === 'COMPLETED' && payload.old_status !== 'COMPLETED') {
    const result = await dispatch({
      event: 'FEEDBACK_REQUEST',
      data: {
        clientName,
        clientEmail: commission.clientEmail,
        projectName,
        commissionId: commission.id,
        locale,
        deliveryDate: new Date().toISOString().split('T')[0],
        feedbackUrl: `${appUrl}/feedback/${commission.id}`,
      },
      slackWebhookUrl,
    })

    await prisma.notification.create({
      data: {
        commissionId: commission.id,
        event: 'FEEDBACK_REQUEST',
        channel: 'EMAIL',
        subject: 'Feedback request',
        bodySnapshot: JSON.stringify({ projectName }),
      },
    })

    return NextResponse.json({ dispatched: true, result })
  }

  if (payload.new_status === 'ESCALATED' && payload.old_status !== 'ESCALATED') {
    const result = await dispatch({
      event: 'SUPPORT_REQUIRED',
      data: {
        clientName,
        clientEmail: commission.clientEmail,
        projectName,
        commissionId: commission.id,
        locale,
        reason: 'Multiple build failures detected',
        failureCount: 3,
      },
      slackWebhookUrl,
    })

    await prisma.notification.create({
      data: {
        commissionId: commission.id,
        event: 'SUPPORT_REQUIRED',
        channel: 'EMAIL',
        subject: 'Support required',
        bodySnapshot: JSON.stringify({ projectName }),
      },
    })

    return NextResponse.json({ dispatched: true, result })
  }

  return NextResponse.json({ skipped: true, reason: 'No notification for this transition' })
}
