# HK Payment Methods Implementation Plan

## Executive Summary

**Recommended Provider:** PaymentAsia  
**Architecture:** Hybrid (Stripe for international cards + PaymentAsia for HK local methods)  
**Timeline:** 2-3 weeks  
**Complexity:** Medium

---

## 1. Architecture Recommendation: HYBRID GATEWAY

### Rationale

| Criteria             | Single Gateway (PaymentAsia)   | Hybrid (Stripe + PaymentAsia)     |
| -------------------- | ------------------------------ | --------------------------------- |
| **Fees**             | 1.6% all methods               | 1.6% HK methods, ~3.4% intl cards |
| **Setup Complexity** | Medium (migrate all)           | Low (add parallel)                |
| **Risk**             | High (single point of failure) | Low (fallback available)          |
| **Implementation**   | 4-6 weeks                      | 2-3 weeks                         |
| **User Experience**  | Consistent                     | Split by method                   |

### **Recommendation: HYBRID**

**Why Hybrid Wins:**

1. **Lower Risk** - Existing Stripe keeps working during transition
2. **Faster Time-to-Market** - Add HK methods without refactoring existing flow
3. **Fee Optimization** - Only use PaymentAsia where it saves money (HK methods)
4. **Future Flexibility** - Can migrate cards later if needed

### Payment Method Routing

```
┌─────────────────────────────────────────────────────────────┐
│                    Payment Method Selection                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Credit Card  │───▶│   Stripe     │    │  3.4% + HK$  │  │
│  │ (Visa/MC/Amex)│   │  (existing)  │    │    fee       │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │    FPS       │───▶│              │    │              │  │
│  │ AliPayHK     │───▶│ PaymentAsia  │───▶│    1.6%      │  │
│  │ WeChat Pay   │───▶│   (new)      │    │  no setup    │  │
│  │   PayMe      │───▶│              │    │    fee       │  │
│  │  Octopus     │───▶│              │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Integration Approach

### 2.1 New Package: `@mismo/payment`

Create a unified payment abstraction layer:

```
packages/
  payment/
    src/
      index.ts              # Main exports
      types.ts              # Shared types
      gateways/
        stripe.ts           # Stripe gateway adapter
        paymentasia.ts      # PaymentAsia gateway adapter
      core/
        router.ts           # Payment method router
        factory.ts          # Gateway factory
      webhooks/
        handler.ts          # Unified webhook handler
    package.json
```

### 2.2 Gateway Interface

```typescript
// packages/payment/src/types.ts

export type PaymentMethod = 'card' | 'fps' | 'alipayhk' | 'wechatpay' | 'payme' | 'octopus'

export type PaymentGateway = 'stripe' | 'paymentasia'

export interface PaymentRequest {
  amount: number // in cents/smallest currency unit
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
  checkoutUrl?: string // for redirect-based methods
  qrCodeUrl?: string // for FPS/QR methods
  status: 'pending' | 'completed' | 'failed'
}

export interface PaymentGatewayAdapter {
  readonly name: PaymentGateway
  readonly supportedMethods: PaymentMethod[]

  createPayment(request: PaymentRequest): Promise<PaymentResponse>
  verifyWebhook(payload: unknown, signature: string): Promise<WebhookEvent>
  getPaymentStatus(transactionId: string): Promise<PaymentStatus>
  refund(transactionId: string, amount?: number): Promise<RefundResult>
}
```

### 2.3 Payment Router

```typescript
// packages/payment/src/core/router.ts

const GATEWAY_ROUTES: Record<PaymentMethod, PaymentGateway> = {
  card: 'stripe',
  fps: 'paymentasia',
  alipayhk: 'paymentasia',
  wechatpay: 'paymentasia', // Move from Stripe
  payme: 'paymentasia',
  octopus: 'paymentasia',
}

export class PaymentRouter {
  constructor(private gateways: Record<PaymentGateway, PaymentGatewayAdapter>) {}

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const gatewayName = GATEWAY_ROUTES[request.method]
    const gateway = this.gateways[gatewayName]

    if (!gateway) {
      throw new Error(`No gateway configured for method: ${request.method}`)
    }

