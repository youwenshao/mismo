# Runbook: Billing & Refunds

This guide covers the operational procedures for managing payments, cancellations, and refunds within the Mismo platform.

---

## 🔍 Billing Architecture Overview

Mismo supports multiple payment gateways:

| Gateway         | Methods                                   | Fee            | Use Case                |
| --------------- | ----------------------------------------- | -------------- | ----------------------- |
| **Stripe**      | Credit Cards (Visa, MC, Amex)             | 3.4% + HK$2.35 | International customers |
| **PaymentAsia** | FPS, AliPayHK, WeChat Pay, PayMe, Octopus | 1.6%           | HK local customers      |

Payment records are stored in the unified `Payment` table, linked to `Commission` via `commissionId`.

### Database Schema

```
Commission
  └── payments[] Payment
       ├── gateway: STRIPE | PAYMENTASIA
       ├── method: CARD | FPS | ALIPAYHK | WECHATPAY | PAYME | OCTOPUS
       └── status: PENDING | COMPLETED | FAILED | REFUNDED
```

---

## 🔍 Billing Cycle Overview

1.  **DRAFT**: No payment.
2.  **DISCOVERY**: PRD discovery phase.
3.  **CONTRACTED**: Payment created (status: PENDING).
4.  **PAYMENT_CONFIRMED**: Payment completed via webhook.
5.  **DEVELOPMENT**: Build starts.
6.  **DELIVERED**: Commission completed.

---

## ⚙️ Step 1: Handling Cancellations

A client can cancel a build through the Mismo dashboard or via manual request.

**Manual Cancellation via Supabase/Prisma:**

```typescript
await prisma.commission.update({
  where: { id: 'commission_id' },
  data: { status: 'CANCELLED' },
})
```

**Build Halt Protocol:**

1.  The `Commission` status change to `CANCELLED` fires a webhook.
2.  n8n workflows receive the webhook and stop active `Build` records associated with the commission.
3.  Any running Docker containers on worker nodes are identified via `studioAssignment` and stopped.

---

## ⚙️ Step 2: Processing Refunds

### 2.1 Identify Payment Gateway

First, determine which gateway processed the payment:

```typescript
const payment = await prisma.payment.findFirst({
  where: {
    commissionId: 'commission_id',
    status: 'COMPLETED',
  },
})

// payment.gateway = 'STRIPE' | 'PAYMENTASIA'
// payment.transactionId = gateway-specific transaction ID
```

### 2.2 Stripe Refunds

**Via Stripe Dashboard:**

1.  Locate the `PaymentIntent` in the Stripe Dashboard.
2.  Select `Refund`.
3.  Enter the amount (Total Paid - Incurred Costs).
4.  Mark the refund as `Partial` and provide a reason.

**Via API:**

```typescript
import { StripeGateway } from '@mismo/payment'

const gateway = new StripeGateway()
const result = await gateway.refund(payment.transactionId, refundAmount)
```

### 2.3 PaymentAsia Refunds

**Via PaymentAsia Dashboard:**

1.  Log into PaymentAsia merchant portal.
2.  Navigate to Transactions → Find the transaction.
3.  Click `Refund` and enter amount.
4.  Confirm refund (may require 2FA).

**Via API:**

```typescript
import { PaymentAsiaGateway } from '@mismo/payment'

const gateway = new PaymentAsiaGateway()
const result = await gateway.refund(payment.transactionId, refundAmount)
```

### 2.4 Partial Refunds

Mismo supports partial refunds based on the progress made (e.g., 50% refund if the build is at the `BACKEND` stage).

**Calculate Token Usage:**

```typescript
const tokensUsed = await prisma.tokenUsage.aggregate({
  where: { projectId: 'project_id' },
  _sum: { tokens: true },
})
```

**Calculate Total Cost Incurred:**

- `Tokens Used * Cost Per Token`
- `Base Platform Fee`
- `Studio Resource Fee (Hours Active)`

