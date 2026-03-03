import { NextRequest, NextResponse } from 'next/server'
import { PaymentAsiaGateway } from '@mismo/payment'
import { prisma } from '@mismo/db'
import { HostingTransferOrchestrator } from '@mismo/ai'

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'REFUNDED'])

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const signature = request.headers.get('x-paymentasia-signature') || ''

    let gateway: PaymentAsiaGateway
    try {
      gateway = new PaymentAsiaGateway()
    } catch {
      console.error('PaymentAsia gateway not configured')
      return NextResponse.json({ error: 'Gateway not configured' }, { status: 503 })
    }

    const event = await gateway.verifyWebhook(payload, signature)

    const payment = await prisma.payment.findFirst({
      where: {
        transactionId: event.transactionId,
        gateway: 'PAYMENTASIA',
      },
    })

    if (!payment) {
      console.warn(`Payment not found for transaction: ${event.transactionId}`)
      return NextResponse.json({ received: true })
    }

    // Idempotency: skip if already in terminal state
    if (TERMINAL_STATUSES.has(payment.status)) {
      return NextResponse.json({ received: true, skipped: true })
    }

    switch (event.type) {
      case 'payment.completed': {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        })

        const metadata = payment.metadata as Record<string, string> | null
        if (metadata?.transferId) {
          try {
            const orchestrator = new HostingTransferOrchestrator()
            await orchestrator.onPaymentConfirmed(event.transactionId)
          } catch (err) {
            console.error(
              `Failed to process transfer payment: ${err instanceof Error ? err.message : err}`,
            )
          }
        }
        break
      }

      case 'payment.failed': {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED', failedAt: new Date() },
        })
        break
      }

      case 'payment.refunded': {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED', refundedAt: new Date() },
        })
        break
      }

      default:
        console.log(`Unhandled PaymentAsia event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('PaymentAsia webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 })
  }
}
