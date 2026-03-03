/**
 * Core types for the unified payment system
 * Supports multiple gateways: Stripe, PaymentAsia
 */

export type PaymentMethod = 'card' | 'fps' | 'alipayhk' | 'wechatpay' | 'payme' | 'octopus'

export type PaymentGateway = 'stripe' | 'paymentasia'

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export type WebhookEventType =
  | 'payment.created'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.disputed'

export interface PaymentRequest {
  /** Amount in smallest currency unit (cents) */
  amount: number
  currency: 'hkd' | 'usd'
  method: PaymentMethod
  description: string
  metadata: Record<string, string>
  successUrl: string
  cancelUrl: string
}

export interface PaymentResponse {
  gateway: PaymentGateway
  transactionId: string
  /** Redirect URL for wallet/card payments */
  checkoutUrl?: string
  /** QR code URL for FPS/Octopus */
  qrCodeUrl?: string
  status: PaymentStatus
  expiresAt?: Date
}

export interface WebhookEvent {
  type: WebhookEventType
  gateway: PaymentGateway
  transactionId: string
  status: PaymentStatus
  amount?: number
  currency?: string
  metadata?: Record<string, string>
  /** Raw gateway response for audit purposes */
  gatewayData?: unknown
}

export interface RefundResult {
  success: boolean
  refundId?: string
  amount: number
  error?: string
}

export interface PaymentGatewayAdapter {
  readonly name: PaymentGateway
  readonly supportedMethods: PaymentMethod[]

  createPayment(request: PaymentRequest): Promise<PaymentResponse>
  verifyWebhook(payload: unknown, signature: string): Promise<WebhookEvent>
  getPaymentStatus(transactionId: string): Promise<PaymentStatus>
  refund(transactionId: string, amount?: number): Promise<RefundResult>
}

/** Gateway routing configuration */
export const GATEWAY_ROUTES: Record<PaymentMethod, PaymentGateway> = {
  card: 'stripe',
  fps: 'paymentasia',
  alipayhk: 'paymentasia',
  wechatpay: 'paymentasia',
  payme: 'paymentasia',
  octopus: 'paymentasia',
}

/** Gateway fee rates (as decimal, e.g., 0.016 = 1.6%) */
export const GATEWAY_FEES: Record<PaymentGateway, { percentage: number; fixed?: number }> = {
  stripe: { percentage: 0.034, fixed: 2.35 },
  paymentasia: { percentage: 0.016 },
}

/**
 * Calculate fee for a given amount and gateway
 */
export function calculateFee(amount: number, gateway: PaymentGateway): number {
  const fee = GATEWAY_FEES[gateway]
  const variableFee = Math.round(amount * fee.percentage)
  const fixedFee = fee.fixed ? Math.round(fee.fixed * 100) : 0 // Convert HKD to cents
  return variableFee + fixedFee
}

/**
 * Get gateway for a payment method
 */
export function getGatewayForMethod(method: PaymentMethod): PaymentGateway {
  return GATEWAY_ROUTES[method]
}

/** Methods that default to enabled when no env flag is set */
const DEFAULT_ENABLED_METHODS: Set<PaymentMethod> = new Set(['card'])

/**
 * Check if a payment method is enabled via feature flags.
 * Only 'card' (Stripe) is enabled by default; all others require explicit opt-in.
 */
export function isPaymentMethodEnabled(method: PaymentMethod): boolean {
  const flags: Record<PaymentMethod, string> = {
    card: 'ENABLE_STRIPE_CARD',
    fps: 'ENABLE_FPS',
    alipayhk: 'ENABLE_ALIPAYHK',
    wechatpay: 'ENABLE_WECHATPAY',
    payme: 'ENABLE_PAYME',
    octopus: 'ENABLE_OCTOPUS',
  }

  const flag = process.env[flags[method]]
  if (flag === undefined) {
    return DEFAULT_ENABLED_METHODS.has(method)
  }
  return flag === 'true' || flag === '1'
}
