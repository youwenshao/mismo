// Core types
export type {
  PaymentMethod,
  PaymentGateway,
  PaymentStatus,
  PaymentRequest,
  PaymentResponse,
  WebhookEvent,
  WebhookEventType,
  RefundResult,
  PaymentGatewayAdapter,
} from './types'

// Type utilities
export {
  GATEWAY_ROUTES,
  GATEWAY_FEES,
  calculateFee,
  getGatewayForMethod,
  isPaymentMethodEnabled,
} from './types'

// Router
export {
  PaymentRouter,
  PaymentRouterFactory,
  createPaymentRouter,
  getPaymentRouter,
  resetPaymentRouter,
} from './core/router'

// Gateways
export { StripeGateway } from './gateways/stripe'
export { PaymentAsiaGateway, generateFPSQRData } from './gateways/paymentasia'

// Version
export const VERSION = '0.1.0'
