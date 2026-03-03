import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PaymentRouter, PaymentRouterFactory } from '../core/router'
import type {
  PaymentGatewayAdapter,
  PaymentRequest,
  PaymentResponse,
  PaymentMethod,
} from '../types'

class MockStripeGateway implements PaymentGatewayAdapter {
  readonly name = 'stripe' as const
  readonly supportedMethods: PaymentMethod[] = ['card']

  createPayment = vi.fn()
  verifyWebhook = vi.fn()
  getPaymentStatus = vi.fn()
  refund = vi.fn()
}

class MockPaymentAsiaGateway implements PaymentGatewayAdapter {
  readonly name = 'paymentasia' as const
  readonly supportedMethods: PaymentMethod[] = ['fps', 'alipayhk', 'wechatpay', 'payme', 'octopus']

  createPayment = vi.fn()
  verifyWebhook = vi.fn()
  getPaymentStatus = vi.fn()
  refund = vi.fn()
}

describe('PaymentRouter', () => {
  let router: PaymentRouter
  let stripeGateway: MockStripeGateway
  let paymentAsiaGateway: MockPaymentAsiaGateway

  beforeEach(() => {
    stripeGateway = new MockStripeGateway()
    paymentAsiaGateway = new MockPaymentAsiaGateway()

    router = new PaymentRouter({
      gateways: {
        stripe: stripeGateway,
        paymentasia: paymentAsiaGateway,
      },
    })
  })

  describe('processPayment', () => {
    it('routes card payments to Stripe', async () => {
      const mockResponse: PaymentResponse = {
        gateway: 'stripe',
        transactionId: 'txn_123',
        checkoutUrl: 'https://stripe.com/checkout',
        status: 'pending',
      }

      stripeGateway.createPayment.mockResolvedValue(mockResponse)

      const request: PaymentRequest = {
        amount: 1560000,
        currency: 'hkd',
        method: 'card',
        description: 'Test payment',
        metadata: { orderId: '123' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }

      const result = await router.processPayment(request)

      expect(stripeGateway.createPayment).toHaveBeenCalledWith(request)
      expect(result).toEqual(mockResponse)
    })

    it('routes FPS payments to PaymentAsia', async () => {
      const mockResponse: PaymentResponse = {
        gateway: 'paymentasia',
        transactionId: 'txn_456',
        qrCodeUrl: 'https://paymentasia.com/qr',
        status: 'pending',
      }

      paymentAsiaGateway.createPayment.mockResolvedValue(mockResponse)

      const request: PaymentRequest = {
        amount: 1560000,
        currency: 'hkd',
        method: 'fps',
        description: 'Test payment',
        metadata: { orderId: '123' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }

      const result = await router.processPayment(request)

      expect(paymentAsiaGateway.createPayment).toHaveBeenCalledWith(request)
      expect(result).toEqual(mockResponse)
    })

    it('throws error when gateway is not configured', async () => {
      const request: PaymentRequest = {
        amount: 1560000,
        currency: 'hkd',
        method: 'card',
        description: 'Test payment',
        metadata: {},
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }

      const limitedRouter = new PaymentRouter({
        gateways: { paymentasia: paymentAsiaGateway } as any,
      })

      await expect(limitedRouter.processPayment(request)).rejects.toThrow(
        "Gateway 'stripe' is not configured",
      )
    })
  })

  describe('resolveGateway', () => {
    it('returns the correct adapter for a method', () => {
      const adapter = router.resolveGateway('card')
      expect(adapter.name).toBe('stripe')
    })

    it('returns PaymentAsia adapter for FPS', () => {
      const adapter = router.resolveGateway('fps')
      expect(adapter.name).toBe('paymentasia')
    })
  })

  describe('resolveGatewayName', () => {
    it('returns gateway name string for a method', () => {
      expect(router.resolveGatewayName('card')).toBe('stripe')
      expect(router.resolveGatewayName('fps')).toBe('paymentasia')
      expect(router.resolveGatewayName('alipayhk')).toBe('paymentasia')
    })
  })

  describe('getSupportedMethods', () => {
    it('returns all methods from configured gateways', () => {
      const methods = router.getSupportedMethods()

      expect(methods).toContain('card')
      // PaymentAsia methods only enabled when env flag is explicitly set
    })
  })

  describe('verifyWebhook', () => {
    it('verifies Stripe webhooks', async () => {
      const mockEvent = {
        type: 'payment.completed' as const,
        gateway: 'stripe' as const,
        transactionId: 'txn_123',
        status: 'completed' as const,
      }

      stripeGateway.verifyWebhook.mockResolvedValue(mockEvent)

      const result = await router.verifyWebhook('stripe', 'payload', 'signature')

      expect(stripeGateway.verifyWebhook).toHaveBeenCalledWith('payload', 'signature')
      expect(result).toEqual(mockEvent)
    })

    it('verifies PaymentAsia webhooks', async () => {
      const mockEvent = {
        type: 'payment.completed' as const,
        gateway: 'paymentasia' as const,
        transactionId: 'txn_456',
        status: 'completed' as const,
      }

      paymentAsiaGateway.verifyWebhook.mockResolvedValue(mockEvent)

      const result = await router.verifyWebhook('paymentasia', { id: '123' }, 'signature')

      expect(paymentAsiaGateway.verifyWebhook).toHaveBeenCalledWith({ id: '123' }, 'signature')
      expect(result).toEqual(mockEvent)
    })
  })
})

describe('PaymentRouterFactory', () => {
  it('creates router with specific gateways', () => {
    const factory = new PaymentRouterFactory()
    factory.register('stripe', MockStripeGateway as any)
    factory.register('paymentasia', MockPaymentAsiaGateway as any)

    const router = factory.createRouter(['stripe'])
    const methods = router.getSupportedMethods()

    expect(methods).toContain('card')
  })
})
