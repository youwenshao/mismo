import { NextRequest, NextResponse } from 'next/server'
import { createRelayerFromEnv, Milestone } from '@mismo/decidendi'
import { keccak256, toBytes } from 'viem'
import { logger } from '@/lib/logger'

const INTERNAL_SECRET = process.env.DECIDENDI_INTERNAL_SECRET || ''

/**
 * Internal API for the n8n pipeline to relay milestone completions on-chain.
 * Called when builds or deliveries complete.
 *
 * POST /api/decidendi/milestone
 * Headers: x-internal-secret
 * Body: { commissionId, milestone: 'BUILD_COMPLETE' | 'DELIVERED', deliveryHash? }
 */
export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-internal-secret')
    if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { commissionId, milestone, deliveryHash } = body as {
      commissionId: string
      milestone: 'BUILD_COMPLETE' | 'DELIVERED'
      deliveryHash?: string
    }

    if (!commissionId || !milestone) {
      return NextResponse.json(
        { error: 'Missing required fields: commissionId, milestone' },
        { status: 400 },
      )
    }

    const relayer = createRelayerFromEnv()
    if (!relayer) {
      return NextResponse.json({
        success: true,
        onChain: false,
        message: 'Decidendi not enabled, milestone recorded off-chain only',
      })
    }

    const milestoneEnum =
      milestone === 'BUILD_COMPLETE' ? Milestone.BUILD_COMPLETE : Milestone.DELIVERED

    const txHash = await relayer.completeMilestone(commissionId, milestoneEnum)

    if (milestone === 'BUILD_COMPLETE') {
      await relayer.recordBuildComplete(commissionId)
    } else if (milestone === 'DELIVERED') {
      const hash = deliveryHash
        ? (deliveryHash as `0x${string}`)
        : keccak256(toBytes(`delivery-${commissionId}-${Date.now()}`))
      await relayer.recordDelivered(commissionId, hash)
    }

    logger.info('Decidendi milestone relayed on-chain', {
      commissionId,
      milestone,
      txHash,
    })

    return NextResponse.json({
      success: true,
      onChain: true,
      txHash,
      milestone,
      explorerUrl: relayer.getExplorerUrl(txHash),
    })
  } catch (error) {
    logger.error('Decidendi milestone relay failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Failed to relay milestone on-chain' }, { status: 500 })
  }
}