---

## ⚙️ Step 3: Refund Reconciliation

Once a refund is processed:

1.  Update the `Payment` record:

    ```typescript
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
      },
    })
    ```

2.  Update the `Commission` record:

    ```typescript
    await prisma.commission.update({
      where: { id: commission_id },
      data: { paymentState: 'PARTIAL' },
    })
    ```

3.  Record the refund metadata in the `AuditLog` table:
    ```json
    {
      "action": "REFUND",
      "resource": "Payment",
      "resourceId": "payment_id",
      "metadata": {
        "amount": 250.0,
        "gateway": "STRIPE",
        "gatewayRefundId": "re_...",
        "originalTransactionId": "pi_..."
      }
    }
    ```

---

## ⚙️ Step 4: Handling Failed Payments

### 4.1 Check Payment Status

```typescript
const payment = await prisma.payment.findUnique({
  where: { id: 'payment_id' },
})

if (payment.status === 'FAILED') {
  // Investigate failure reason
  const metadata = payment.metadata as any
  console.log('Failure reason:', metadata?.error)
}
```

### 4.2 Retry Payment

Allow customer to retry with same or different method:

```typescript
// Create new payment with different method
const newPayment = await fetch('/api/billing/checkout', {
  method: 'POST',
  body: JSON.stringify({
    tier: 'VERIFIED',
    commissionId: 'commission_id',
    method: 'fps', // Try different method
  }),
})
```

### 4.3 Common Failure Reasons

| Gateway     | Reason               | Solution                           |
| ----------- | -------------------- | ---------------------------------- |
| Stripe      | `card_declined`      | Ask customer to try different card |
| Stripe      | `insufficient_funds` | Ask customer to check balance      |
| PaymentAsia | `fps_timeout`        | QR code expired, generate new one  |
| PaymentAsia | `user_cancelled`     | Customer cancelled, ask to retry   |

---

## ⚙️ Step 5: Billing Discrepancies

If a client disputes a charge or reports a billing error:

1.  Review `Payment` record for correct amount and gateway.
2.  Cross-check with gateway dashboard (Stripe/PaymentAsia).
3.  Review `TokenUsage` records for the project.
4.  Inspect `BuildLog` to verify progress reported to client.
5.  Cross-reference with the `Notification` table for status updates sent.
6.  Escalate to **ADMIN** for manual review if necessary.

---

## ⚙️ Step 6: Webhook Troubleshooting

### 6.1 Check Webhook Delivery

**Stripe:**

- Dashboard: Developers → Webhooks → [Endpoint]
- Check delivery attempts and response codes

**PaymentAsia:**

- Merchant Portal: API → Webhook Logs
- Check recent deliveries

### 6.2 Replay Webhook

If a webhook was missed:

```typescript
// Manually trigger payment confirmation
import { HostingTransferOrchestrator } from '@mismo/ai'

const orchestrator = new HostingTransferOrchestrator()
await orchestrator.onPaymentConfirmed(transactionId)
```

### 6.3 Verify Webhook Signatures

```typescript
import { PaymentAsiaGateway } from '@mismo/payment'

const gateway = new PaymentAsiaGateway()
try {
  const event = await gateway.verifyWebhook(payload, signature)
  console.log('Valid webhook:', event)
} catch (err) {
  console.error('Invalid webhook signature')
}
```

---

## 📊 Fee Analysis

### Compare Gateway Fees

For a HK$62,400 project (Source -- Verified):

| Method      | Fee      | You Receive | Savings vs Card |
| ----------- | -------- | ----------- | --------------- |
| Credit Card | HK$2,124 | HK$60,276   | --              |
| FPS         | HK$998   | HK$61,402   | HK$1,126 (1.8%) |
| AliPayHK    | HK$998   | HK$61,402   | HK$1,126 (1.8%) |
| PayMe       | HK$998   | HK$61,402   | HK$1,126 (1.8%) |

### Monthly Reconciliation

