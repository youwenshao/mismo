import Stripe from 'stripe'
import type {
  PaymentGatewayAdapter,
  PaymentRequest,
  PaymentResponse,
  WebhookEvent,
  PaymentStatus,
  RefundResult,
  PaymentMethod,
} from '../types'

export class StripeGateway implements PaymentGatewayAdapter {
  readonly name = 'stripe' as const
  readonly supportedMethods: PaymentMethod[] = ['card']

  private stripe: Stripe
  private webhookSecret: string

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }

    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2026-01-28.clover',
    })
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: request.currency,
            product_data: {
              name: request.description,
            },
            unit_amount: request.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: request.successUrl,
      cancel_url: request.cancelUrl,
      metadata: request.metadata,
    })

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL')
    }

    return {
      gateway: 'stripe',
      transactionId: session.id,
      checkoutUrl: session.url,
      status: 'pending',
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
    }
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<WebhookEvent> {
    if (!this.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
    }

    let event: Stripe.Event
    try {
      event = this.stripe.webhooks.constructEvent(payload as string, signature, this.webhookSecret)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      throw new Error(`Webhook signature verification failed: ${message}`)
    }

    return this.parseStripeEvent(event)
  }

  async getPaymentStatus(sessionId: string): Promise<PaymentStatus> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId)

    switch (session.payment_status) {
      case 'paid':
        return 'completed'
      case 'unpaid':
        return session.status === 'expired' ? 'failed' : 'pending'
      default:
        return 'pending'
    }
  }

  async refund(sessionId: string, amount?: number): Promise<RefundResult> {
    try {
      // Get the payment intent from the session
      const session = await this.stripe.checkout.sessions.retrieve(sessionId)
      const paymentIntentId = session.payment_intent as string

      if (!paymentIntentId) {
        return { success: false, amount: amount || 0, error: 'No payment intent found' }
      }

      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      }

      if (amount) {
        refundParams.amount = amount
      }

      const refund = await this.stripe.refunds.create(refundParams)

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
        amount: refund.amount,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, amount: amount || 0, error: message }
    }
  }

  private parseStripeEvent(event: Stripe.Event): WebhookEvent {
    const baseEvent: Partial<WebhookEvent> = {
      gateway: 'stripe',
      type: 'payment.created',
      status: 'pending',
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        return {
          ...baseEvent,
          type: 'payment.completed',
          transactionId: session.id,
          status: 'completed',
          amount: session.amount_total || undefined,
          currency: session.currency || undefined,
          metadata: session.metadata || undefined,
          gatewayData: session,
        } as WebhookEvent
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        return {
          ...baseEvent,
          type: 'payment.failed',
          transactionId: session.id,
          status: 'failed',
          metadata: session.metadata || undefined,
          gatewayData: session,
        } as WebhookEvent
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent
        return {
          ...baseEvent,
          type: 'payment.failed',
          transactionId: intent.id,
          status: 'failed',
          metadata: intent.metadata || undefined,
          gatewayData: intent,
        } as WebhookEvent
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        return {
          ...baseEvent,
          type: 'payment.refunded',
          transactionId: charge.payment_intent as string,
          status: 'refunded',
          amount: charge.amount_refunded,
          currency: charge.currency,
          gatewayData: charge,
        } as WebhookEvent
      }

      default:
        throw new Error(`Unhandled Stripe event type: ${event.type}`)
    }
  }
}
