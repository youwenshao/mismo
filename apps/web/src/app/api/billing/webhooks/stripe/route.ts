import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@mismo/db'
import { HostingTransferOrchestrator } from '@mismo/ai'
import { advanceCommissionPaymentState } from '@/lib/commission-lifecycle'

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'REFUNDED'])

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Stripe webhook signature verification failed: ${message}`)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const paymentId = session.metadata?.paymentId

      if (paymentId) {
        const existing = await prisma.payment.findUnique({ where: { id: paymentId } })
        if (existing && !TERMINAL_STATUSES.has(existing.status)) {
          await prisma.payment.update({
            where: { id: paymentId },
            data: { status: 'COMPLETED', completedAt: new Date() },
          })
          await advanceCommissionPaymentState(existing.commissionId)
        }
      }

      const { transferId } = session.metadata ?? {}
      if (transferId) {
        try {
          const orchestrator = new HostingTransferOrchestrator()
          await orchestrator.onPaymentConfirmed(session.id)
        } catch (err) {
          console.error(
            `Failed to process transfer payment: ${err instanceof Error ? err.message : err}`,
          )
        }
      }
      break
    }

    case 'checkout.session.expired': {
      const session = event.data.object
      const paymentId = session.metadata?.paymentId

      if (paymentId) {
        const existing = await prisma.payment.findUnique({ where: { id: paymentId } })
        if (existing && !TERMINAL_STATUSES.has(existing.status)) {
          await prisma.payment.update({
            where: { id: paymentId },
            data: { status: 'FAILED', failedAt: new Date() },
          })
        }
      }
      break
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object
      const { transferId } = paymentIntent.metadata ?? {}
      if (transferId) {
        try {
          const orchestrator = new HostingTransferOrchestrator()
          await orchestrator.onPaymentConfirmed(paymentIntent.id)
        } catch (err) {
          console.error(
            `Failed to process transfer payment: ${err instanceof Error ? err.message : err}`,
          )
        }
      }
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object
      const paymentIntentId = charge.payment_intent as string | null
      if (paymentIntentId) {
        const payment = await prisma.payment.findFirst({
          where: { transactionId: paymentIntentId, gateway: 'STRIPE' },
        })
        if (payment && !TERMINAL_STATUSES.has(payment.status)) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'REFUNDED', refundedAt: new Date() },
          })
        }
      }
      break
    }

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
