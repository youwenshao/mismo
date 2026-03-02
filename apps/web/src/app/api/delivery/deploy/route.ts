import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import { HostingTransferOrchestrator } from '@mismo/ai'
import { TransferRequestSchema } from '@mismo/ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = TransferRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { commissionId, provider } = parsed.data

    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
    })
    if (!commission) {
      return NextResponse.json(
        { error: 'Commission not found' },
        { status: 404 },
      )
    }

    const orchestrator = new HostingTransferOrchestrator()
    const transferId = await orchestrator.initiate(parsed.data)

    const paymentRequired = !parsed.data.stripePaymentIntentId
    let status = 'PENDING_PAYMENT'

    if (!paymentRequired && parsed.data.stripePaymentIntentId) {
      await orchestrator.onPaymentConfirmed(parsed.data.stripePaymentIntentId)
      const updated = await prisma.hostingTransfer.findUnique({
        where: { id: transferId },
      })
      status = updated?.status ?? status
    }

    return NextResponse.json({
      transferId,
      status,
      provider,
      paymentRequired,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[deploy] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
