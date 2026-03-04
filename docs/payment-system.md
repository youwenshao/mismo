# Payment System & Admin Whitelist Documentation

This document provides a comprehensive overview of Mismo's unified payment system, admin whitelist management, user grant (free trial) system, and hybrid Decidendi escrow flow.

---

## 1. Architecture Overview

Mismo uses a **Hybrid Gateway** architecture to optimize for both international reach and local Hong Kong payment methods. Payment flow can be **traditional** (Stripe/PaymentAsia only) or **Decidendi** (on-chain escrow on Base L2). See [Decidendi Escrow](decidendi-escrow.md) for Web3 details.

### Components

- **`@mismo/payment` Package**: A unified abstraction layer for multiple payment gateways.
- **Payment Router**: Dynamically routes payments to the appropriate gateway based on the selected method.
- **Unified `Payment` Model**: A single database table that stores transaction records from all gateways.
- **Admin Whitelist**: A multi-source whitelist (Env + DB) for identifying administrative users.
- **User Grant System**: Allows admins to issue free trials or one-time commission credits.

### Payment Method Routing

| Method                  | Gateway     | Target Audience        | Fee            |
| ----------------------- | ----------- | ---------------------- | -------------- |
| **Card** (Visa/MC/Amex) | Stripe      | International / Global | 3.4% + HK$2.35 |
| **FPS** (轉數快)        | PaymentAsia | HK Local               | 1.6%           |
| **AliPayHK**            | PaymentAsia | HK Local               | 1.6%           |
| **WeChat Pay HK**       | PaymentAsia | HK Local               | 1.6%           |
| **PayMe**               | PaymentAsia | HK Local               | 1.6%           |
| **Octopus**             | PaymentAsia | HK Local               | 1.6%           |

---

## 2. Technical Implementation

### 2.1 `@mismo/payment` Package

The core logic resides in `packages/payment/`.

- **`PaymentRouter`**: The primary entry point. Use `getPaymentRouter()` to get the singleton instance.
- **`PaymentGatewayAdapter`**: Interface that all gateways (Stripe, PaymentAsia) must implement.
- **`isPaymentMethodEnabled(method)`**: Checks feature flags (`ENABLE_FPS`, etc.). Only `card` is enabled by default.

### 2.2 Database Schema (`packages/db/prisma/schema.prisma`)

- **`Payment`**: Stores `transactionId`, `gateway`, `method`, `amount`, `status`, `phase`, and `metadata`.
  - **`phase`**: `DEPOSIT` (40% pre-build), `FINAL` (60% post-build), `HOSTING`, or `REFUND`
  - Amount charged is tier-dependent; deposit and final use `DECIDENDI_DEPOSIT_RATIO` (default 0.40)
- **`UserGrant`**: Stores admin-issued credits (`UNLIMITED_7DAY`, `FREE_SOURCE`, `FREE_SOURCE_OR_DEPLOY`).
- **`SystemConfig`**: Stores the dynamic admin whitelist under the key `admin.emailHashes`.

---

## 3. Admin Whitelist & Bypass

### 3.1 Admin Identification

Admins are identified by the SHA-256 hash of their email address. The system checks two sources:

1. **Environment Variable**: `ADMIN_EMAIL_HASHES` (comma-separated).
2. **Database**: `SystemConfig` record with key `admin.emailHashes`.

### 3.2 Admin Payment Bypass

When an authenticated user with the `ADMIN` role initiates a checkout:

- The payment flow is skipped.
- Two `Payment` records are created (deposit + final) with `amount: 0` and `metadata: { adminBypass: "true" }`.
- `advanceCommissionPaymentState()` is called twice to simulate the full lifecycle:
  - Triggers build pipeline (`UNPAID` → `PARTIAL` → build starts)
  - Decidendi relayer runs if `ENABLE_DECIDENDI=true`

---

## 4. User Grant System (Free Trials)

Admins can issue grants to users via the **Internal Dashboard (Settings > User Grants)**.

### Grant Types

- **`UNLIMITED_7DAY`**: Allows the user to commission any "Source" or "Deploy" project for free for 7 days. Does not apply to "Onsite" tiers.
- **`FREE_SOURCE`**: One-time credit for a "Source" tier commission.
- **`FREE_SOURCE_OR_DEPLOY`**: One-time credit for either a "Source" or "Deploy" tier commission.

### Deposit vs Final Amount

Checkout charges based on `phase`:

- **DEPOSIT** (pre-build): 40% of tier price (`DECIDENDI_DEPOSIT_RATIO` default 0.40)
- **FINAL** (post-build, after client acceptance): 60% of tier price

### Checkout Logic

The checkout API (`/api/billing/checkout`) checks for valid, unused grants before processing any payment. If a matching grant is found:

- The grant is marked as `usedAt = now()` (unless `UNLIMITED_7DAY`).
- Two $0 payment records are created (deposit + final).
- `advanceCommissionPaymentState()` is called twice to trigger the full lifecycle (build pipeline, Decidendi if enabled).

---

## 5. Security & Stability

### 5.1 Webhook Hardening

- **Signature Verification**: Mandatory for both Stripe and PaymentAsia. Requests with missing or invalid signatures are rejected.
- **Idempotency**: Webhook handlers check if a payment is already in a terminal state (`COMPLETED`, `FAILED`, `REFUNDED`) before processing updates.
- **Unified Path**: Primary webhooks are located at `/api/billing/webhooks/[gateway]`.

### 5.2 Error Handling

- **Sanitized Messages**: Internal error details (stack traces, API keys) are logged server-side but never returned to the client.
- **Auth Checks**: All billing endpoints (`checkout`, `status`) require authentication and verify ownership of the resource.

### 5.3 FPS QR Signing

`generateFPSQRData` signs the payload with an HMAC-SHA256 signature to prevent client-side tampering with the amount or reference.

---

## 6. Developer Reference

### Adding a New Payment Method

1. Add the method to `PaymentMethod` enum in `packages/payment/src/types.ts`.
2. Update `GATEWAY_ROUTES` in the same file.
3. If using a new gateway, implement a new adapter in `packages/payment/src/gateways/`.

### Modifying Pricing

Pricing constants are centralized in `packages/shared/src/constants.ts`.

- **`SOURCE_TIER_PRICING`**: Base prices for code handover.
- **`DEPLOY_BASE_MULTIPLIER`**: (1.25x) for white-glove setup.
- **`ONSITE_PRICING`**: Fixed hardware package prices.

### Testing the Flow

1. **Admin Bypass**: Log in as an admin and attempt to commission a project.
2. **User Grant**: Issue a grant to a test user and verify the $0 checkout.
3. **Webhook Simulation**: Use the Stripe CLI or manual POST requests with valid signatures to test completion logic.