```sql
-- Revenue by gateway
SELECT
  gateway,
  method,
  COUNT(*) as count,
  SUM(amount) / 100 as total_hkd,
  AVG(amount) / 100 as avg_hkd
FROM "Payment"
WHERE status = 'COMPLETED'
  AND createdAt >= date_trunc('month', now())
GROUP BY gateway, method;

-- Fee estimates
SELECT
  gateway,
  SUM(CASE
    WHEN gateway = 'STRIPE' THEN amount * 0.034 + 235
    WHEN gateway = 'PAYMENTASIA' THEN amount * 0.016
  END) / 100 as estimated_fees_hkd
FROM "Payment"
WHERE status = 'COMPLETED'
  AND createdAt >= date_trunc('month', now())
GROUP BY gateway;
```

---

## ⚙️ Step 7: Admin Bypass & User Grants

### 7.1 Admin Bypass

Admin users (role = `ADMIN`) are automatically bypassed during checkout. When an admin initiates a commission:

- A `Payment` record is created with `amount: 0` and `metadata: { adminBypass: "true" }`
- The `Commission.paymentState` is set to `FINAL` immediately
- No redirect to a payment gateway occurs

**Auditing admin bypasses:**

```sql
SELECT p.id, p."commissionId", p."createdAt"
FROM "Payment" p
WHERE p.metadata->>'adminBypass' = 'true'
ORDER BY p."createdAt" DESC;
```

### 7.2 User Grants (Free Trials)

Admins can issue grants to users from the internal dashboard (Settings > User Grants).

| Grant Type              | Effect                                                   |
| ----------------------- | -------------------------------------------------------- |
| `UNLIMITED_7DAY`        | Free Source/Deploy commissions for 7 days (auto-expires) |
| `FREE_SOURCE`           | 1 free Source-tier commission (single use)               |
| `FREE_SOURCE_OR_DEPLOY` | 1 free Source or Deploy commission (single use)          |

Grants are checked during checkout before payment processing. A payment record is created with `amount: 0` and the grant is marked used.

**Auditing grants:**

```sql
SELECT g.*, u."supabaseAuthId" as recipient
FROM "UserGrant" g
JOIN "User" u ON g."userId" = u.id
ORDER BY g."createdAt" DESC;
```

### 7.3 Admin Whitelist Management

The admin email whitelist is managed in two places:

1. **Environment variable** `ADMIN_EMAIL_HASHES` (comma-separated SHA-256 hashes)
2. **Database** `SystemConfig` table, key `admin.emailHashes` (JSON array)

Both are checked during auth callback. The internal dashboard (Settings > Admin Whitelist) manages the DB-stored list. Emails are hashed client-side before transmission.

---

## ⚙️ Step 8: Webhook Endpoints

| Gateway     | Endpoint                            | Notes                                 |
| ----------- | ----------------------------------- | ------------------------------------- |
| Stripe      | `/api/billing/webhooks/stripe`      | Primary endpoint                      |
| Stripe      | `/api/billing/webhook`              | Legacy redirect (backward compatible) |
| PaymentAsia | `/api/billing/webhooks/paymentasia` | All HK payment methods                |

Both endpoints verify signatures, check idempotency (skip terminal statuses), and update the unified `Payment` table.

---

## 🔗 Useful Links

- **Stripe Dashboard**: https://dashboard.stripe.com
- **PaymentAsia Portal**: https://portal.paymentasia.com
- **Internal API Docs**: `/docs/api/billing`
- **Payment Package**: `@mismo/payment`

---

## 🚨 Escalation Contacts

| Issue                | Contact                    | Response Time |
| -------------------- | -------------------------- | ------------- |
| Payment gateway down | DevOps On-call             | 15 min        |
| Refund > HK$50,000   | Finance Lead               | 1 hour        |
| Fraud suspicion      | Security Team              | 30 min        |
| Gateway API issues   | PaymentAsia/Stripe Support | Varies        |
