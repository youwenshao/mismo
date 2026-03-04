import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import { createRelayerFromEnv } from '@mismo/decidendi'
import { logger } from '@/lib/logger'

const CRON_SECRET = process.env.CRON_SECRET || ''
const GRACE_PERIOD_MS = parseInt(process.env.DECIDENDI_GRACE_PERIOD_DAYS || '3', 10) * 86_400_000

/**
 * Cron endpoint: auto-release final payments after the grace period.
 * Should be called every hour by Vercel Cron, n8n, or an external scheduler.
 *
 * GET /api/cron/decidendi-release
 * Headers: authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const relayer = createRelayerFromEnv()
  if (!relayer) {
    return NextResponse.json({ released: 0, message: 'Decidendi not enabled' })
  }

  const cutoff = new Date(Date.now() - GRACE_PERIOD_MS)

  const commissions = await prisma.commission.findMany({
    where: {
      paymentState: 'FINAL',
      clientAcceptedAt: { not: null, lte: cutoff },
      status: { not: 'COMPLETED' },
      escrowTxHash: { not: null },
    },
    select: { id: true },
  })

  let released = 0
  const errors: string[] = []

  for (const commission of commissions) {
    try {
      const txHash = await relayer.releaseFinal(commission.id)
      await relayer.recordFinalized(commission.id)

      await prisma.commission.update({
        where: { id: commission.id },
        data: { status: 'COMPLETED' },
      })

      released++
      logger.info('Decidendi final released via cron', {
        commissionId: commission.id,
        txHash,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${commission.id}: ${msg}`)
      logger.error('Decidendi release cron failed for commission', {
        commissionId: commission.id,
        error: msg,
      })
    }
  }

  return NextResponse.json({
    released,
    total: commissions.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
