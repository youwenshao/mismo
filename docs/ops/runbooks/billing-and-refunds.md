# Runbook: Billing & Refunds

This guide covers the operational procedures for managing payments, cancellations, and refunds within the Mismo platform.

---

## 🔍 Billing Cycle Overview

Payments are processed via **Stripe** and tracked in the `Commission` and `User` tables.

1.  **DRAFT**: No payment.
2.  **DISCOVERY**: PRD discovery phase.
3.  **CONTRACTED**: Payment intent created/confirmed.
4.  **DEVELOPMENT**: Build starts.
5.  **DELIVERED**: Commission completed.

---

## ⚙️ Step 1: Handling Cancellations

A client can cancel a build through the Mismo dashboard or via manual request.

**Manual Cancellation via Supabase/Prisma:**
```typescript
await prisma.commission.update({
  where: { id: 'commission_id' },
  data: { status: 'CANCELLED' }
})
```

**Build Halt Protocol:**
1.  The `Commission` status change to `CANCELLED` fires a webhook.
2.  n8n workflows receive the webhook and stop active `Build` records associated with the commission.
3.  Any running Docker containers on worker nodes are identified via `studioAssignment` and stopped.

---

## ⚙️ Step 2: Partial Refunds

Mismo supports partial refunds based on the progress made (e.g., 50% refund if the build is at the `BACKEND` stage).

**Calculate Token Usage:**
```typescript
const tokensUsed = await prisma.tokenUsage.aggregate({
  where: { projectId: 'project_id' },
  _sum: { tokens: true }
})
```

**Calculate Total Cost Incurred:**
- `Tokens Used * Cost Per Token`
- `Base Platform Fee`
- `Studio Resource Fee (Hours Active)`

**Refund via Stripe Dashboard:**
1.  Locate the `PaymentIntent` in the Stripe Dashboard.
2.  Select `Refund`.
3.  Enter the amount (Total Paid - Incurred Costs).
4.  Mark the refund as `Partial` and provide a reason (e.g., "Client-initiated cancellation").

---

## ⚙️ Step 3: Refund Reconciliation

Once a refund is processed in Stripe:

1.  Update the `Commission` record in Supabase: `paymentState = 'PARTIAL'`.
2.  Record the refund metadata in the `AuditLog` table:
    ```json
    {
      "action": "REFUND",
      "resource": "Commission",
      "resourceId": "commission_id",
      "metadata": { "amount": 250.00, "stripeRefundId": "re_..." }
    }
    ```

---

## ⚙️ Step 4: Billing Discrepancies

If a client disputes a charge or reports a billing error:

1.  Review `TokenUsage` records for the project.
2.  Inspect `BuildLog` to verify the progress reported to the client.
3.  Cross-reference with the `Notification` table to see what status updates were sent.
4.  Escalate to **ADMIN** for manual review if necessary.
