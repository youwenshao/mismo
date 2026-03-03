import type {
  PaymentGatewayAdapter,
  PaymentRequest,
  PaymentResponse,
  PaymentMethod,
  PaymentGateway,
  WebhookEvent,
  PaymentStatus,
  RefundResult,
} from '../types'
import { GATEWAY_ROUTES, isPaymentMethodEnabled } from '../types'

interface RouterConfig {
  gateways: Record<PaymentGateway, PaymentGatewayAdapter>
  /** Override gateway routes for specific methods (for A/B testing, etc.) */
  routeOverrides?: Partial<Record<PaymentMethod, PaymentGateway>>
}

export class PaymentRouter {
  private gateways: Record<PaymentGateway, PaymentGatewayAdapter>
  private routeOverrides: Partial<Record<PaymentMethod, PaymentGateway>>

  constructor(config: RouterConfig) {
    this.gateways = config.gateways
    this.routeOverrides = config.routeOverrides || {}
  }

  /**
   * Process a payment through the appropriate gateway
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (!isPaymentMethodEnabled(request.method)) {
      throw new Error(`Payment method '${request.method}' is not enabled`)
    }

    const gateway = this.resolveGateway(request.method)

    if (!gateway.supportedMethods.includes(request.method)) {
      throw new Error(`Gateway '${gateway.name}' does not support '${request.method}'`)
    }

    return gateway.createPayment(request)
  }

  /**
   * Resolve the gateway name string for a payment method
   */
  resolveGatewayName(method: PaymentMethod): PaymentGateway {
    return this.routeOverrides[method] || GATEWAY_ROUTES[method]
  }

  /**
   * Get the gateway adapter for a specific payment method
   */
  resolveGateway(method: PaymentMethod): PaymentGatewayAdapter {
    const gatewayName = this.resolveGatewayName(method)
    const gateway = this.gateways[gatewayName]

    if (!gateway) {
      throw new Error(`Gateway '${gatewayName}' is not configured for method '${method}'`)
    }

    return gateway
  }

  /**
   * Verify a webhook from any configured gateway
   */
  async verifyWebhook(
    gatewayName: PaymentGateway,
    payload: unknown,
    signature: string,
  ): Promise<WebhookEvent> {
    const gateway = this.gateways[gatewayName]

    if (!gateway) {
      throw new Error(`Gateway '${gatewayName}' is not configured`)
    }

    return gateway.verifyWebhook(payload, signature)
  }

  /**
   * Get payment status from the appropriate gateway
   */
  async getPaymentStatus(
    transactionId: string,
    gatewayName: PaymentGateway,
  ): Promise<PaymentStatus> {
    const gateway = this.gateways[gatewayName]

    if (!gateway) {
      throw new Error(`Gateway '${gatewayName}' is not configured`)
    }

    return gateway.getPaymentStatus(transactionId)
  }

  /**
   * Process a refund through the appropriate gateway
   */
  async refund(
    transactionId: string,
    gatewayName: PaymentGateway,
    amount?: number,
  ): Promise<RefundResult> {
    const gateway = this.gateways[gatewayName]

    if (!gateway) {
      throw new Error(`Gateway '${gatewayName}' is not configured`)
    }

    return gateway.refund(transactionId, amount)
  }

  /**
   * Get all supported payment methods across all gateways
   */
  getSupportedMethods(): PaymentMethod[] {
    const methods = new Set<PaymentMethod>()

    for (const gateway of Object.values(this.gateways)) {
      for (const method of gateway.supportedMethods) {
        if (isPaymentMethodEnabled(method)) {
          methods.add(method)
        }
      }
    }

    return Array.from(methods)
  }

  /**
   * Check if a payment method is available
   */
  isMethodAvailable(method: PaymentMethod): boolean {
    if (!isPaymentMethodEnabled(method)) {
      return false
    }

    const gatewayName = this.resolveGatewayName(method)
    const gateway = this.gateways[gatewayName]

    return gateway?.supportedMethods.includes(method) ?? false
  }
}

/** Singleton router instance */
let _router: PaymentRouter | null = null

/**
 * Get or create the singleton payment router with configured gateways
 */
export function getPaymentRouter(): PaymentRouter {
  if (!_router) {
    _router = createPaymentRouter()
  }
  return _router
}

/**
 * Create a new payment router with configured gateways (non-singleton)
 */
export function createPaymentRouter(): PaymentRouter {
  const gateways: Partial<Record<PaymentGateway, PaymentGatewayAdapter>> = {}

  if (process.env.STRIPE_SECRET_KEY) {
    const { StripeGateway } = require('../gateways/stripe')
    gateways.stripe = new StripeGateway()
  }

  if (process.env.PAYMENTASIA_API_KEY) {
    const { PaymentAsiaGateway } = require('../gateways/paymentasia')
    gateways.paymentasia = new PaymentAsiaGateway()
  }

  return new PaymentRouter({
    gateways: gateways as Record<PaymentGateway, PaymentGatewayAdapter>,
  })
}

/**
 * Reset the singleton (for testing)
 */
export function resetPaymentRouter(): void {
  _router = null
}

/**
 * Factory for creating routers with specific configurations
 */
export class PaymentRouterFactory {
  private gatewayConstructors: Map<PaymentGateway, new () => PaymentGatewayAdapter> = new Map()

  register(gateway: PaymentGateway, constructor: new () => PaymentGatewayAdapter): void {
    this.gatewayConstructors.set(gateway, constructor)
  }

  createRouter(gatewayNames: PaymentGateway[]): PaymentRouter {
    const gateways: Partial<Record<PaymentGateway, PaymentGatewayAdapter>> = {}

    for (const name of gatewayNames) {
      const Constructor = this.gatewayConstructors.get(name)
      if (Constructor) {
        gateways[name] = new Constructor()
      }
    }

    return new PaymentRouter({
      gateways: gateways as Record<PaymentGateway, PaymentGatewayAdapter>,
    })
  }
}
