import { prisma } from '@mismo/db'
import { createRelayerFromEnv, hkdCentsToUsdc } from '@mismo/decidendi'
import { logger } from './logger'

const N8N_BUILD_WEBHOOK =
  process.env.N8N_BUILD_PIPELINE_WEBHOOK_URL || 'http://localhost:5678/webhook/build-pipeline'

/**
 * Advance a commission's payment state after a payment completes.
 * UNPAID -> PARTIAL (deposit received, triggers build)
 * PARTIAL -> FINAL  (final invoice received)
 *
 * Returns the new payment state, or null if no commission was linked.
 */
export async function advanceCommissionPaymentState(
  commissionId: string | null | undefined,
): Promise<'PARTIAL' | 'FINAL' | null> {
  if (!commissionId) return null

  const commission = await prisma.commission.findUnique({
    where: { id: commissionId },
    select: { id: true, paymentState: true, status: true, prdJson: true },
  })

  if (!commission) {
    logger.warn('advanceCommissionPaymentState: commission not found', { commissionId })
    return null
  }

  if (commission.paymentState === 'FINAL') return null

  if (commission.paymentState === 'UNPAID') {
    await prisma.commission.update({
      where: { id: commissionId },
      data: { paymentState: 'PARTIAL' },
    })

    logger.info('Commission paymentState advanced to PARTIAL (deposit received)', { commissionId })

    await lockDepositOnChain(commissionId, commission.prdJson)

    if (process.env.ENABLE_AUTO_BUILD === 'true') {
      await triggerBuildPipeline(commissionId, commission.prdJson, commission.status)
    }

    return 'PARTIAL'
  }

  if (commission.paymentState === 'PARTIAL') {
    await prisma.commission.update({
      where: { id: commissionId },
      data: { paymentState: 'FINAL' },
    })

    logger.info('Commission paymentState advanced to FINAL (final invoice received)', {
      commissionId,
    })

    await lockFinalOnChain(commissionId)

    return 'FINAL'
  }

  return null
}

async function triggerBuildPipeline(
  commissionId: string,
  prdJson: unknown,
  currentStatus: string,
): Promise<void> {
  try {
    const build = await prisma.build.create({
      data: {
        commissionId,
        status: 'PENDING',
      },
    })

    if (currentStatus === 'DRAFT' || currentStatus === 'DISCOVERY') {
      await prisma.commission.update({
        where: { id: commissionId },
        data: { status: 'IN_PROGRESS' },
      })
    }

    const payload = {
      buildId: build.id,
      prdJson: prdJson ?? {},
    }

    const res = await fetch(N8N_BUILD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      logger.error('n8n build-pipeline webhook returned non-OK', {
        commissionId,
        buildId: build.id,
        status: res.status,
      })
    } else {
      logger.info('Build pipeline triggered', { commissionId, buildId: build.id })
    }
  } catch (err) {
    logger.error('Failed to trigger build pipeline', {
      commissionId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

async function lockDepositOnChain(commissionId: string, prdJson: unknown): Promise<void> {
  const relayer = createRelayerFromEnv()
  if (!relayer) return

  try {
    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: { payments: { where: { status: 'COMPLETED', phase: 'DEPOSIT' } } },
    })
    if (!commission || commission.payments.length === 0) return

    const depositPayment = commission.payments[0]
    const depositUsdc = hkdCentsToUsdc(depositPayment.amount)

    const depositRatio = parseFloat(process.env.DECIDENDI_DEPOSIT_RATIO || '0.40')
    const totalHkdCents = Math.round(depositPayment.amount / depositRatio)
    const finalHkdCents = totalHkdCents - depositPayment.amount
    const finalUsdc = hkdCentsToUsdc(finalHkdCents)

    const slaBufferDays = parseInt(process.env.DECIDENDI_SLA_BUFFER_DAYS || '7', 10)
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + slaBufferDays * 86400 + 30 * 86400

    const payerAddress = relayer.relayerAddress

    const txHash = await relayer.lockDeposit(
      commissionId,
      payerAddress,
      depositUsdc,
      finalUsdc,
      deadlineTimestamp,
      prdJson,
    )

    await relayer.registerCommission(commissionId, prdJson, payerAddress, depositUsdc, finalUsdc)

    await prisma.commission.update({
      where: { id: commissionId },
      data: {
        escrowTxHash: txHash,
        escrowChainId: parseInt(process.env.BASE_CHAIN_ID || '8453', 10),
      },
    })

    logger.info('Decidendi deposit locked on-chain', {
      commissionId,
      txHash,
      depositUsdc: depositUsdc.toString(),
    })
  } catch (err) {
    logger.error('Failed to lock deposit on-chain (non-blocking)', {
      commissionId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

async function lockFinalOnChain(commissionId: string): Promise<void> {
  const relayer = createRelayerFromEnv()
  if (!relayer) return

  try {
    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: { payments: { where: { status: 'COMPLETED', phase: 'FINAL' } } },
    })
    if (!commission || commission.payments.length === 0) return

    const finalPayment = commission.payments[0]
    const finalUsdc = hkdCentsToUsdc(finalPayment.amount)

    const txHash = await relayer.lockFinal(commissionId, finalUsdc)

    logger.info('Decidendi final payment locked on-chain', {
      commissionId,
      txHash,
      finalUsdc: finalUsdc.toString(),
    })
  } catch (err) {
    logger.error('Failed to lock final on-chain (non-blocking)', {
      commissionId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