    if (!gateway.supportedMethods.includes(request.method)) {
      throw new Error(`Gateway ${gateway.name} doesn't support ${request.method}`)
    }

    return gateway.createPayment(request)
  }

  getGatewayForMethod(method: PaymentMethod): PaymentGatewayAdapter {
    const gatewayName = GATEWAY_ROUTES[method]
    return this.gateways[gatewayName]
  }
}
```

### 2.4 PaymentAsia Gateway Adapter

```typescript
// packages/payment/src/gateways/paymentasia.ts

import { PaymentGatewayAdapter, PaymentRequest, PaymentResponse } from '../types'

export class PaymentAsiaGateway implements PaymentGatewayAdapter {
  readonly name = 'paymentasia'
  readonly supportedMethods = ['fps', 'alipayhk', 'wechatpay', 'payme', 'octopus']

  private apiBase: string
  private merchantId: string
  private apiKey: string

  constructor() {
    this.apiBase = process.env.PAYMENTASIA_API_URL || 'https://api.paymentasia.com/v1'
    this.merchantId = process.env.PAYMENTASIA_MERCHANT_ID!
    this.apiKey = process.env.PAYMENTASIA_API_KEY!
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // PaymentAsia API call
    const response = await fetch(`${this.apiBase}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: request.amount,
        currency: request.currency.toUpperCase(),
        payment_method: this.mapMethod(request.method),
        description: request.description,
        order_id: request.metadata.orderId,
        return_url: request.successUrl,
        notify_url: `${process.env.API_BASE_URL}/api/billing/webhooks/paymentasia`,
      }),
    })

    const data = await response.json()

    return {
      gateway: 'paymentasia',
      transactionId: data.transaction_id,
      checkoutUrl: data.payment_url, // For wallet redirects
      qrCodeUrl: data.qr_code_url, // For FPS QR code
      status: data.status === 'pending' ? 'pending' : 'completed',
    }
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<WebhookEvent> {
    // Verify HMAC signature
    const computedSig = this.computeSignature(payload)
    if (computedSig !== signature) {
      throw new Error('Invalid webhook signature')
    }

    return this.parseWebhookEvent(payload)
  }

  private mapMethod(method: PaymentMethod): string {
    const methodMap: Record<string, string> = {
      fps: 'FPS',
      alipayhk: 'ALIPAYHK',
      wechatpay: 'WECHATHK',
      payme: 'PAYME',
      octopus: 'OCTOPUS',
    }
    return methodMap[method]
  }
}
```

### 2.5 Stripe Gateway Adapter (Refactored)

```typescript
// packages/payment/src/gateways/stripe.ts

import Stripe from 'stripe'
import { PaymentGatewayAdapter, PaymentRequest, PaymentResponse } from '../types'

export class StripeGateway implements PaymentGatewayAdapter {
  readonly name = 'stripe'
  readonly supportedMethods = ['card']

  private stripe: Stripe

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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
            product_data: { name: request.description },
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

    return {
      gateway: 'stripe',
      transactionId: session.id,
      checkoutUrl: session.url!,
      status: 'pending',
    }
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<WebhookEvent> {
    const event = this.stripe.webhooks.constructEvent(
      payload as string,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )

    return {
      type: event.type,
      transactionId: this.extractTransactionId(event),
      status: this.mapStatus(event),
      metadata: event.data.object.metadata,
    }
  }
}
```

---

## 3. Webhook Handling Strategy

### 3.1 Unified Webhook Endpoint

```typescript
// apps/web/src/app/api/billing/webhooks/route.ts

import { PaymentRouter } from '@mismo/payment'
import { prisma } from '@mismo/db'

const router = new PaymentRouter({
  stripe: new StripeGateway(),
  paymentasia: new PaymentAsiaGateway(),
})

// Route: /api/billing/webhooks/stripe
export async function POST_stripe(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  const event = await router.gateways.stripe.verifyWebhook(body, signature)
  await handlePaymentEvent(event)

  return NextResponse.json({ received: true })
}

// Route: /api/billing/webhooks/paymentasia
export async function POST_paymentasia(request: NextRequest) {
  const body = await request.json()
  const signature = request.headers.get('x-paymentasia-signature')!

  const event = await router.gateways.paymentasia.verifyWebhook(body, signature)
  await handlePaymentEvent(event)

  return NextResponse.json({ received: true })
}

// Unified event handler
async function handlePaymentEvent(event: WebhookEvent) {
  switch (event.type) {
    case 'payment.completed': {
      await prisma.payment.update({
        where: { transactionId: event.transactionId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })

      // Trigger hosting transfer if applicable
      const payment = await prisma.payment.findUnique({
        where: { transactionId: event.transactionId },
        include: { commission: true },
      })

      if (payment?.metadata?.transferId) {
        const orchestrator = new HostingTransferOrchestrator()
        await orchestrator.onPaymentConfirmed(event.transactionId)
      }
      break
    }

    case 'payment.failed': {
      await prisma.payment.update({
        where: { transactionId: event.transactionId },
        data: { status: 'FAILED', failedAt: new Date() },
      })
      break
    }
  }
}
```

### 3.2 Webhook Event Types

```typescript
// packages/payment/src/types.ts

export type WebhookEventType =
  | 'payment.created'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.disputed'

export interface WebhookEvent {
  type: WebhookEventType
  gateway: PaymentGateway
  transactionId: string
  status: PaymentStatus
  amount?: number
  currency?: string
  metadata?: Record<string, string>
  gatewayData?: unknown // Raw gateway response for audit
}
```

---

## 4. Database Schema Changes

### 4.1 Migration SQL

```sql
-- Create new Payment table (unified across gateways)
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,  -- 'stripe', 'paymentasia'
    "method" TEXT NOT NULL,   -- 'card', 'fps', 'alipayhk', etc.
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'HKD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING, COMPLETED, FAILED, REFUNDED
    "description" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "commissionId" TEXT,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on transactionId + gateway (different gateways may have same ID format)
CREATE UNIQUE INDEX "Payment_transactionId_gateway_key" ON "Payment"("transactionId", "gateway");

-- Index for quick lookups
CREATE INDEX "Payment_commissionId_idx" ON "Payment"("commissionId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- Add foreign key
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_commissionId_fkey"
    FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate existing data from HostingTransfer
INSERT INTO "Payment" ("id", "transactionId", "gateway", "method", "amount", "currency", "status", "commissionId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    ht."stripePaymentIntentId",
    'stripe',
    'card',
    c."amount" * 100,  -- Convert to cents if stored as dollars
    'HKD',
    CASE
        WHEN ht.status = 'PENDING_PAYMENT' THEN 'PENDING'
        WHEN ht.status IN ('PAYMENT_CONFIRMED', 'DEPLOYING', 'DEPLOYED', 'TRANSFERRING', 'COMPLETED', 'MONITORING') THEN 'COMPLETED'
        WHEN ht.status = 'FAILED' THEN 'FAILED'
        ELSE 'PENDING'
    END,
    ht."commissionId",
    ht."createdAt",
    NOW()
FROM "HostingTransfer" ht
JOIN "Commission" c ON c.id = ht."commissionId"
WHERE ht."stripePaymentIntentId" IS NOT NULL;

-- Add reference to Payment in HostingTransfer (optional, for audit)
ALTER TABLE "HostingTransfer" ADD COLUMN "paymentId" TEXT;
ALTER TABLE "HostingTransfer" ADD CONSTRAINT "HostingTransfer_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Deprecate stripe-specific columns (keep for backward compatibility, mark for removal in v2)
-- ALTER TABLE "Commission" DROP COLUMN "stripeCustomerId";  -- DO NOT DO THIS YET
```

### 4.2 Prisma Schema Updates

```prisma
// packages/db/prisma/schema.prisma

model Payment {
  id            String        @id @default(cuid())
  transactionId String
  gateway       PaymentGateway // STRIPE, PAYMENTASIA
  method        PaymentMethod  // CARD, FPS, ALIPAYHK, WECHATPAY, PAYME, OCTOPUS
  amount        Int            // in smallest currency unit (cents)
  currency      String         @default("HKD")
  status        PaymentStatus  @default(PENDING)
  description   String?
  metadata      Json           @default("{}")

  commissionId  String?
  commission    Commission?    @relation(fields: [commissionId], references: [id])

  completedAt   DateTime?
  failedAt      DateTime?
  refundedAt    DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@unique([transactionId, gateway])
  @@index([commissionId])
  @@index([status])
}

enum PaymentGateway {
  STRIPE
  PAYMENTASIA
}

enum PaymentMethod {
  CARD
  FPS
  ALIPAYHK
  WECHATPAY
  PAYME
  OCTOPUS
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

// Update existing models
model Commission {
  // ... existing fields ...

  // Keep for backward compatibility during transition
  stripeCustomerId String?

  // New relation
  payments Payment[]
}

model HostingTransfer {
  // ... existing fields ...

  // Deprecate in favor of Payment relation
  stripePaymentIntentId String? @unique

  // New reference
  paymentId String?
  payment   Payment? @relation(fields: [paymentId], references: [id])
}
```

---

## 5. API Routes Updates

### 5.1 New Checkout Route

```typescript
// apps/web/src/app/api/billing/checkout/route.ts

import { PaymentRouter, PaymentMethod } from '@mismo/payment'
import { prisma } from '@mismo/db'

const TIER_PRICES: Record<string, { amount: number; label: string }> = {
  VIBE: { amount: 2000_00, label: 'Mismo Vibe Tier' }, // HKD 20,000
  VERIFIED: { amount: 8000_00, label: 'Mismo Verified Tier' }, // HKD 80,000
  FOUNDRY: { amount: 25000_00, label: 'Mismo Foundry Tier' }, // HKD 250,000
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tier, commissionId, method } = body as {
      tier: string
      commissionId: string
      method: PaymentMethod
    }

    // Validation
    if (!tier || !commissionId || !method) {
      return NextResponse.json(
        { error: 'Missing required fields: tier, commissionId, method' },
        { status: 400 },
      )
    }

    const tierConfig = TIER_PRICES[tier.toUpperCase()]
    if (!tierConfig) {
      return NextResponse.json({ error: `Invalid tier: ${tier}` }, { status: 400 })
    }

    const router = createPaymentRouter()

    // Create payment record first
    const paymentRecord = await prisma.payment.create({
      data: {
        gateway: getGatewayForMethod(method),
        method: method.toUpperCase() as any,
        amount: tierConfig.amount,
        currency: 'HKD',
        status: 'PENDING',
        description: tierConfig.label,
        metadata: { tier, commissionId },
        commissionId,
      },
    })

    // Process payment through appropriate gateway
    const paymentResult = await router.processPayment({
      amount: tierConfig.amount,
      currency: 'hkd',
      method,
      description: tierConfig.label,
      metadata: {
        paymentId: paymentRecord.id,
        commissionId,
        tier: tier.toUpperCase(),
      },
      successUrl: `${request.nextUrl.origin}/billing/success?payment_id=${paymentRecord.id}`,
      cancelUrl: `${request.nextUrl.origin}/billing/cancel?payment_id=${paymentRecord.id}`,
    })

    // Update payment record with transaction ID
    await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: { transactionId: paymentResult.transactionId },
    })

    return NextResponse.json({
      paymentId: paymentRecord.id,
      checkoutUrl: paymentResult.checkoutUrl,
      qrCodeUrl: paymentResult.qrCodeUrl, // For FPS
      status: paymentResult.status,
    })
  } catch (error) {
    console.error('Checkout failed:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}

function createPaymentRouter(): PaymentRouter {
  return new PaymentRouter({
    stripe: new StripeGateway(),
    paymentasia: new PaymentAsiaGateway(),
  })
}

function getGatewayForMethod(method: PaymentMethod): 'STRIPE' | 'PAYMENTASIA' {
  const routes: Record<PaymentMethod, 'STRIPE' | 'PAYMENTASIA'> = {
    card: 'STRIPE',
    fps: 'PAYMENTASIA',
    alipayhk: 'PAYMENTASIA',
    wechatpay: 'PAYMENTASIA',
    payme: 'PAYMENTASIA',
    octopus: 'PAYMENTASIA',
  }
  return routes[method]
}
```

### 5.2 Payment Status Check Route

```typescript
// apps/web/src/app/api/billing/status/[paymentId]/route.ts

export async function GET(request: NextRequest, { params }: { params: { paymentId: string } }) {
  const payment = await prisma.payment.findUnique({
    where: { id: params.paymentId },
  })

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }

  // For pending payments, sync with gateway
  if (payment.status === 'PENDING') {
    const router = createPaymentRouter()
    const gateway = router.getGatewayForMethod(payment.method.toLowerCase() as PaymentMethod)
    const gatewayStatus = await gateway.getPaymentStatus(payment.transactionId)

    if (gatewayStatus !== payment.status) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: gatewayStatus },
      })
      payment.status = gatewayStatus
    }
  }

  return NextResponse.json({
    id: payment.id,
    status: payment.status,
    method: payment.method,
    amount: payment.amount,
    currency: payment.currency,
    createdAt: payment.createdAt,
    completedAt: payment.completedAt,
  })
}
```

---

## 6. Frontend Updates

### 6.1 Payment Method Selector Component

```typescript
// apps/web/src/components/PaymentMethodSelector.tsx

const PAYMENT_METHODS = [
  {
    id: 'card',
    name: 'Credit Card',
    description: 'Visa, Mastercard, American Express',
    icon: 'CreditCardIcon',
    gateway: 'stripe',
    fee: '3.4% + HK$2.35',
    popular: true,
  },
  {
    id: 'fps',
    name: 'FPS',
    description: 'Faster Payment System',
    icon: 'BankIcon',
    gateway: 'paymentasia',
    fee: '1.6%',
    recommended: true,
  },
  {
    id: 'alipayhk',
    name: 'AliPayHK',
    description: 'AliPay Hong Kong',
    icon: 'AliPayIcon',
    gateway: 'paymentasia',
    fee: '1.6%',
  },
  {
    id: 'wechatpay',
    name: 'WeChat Pay HK',
    description: 'WeChat Pay Hong Kong',
    icon: 'WeChatIcon',
    gateway: 'paymentasia',
    fee: '1.6%',
  },
  {
    id: 'payme',
    name: 'PayMe',
    description: 'HSBC PayMe',
    icon: 'PayMeIcon',
    gateway: 'paymentasia',
    fee: '1.6%',
  },
  {
    id: 'octopus',
    name: 'Octopus',
    description: 'Octopus Card / App',
    icon: 'OctopusIcon',
    gateway: 'paymentasia',
    fee: '1.6%',
  },
];

export function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  amount,
}: {
  selectedMethod: string;
  onSelect: (method: string) => void;
  amount: number;
}) {
  return (
    <div className="space-y-4">
      {PAYMENT_METHODS.map((method) => (
        <button
          key={method.id}
          onClick={() => onSelect(method.id)}
          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
            selectedMethod === method.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name={method.icon} className="w-8 h-8" />
              <div>
                <div className="font-semibold flex items-center gap-2">
                  {method.name}
                  {method.recommended && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Save {calculateSavings(amount)}%
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">{method.description}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{method.fee}</div>
              <div className="text-xs text-gray-400">
                ~HK${calculateFee(amount, method.fee)}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function calculateSavings(amount: number): string {
  // Savings vs Stripe card rate
  const stripeFee = amount * 0.034 + 2.35;
  const paymentAsiaFee = amount * 0.016;
  const savings = ((stripeFee - paymentAsiaFee) / stripeFee * 100).toFixed(0);
  return savings;
}
```

### 6.2 FPS QR Code Display

```typescript
// apps/web/src/components/FPSPayment.tsx

export function FPSPayment({
  qrCodeUrl,
  transactionId,
  amount,
}: {
  qrCodeUrl: string;
  transactionId: string;
  amount: number;
}) {
  const [status, setStatus] = useState<'pending' | 'completed' | 'failed'>('pending');

  useEffect(() => {
    // Poll for payment status
    const interval = setInterval(async () => {
      const response = await fetch(`/api/billing/status/${transactionId}`);
      const data = await response.json();

      if (data.status === 'COMPLETED') {
        setStatus('completed');
        clearInterval(interval);
        window.location.href = '/billing/success';
      } else if (data.status === 'FAILED') {
        setStatus('failed');
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [transactionId]);

  return (
    <div className="text-center space-y-6">
      <h2 className="text-xl font-semibold">Scan to Pay with FPS</h2>

      <div className="bg-white p-6 rounded-lg inline-block">
        {/* QR Code from PaymentAsia */}
        <img
          src={qrCodeUrl}
          alt="FPS QR Code"
          className="w-64 h-64"
        />
      </div>

      <div className="text-lg">
        Amount: <span className="font-bold">HK${(amount / 100).toFixed(2)}</span>
      </div>

      <div className="text-sm text-gray-500">
        Open your banking app and scan the QR code
      </div>

      {status === 'pending' && (
        <div className="flex items-center justify-center gap-2 text-blue-600">
          <Spinner size="sm" />
          <span>Waiting for payment...</span>
        </div>
      )}
    </div>
  );
}
```

---

## 7. Implementation Complexity Estimate

### Phase 1: Foundation (Week 1)

| Task                                  | Hours | Complexity |
| ------------------------------------- | ----- | ---------- |
| Create `@mismo/payment` package       | 8     | Medium     |
| Implement Stripe gateway adapter      | 4     | Low        |
| Implement PaymentAsia gateway adapter | 12    | Medium     |
| Create payment router                 | 6     | Medium     |
| Unit tests for gateways               | 8     | Medium     |

**Subtotal: 38 hours**

### Phase 2: Backend Integration (Week 1-2)

| Task                            | Hours | Complexity |
| ------------------------------- | ----- | ---------- |
| Database migrations             | 4     | Low        |
| Update checkout API route       | 6     | Medium     |
| Implement webhook handlers      | 8     | Medium     |
| Update orchestrator integration | 6     | Medium     |
| Error handling & retries        | 6     | Medium     |
| Integration tests               | 8     | High       |

**Subtotal: 38 hours**

### Phase 3: Frontend (Week 2)

| Task                       | Hours | Complexity |
| -------------------------- | ----- | ---------- |
| Payment method selector UI | 6     | Low        |
| FPS QR code display        | 4     | Medium     |
| Payment status polling     | 4     | Medium     |
| Error states & retry UI    | 4     | Medium     |
| E2E tests                  | 8     | High       |

**Subtotal: 26 hours**

### Phase 4: Testing & Deployment (Week 3)

| Task                            | Hours | Complexity |
| ------------------------------- | ----- | ---------- |
| Sandbox testing (both gateways) | 8     | High       |
| Production deployment           | 4     | Medium     |
| Monitoring setup                | 4     | Low        |
| Documentation updates           | 4     | Low        |

**Subtotal: 20 hours**

### Summary

- **Total Effort: ~122 hours (~3 weeks with 1 engineer)**
- **Risk Level: Medium**
- **Rollback Strategy: Feature flags for each payment method**

---

## 8. Environment Configuration

```bash
# .env.example additions

# PaymentAsia Configuration
PAYMENTASIA_API_URL=https://api.paymentasia.com/v1
PAYMENTASIA_MERCHANT_ID=your_merchant_id
PAYMENTASIA_API_KEY=your_api_key
PAYMENTASIA_WEBHOOK_SECRET=your_webhook_secret

# Payment Method Feature Flags
ENABLE_FPS=true
ENABLE_ALIPAYHK=true
ENABLE_PAYME=true
ENABLE_OCTOPUS=true
ENABLE_STRIPE_CARD=true

# Existing Stripe config (keep)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_...
```

---

## 9. Testing Strategy

### 9.1 Sandbox Credentials

- **PaymentAsia**: Request test merchant account
- **Stripe**: Use test mode (already configured)

### 9.2 Test Cases

```typescript
// packages/payment/src/__tests__/router.test.ts

describe('PaymentRouter', () => {
  it('routes card payments to Stripe', async () => {
    const router = createRouter()
    const result = await router.processPayment({
      method: 'card',
      // ...
    })
    expect(result.gateway).toBe('stripe')
  })

  it('routes FPS payments to PaymentAsia', async () => {
    const router = createRouter()
    const result = await router.processPayment({
      method: 'fps',
      // ...
    })
    expect(result.gateway).toBe('paymentasia')
  })

  it('handles PaymentAsia webhook for FPS completion', async () => {
    const payload = createMockFPSWebhook({ status: 'completed' })
    await handleWebhook(payload)

    const payment = await prisma.payment.findFirst({
      where: { transactionId: payload.transaction_id },
    })
    expect(payment?.status).toBe('COMPLETED')
  })
})
```

### 9.3 E2E Test Flows

1. **Card Payment**: Checkout → Stripe → Webhook → Complete
2. **FPS Payment**: Checkout → PaymentAsia QR → Mock scan → Webhook → Complete
3. **Failed Payment**: Checkout → Gateway error → Retry → Complete
4. **Refund**: Payment completed → Refund request → Gateway refund → Status updated

---

## 10. Monitoring & Alerts

```typescript
// packages/payment/src/monitoring.ts

export function trackPaymentEvent(event: {
  gateway: PaymentGateway
  method: PaymentMethod
  status: 'started' | 'completed' | 'failed'
  duration?: number
  error?: string
}) {
  // Send to monitoring system
  console.log('[Payment]', event)

  // Alert on high failure rates
  if (event.status === 'failed') {
    alertIfHighFailureRate(event.gateway, event.method)
  }
}

function alertIfHighFailureRate(gateway: PaymentGateway, method: PaymentMethod) {
  // Check failure rate in last 15 minutes
  // Alert if > 10% failure rate
}
```

### Key Metrics to Track

- Payment success rate by method
- Average payment completion time
- Gateway error rates
- Revenue by payment method
- Fee savings vs pure Stripe

---

## 11. Recommended Provider: PaymentAsia

### Why PaymentAsia

| Factor                 | PaymentAsia | KPay          | Airwallex       |
| ---------------------- | ----------- | ------------- | --------------- |
| **FPS Fee**            | 1.6%        | Not specified | Custom quote    |
| **AliPayHK Fee**       | 1.6%        | ~1.9%         | Custom quote    |
| **Setup Fee**          | None        | None          | Unknown         |
| **Integration**        | REST API    | REST API      | REST API        |
| **HK Focus**           | ✅ Yes      | ✅ Yes        | ❌ Global       |
| **Speed to integrate** | Fast        | Fast          | Slower (custom) |

### Cost Savings Example

For a HK$80,000 project (Verified Tier):

| Method      | Gateway     | Fee                       | You Receive |
| ----------- | ----------- | ------------------------- | ----------- |
| Credit Card | Stripe      | 3.4% + HK$2.35 = HK$2,722 | HK$77,278   |
| FPS         | PaymentAsia | 1.6% = HK$1,280           | HK$78,720   |
| **Savings** |             | **HK$1,442**              | **+1.9%**   |

### Action Items to Start

1. **Apply for PaymentAsia merchant account** (1-2 days)
   - Website: https://www.paymentasia.com/
   - Required: Business registration, bank account

2. **Create `@mismo/payment` package** (Day 1-2)

3. **Implement PaymentAsia adapter** (Day 3-5)

4. **Integration testing** (Week 2)

5. **Soft launch with internal projects** (Week 3)

---

## Appendix: API Reference Comparison

### Stripe vs PaymentAsia

| Feature            | Stripe                       | PaymentAsia         |
| ------------------ | ---------------------------- | ------------------- |
| **Create Payment** | `POST /v1/checkout/sessions` | `POST /v1/payments` |
| **Webhook Format** | JSON with signature          | JSON with HMAC      |
| **Idempotency**    | `Idempotency-Key` header     | `order_id` field    |
| **QR Code**        | Not supported                | Native FPS QR       |
| **Redirect Flow**  | `success_url`/`cancel_url`   | `return_url`        |

### Sample PaymentAsia Request

```bash
curl -X POST https://api.paymentasia.com/v1/payments \
  -H "Authorization: Bearer {api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_id": "MERCHANT123",
    "amount": 800000,
    "currency": "HKD",
    "payment_method": "FPS",
    "description": "Mismo Verified Tier",
    "order_id": "order_abc123",
    "return_url": "https://mismo.io/billing/success",
    "notify_url": "https://mismo.io/api/billing/webhooks/paymentasia"
  }'
```

### Sample PaymentAsia Response

```json
{
  "transaction_id": "TXN123456",
  "status": "pending",
  "payment_url": null,
  "qr_code_url": "https://api.paymentasia.com/qr/TXN123456",
  "expires_at": "2026-03-03T22:00:00Z"
}
```
