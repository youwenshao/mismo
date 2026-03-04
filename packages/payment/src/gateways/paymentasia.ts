import crypto from 'crypto'
import type {
  PaymentGatewayAdapter,
  PaymentRequest,
  PaymentResponse,
  WebhookEvent,
  PaymentStatus,
  RefundResult,
  PaymentMethod,
} from '../types'

interface PaymentAsiaConfig {
  apiUrl: string
  merchantId: string
  apiKey: string
  webhookSecret: string
}

interface PaymentAsiaPaymentResponse {
  transaction_id: string
  status: 'pending' | 'completed' | 'failed'
  payment_url?: string
  qr_code_url?: string
  expires_at?: string
  error_code?: string
  error_message?: string
}

interface PaymentAsiaWebhookPayload {
  event: 'payment.completed' | 'payment.failed' | 'payment.refunded'
  transaction_id: string
  merchant_id: string
  amount: number
  currency: string
  status: string
  timestamp: string
  signature: string
  metadata?: Record<string, string>
}

export class PaymentAsiaGateway implements PaymentGatewayAdapter {
  readonly name = 'paymentasia' as const
  readonly supportedMethods: PaymentMethod[] = ['fps', 'alipayhk', 'wechatpay', 'payme', 'octopus']

  private config: PaymentAsiaConfig

  constructor() {
    const apiUrl = process.env.PAYMENTASIA_API_URL || 'https://api.paymentasia.com/v1'
    const merchantId = process.env.PAYMENTASIA_MERCHANT_ID
    const apiKey = process.env.PAYMENTASIA_API_KEY
    const webhookSecret = process.env.PAYMENTASIA_WEBHOOK_SECRET || ''

    if (!merchantId || !apiKey) {
      throw new Error('PaymentAsia configuration missing: MERCHANT_ID and API_KEY required')
    }

    this.config = { apiUrl, merchantId, apiKey, webhookSecret }
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const payload = {
      merchant_id: this.config.merchantId,
      amount: request.amount,
      currency: request.currency.toUpperCase(),
      payment_method: this.mapMethod(request.method),
      description: request.description,
      order_id: request.metadata.paymentId || request.metadata.orderId,
      return_url: request.successUrl,
      notify_url: `${process.env.API_BASE_URL || ''}/api/billing/webhooks/paymentasia`,
      metadata: request.metadata,
    }

    const response = await fetch(`${this.config.apiUrl}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': request.metadata.paymentId || crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`PaymentAsia API error: ${response.status} - ${error}`)
    }

    const data = (await response.json()) as PaymentAsiaPaymentResponse

    if (data.error_code) {
      throw new Error(`PaymentAsia error: ${data.error_code} - ${data.error_message}`)
    }

    return {
      gateway: 'paymentasia',
      transactionId: data.transaction_id,
      checkoutUrl: data.payment_url,
      qrCodeUrl: data.qr_code_url,
      status:
        data.status === 'pending'
          ? 'pending'
          : data.status === 'completed'
            ? 'completed'
            : 'failed',
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
    }
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<WebhookEvent> {
    if (!this.config.webhookSecret) {
      throw new Error('PAYMENTASIA_WEBHOOK_SECRET is not configured — cannot verify webhook')
    }

    const body = payload as PaymentAsiaWebhookPayload

    const computedSig = this.computeSignature(body)
    if (!crypto.timingSafeEqual(Buffer.from(computedSig), Buffer.from(signature || ''))) {
      throw new Error('Invalid webhook signature')
    }

    if (body.merchant_id !== this.config.merchantId) {
      throw new Error('Invalid merchant ID in webhook')
    }

    return this.parseWebhookEvent(body)
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    const response = await fetch(`${this.config.apiUrl}/payments/${transactionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get payment status: ${response.status}`)
    }

    const data = (await response.json()) as PaymentAsiaPaymentResponse

    switch (data.status) {
      case 'completed':
        return 'completed'
      case 'failed':
        return 'failed'
      case 'pending':
      default:
        return 'pending'
    }
  }

  async refund(transactionId: string, amount?: number): Promise<RefundResult> {
    try {
      const payload: Record<string, unknown> = {}
      if (amount) {
        payload.amount = amount
      }

      const response = await fetch(`${this.config.apiUrl}/payments/${transactionId}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.text()
        return { success: false, amount: amount || 0, error }
      }

      const data = (await response.json()) as any

      return {
        success: data.status === 'refunded' || data.status === 'pending',
        refundId: data.refund_id,
        amount: data.amount || amount || 0,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, amount: amount || 0, error: message }
    }
  }

  private mapMethod(method: PaymentMethod): string {
    const methodMap: Record<PaymentMethod, string> = {
      card: 'CARD', // Not used - cards go through Stripe
      fps: 'FPS',
      alipayhk: 'ALIPAYHK',
      wechatpay: 'WECHATHK',
      payme: 'PAYME',
      octopus: 'OCTOPUS',
    }
    return methodMap[method]
  }

  private computeSignature(payload: PaymentAsiaWebhookPayload): string {
    // Create signature from payload + secret
    // Format: HMAC-SHA256 of sorted key-value pairs
    const data = `${payload.transaction_id}:${payload.merchant_id}:${payload.amount}:${payload.timestamp}`
    return crypto.createHmac('sha256', this.config.webhookSecret).update(data).digest('hex')
  }

  private parseWebhookEvent(payload: PaymentAsiaWebhookPayload): WebhookEvent {
    const eventTypeMap: Record<string, WebhookEvent['type']> = {
      'payment.completed': 'payment.completed',
      'payment.failed': 'payment.failed',
      'payment.refunded': 'payment.refunded',
    }

    const statusMap: Record<string, PaymentStatus> = {
      completed: 'completed',
      failed: 'failed',
      refunded: 'refunded',
      pending: 'pending',
    }

    return {
      type: eventTypeMap[payload.event] || 'payment.created',
      gateway: 'paymentasia',
      transactionId: payload.transaction_id,
      status: statusMap[payload.status] || 'pending',
      amount: payload.amount,
      currency: payload.currency?.toLowerCase(),
      metadata: payload.metadata,
      gatewayData: payload,
    }
  }
}

/**
 * Generate HMAC-signed FPS QR code data (alternative to PaymentAsia QR).
 * The payload is base64(JSON) with an appended HMAC so clients cannot tamper with it.
 */
export function generateFPSQRData(merchantId: string, amount: number, reference: string): string {
  const secret = process.env.PAYMENTASIA_WEBHOOK_SECRET || process.env.FPS_QR_HMAC_SECRET
  if (!secret) {
    throw new Error('FPS QR HMAC secret is not configured')
  }

  const data = {
    merchantId,
    amount: (amount / 100).toFixed(2),
    currency: 'HKD',
    reference,
    timestamp: Date.now(),
  }

  const payload = Buffer.from(JSON.stringify(data)).toString('base64')
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${hmac}`
}
