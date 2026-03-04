---
name: Hybrid Flow Security Patches
overview: 'Fix 12 identified gaps in the Decidendi hybrid payment flow: a critical Solidity recursion bug, missing on-chain relay calls at each lifecycle stage, incorrect deposit/final amount calculation in checkout, and several frontend/dashboard issues.'
todos:
  - id: fix-unpause-recursion
    content: Fix infinite recursion in DecidendiEscrow.sol unpause() -- change to _unpause()
    status: completed
  - id: fix-resolve-dispute-balance
    content: Replace balanceOf(address(this)) in resolveDispute with tracked per-commission amounts to prevent cross-escrow fund leakage
    status: completed
  - id: add-extend-deadline
    content: Add extendDeadline(commissionId, newDeadline) function to DecidendiEscrow.sol, gated by onlyOperator
    status: completed
  - id: wire-accept-onchain
    content: In /api/delivery/accept, call relayer.clientAccept() and relayer.recordAccepted() when Decidendi is enabled
    status: completed
  - id: create-milestone-api
    content: Create POST /api/decidendi/milestone internal route for build/delivery completion to relay milestones on-chain
    status: completed
  - id: wire-lockfinal-onchain
    content: In advanceCommissionPaymentState PARTIAL->FINAL, call relayer.lockFinal() and relayer.recordFinalized()
    status: completed
  - id: create-release-cron
    content: Create GET /api/cron/decidendi-release to auto-trigger releaseFinal() after 3-day grace period
    status: completed
  - id: fix-checkout-amounts
    content: Apply deposit ratio (40%/60%) to checkout amount based on payment phase
    status: completed
  - id: fix-admin-grant-bypass
    content: Make admin and grant bypasses call advanceCommissionPaymentState() instead of directly setting paymentState
    status: completed
  - id: cleanup-minor
    content: Remove unused toHex import from relayer.ts, fix CSS typos in escrow-dashboard.tsx
    status: completed
isProject: false
---

# Hybrid Flow: Functional and Security Patches

After reviewing every file in the Decidendi implementation, I found **12 issues** that prevent the hybrid flow from being fully functional and secure. They range from a critical smart contract bug to missing lifecycle hooks.

---

## 1. CRITICAL: `unpause()` infinite recursion in DecidendiEscrow.sol

In [packages/decidendi/contracts/DecidendiEscrow.sol](packages/decidendi/contracts/DecidendiEscrow.sol), the `unpause()` function calls itself instead of the inherited `_unpause()`:

```solidity
function unpause() external onlyArbiter {
    unpause(); // BUG: infinite recursion, should be _unpause()
}
```

Once the arbiter pauses the contract via `emergencyPause()`, it can **never be unpaused**. This is a bricking bug.

**Fix:** Change `unpause()` to `_unpause()`.

---

## 2. Missing: Final payment does not trigger `lockFinal()` + `releaseFinal()` on-chain

In [apps/web/src/lib/commission-lifecycle.ts](apps/web/src/lib/commission-lifecycle.ts), when `advanceCommissionPaymentState()` transitions `PARTIAL -> FINAL`, it only updates the DB:

```typescript
if (commission.paymentState === 'PARTIAL') {
    await prisma.commission.update({ ... data: { paymentState: 'FINAL' } })
    // Nothing calls relayer.lockFinal() or schedules releaseFinal()
}
```

**Fix:** Add a `lockFinalOnChain(commissionId)` helper that:

- Calls `relayer.lockFinal(commissionId, finalUsdc)` to lock USDC
- Calls `relayer.recordFinalized(commissionId)` on registry
- Schedules `releaseFinal()` after the grace period (via a new `/api/decidendi/release-final` cron endpoint or a delayed job)

---

## 3. Missing: `/api/delivery/accept` does not relay `clientAccept()` on-chain

In [apps/web/src/app/api/delivery/accept/route.ts](apps/web/src/app/api/delivery/accept/route.ts), when the client accepts, the route updates `clientAcceptedAt` in the DB but never calls the Decidendi relayer:

```typescript
if (accepted) {
    await prisma.commission.update({ ... data: { clientAcceptedAt: new Date() } })
    // Missing: relayer.clientAccept(commissionId)
    // Missing: relayer.recordAccepted(commissionId)
}
```

**Fix:** After the DB update, call `createRelayerFromEnv()` and, if non-null, invoke `relayer.clientAccept()` and `relayer.recordAccepted()`.

---

## 4. Missing: Build completion not relayed on-chain

When the n8n build pipeline completes successfully, nothing calls `relayer.completeMilestone(commissionId, Milestone.BUILD_COMPLETE)` or `relayer.recordBuildComplete(commissionId)`.

The relayer methods exist but are not wired into any pipeline callback. The existing n8n trigger `notify_n8n_commission_completed` fires when `Commission.status -> COMPLETED`, but there is no hook for `Build.status -> COMPLETED`.

**Fix:** Create a new helper `onBuildCompleted(commissionId)` in `commission-lifecycle.ts` that:

- Calls `relayer.completeMilestone(commissionId, Milestone.BUILD_COMPLETE)`
- Calls `relayer.recordBuildComplete(commissionId)`
- Expose it via a new internal API route `POST /api/decidendi/milestone` that the n8n pipeline or existing build-completion logic can call.

---

## 5. Missing: Delivery completion not relayed on-chain

Same gap as build: when `Delivery.status -> COMPLETED`, nothing calls `relayer.completeMilestone(commissionId, Milestone.DELIVERED)` or `relayer.recordDelivered(commissionId, deliveryHash)`.

**Fix:** Extend the same `POST /api/decidendi/milestone` route to accept `{ commissionId, milestone: 'BUILD_COMPLETE' | 'DELIVERED', deliveryHash? }` and dispatch to the correct relayer method.

---

## 6. Checkout route charges full price regardless of phase

In [apps/web/src/app/api/billing/checkout/route.ts](apps/web/src/app/api/billing/checkout/route.ts), the amount is always `tierConfig.amount` (the full price):

```typescript
amount: tierConfig.amount, // Always full price
```

When `phase === 'DEPOSIT'`, it should charge 40% of the total. When `phase === 'FINAL'`, it should charge 60%.

**Fix:** Apply the deposit ratio from `DECIDENDI_DEPOSIT_RATIO` env var:

```typescript
const depositRatio = parseFloat(process.env.DECIDENDI_DEPOSIT_RATIO || '0.40')
const amount =
  phase === 'DEPOSIT'
    ? Math.round(tierConfig.amount * depositRatio)
    : phase === 'FINAL'
      ? Math.round(tierConfig.amount * (1 - depositRatio))
      : tierConfig.amount
```

---

## 7. Admin bypass and grant bypass skip build pipeline and Decidendi

In the checkout route, admin bypass and grant bypass both set `paymentState: 'FINAL'` directly and return immediately, bypassing `advanceCommissionPaymentState()`. This means:

- No build pipeline is triggered
- No Decidendi escrow is created

**Fix:** After creating the payment record for admin/grant, call `advanceCommissionPaymentState(commissionId)` instead of directly setting `paymentState: 'FINAL'`. Call it twice (for deposit then final) to simulate the full lifecycle for grants/admin bypasses.

---

## 8. `resolveDispute` balance check is unsafe with multiple concurrent escrows

In `DecidendiEscrow.sol`, `resolveDispute()` uses:

```solidity
uint256 held = usdc.balanceOf(address(this));
uint256 escrowBalance = held < total ? held : total;
```

When multiple commissions are active, `balanceOf` returns the aggregate USDC held for ALL commissions. The `min(held, total)` check still caps refunds, but during high-contention periods a refund for one commission could theoretically drain funds earmarked for another.

**Fix:** Remove the `balanceOf` check entirely and use the tracked per-commission amounts directly:

```solidity
uint256 escrowBalance = c.depositAmount + (finalLocked[commissionId] ? c.finalAmount : 0);
```

The contract already knows exactly how much USDC it holds per commission from `depositAmount` + `finalAmount`.

---

## 9. No `extendDeadline()` function in escrow contract

The plan states "Mismo can extend deadline (requires client wallet signature or relayer consent)" but no such function exists.

**Fix:** Add `extendDeadline(bytes32 commissionId, uint256 newDeadline)` gated by `onlyOperator`, requiring `newDeadline > c.deadlineAt`.

---

## 10. No scheduled trigger for `releaseFinal()` after grace period

After `lockFinal()`, the 3-day grace period must elapse before `releaseFinal()` can be called. Nothing automatically triggers this.

**Fix:** Create a Next.js API cron route `GET /api/cron/decidendi-release` that:

- Queries commissions where `paymentState === 'FINAL'`, `clientAcceptedAt` is set, and `clientAcceptedAt + 3 days < now()`
- For each, calls `relayer.releaseFinal(commissionId)` and `relayer.recordFinalized(commissionId)`
- Can be triggered by Vercel Cron or an external scheduler every hour

---

## 11. Unused import in relayer.ts

`toHex` is imported from viem but never used.

**Fix:** Remove the unused import.

---

## 12. Escrow dashboard CSS typos

In [apps/web/src/components/web3/escrow-dashboard.tsx](apps/web/src/components/web3/escrow-dashboard.tsx):

- Loading skeleton: `div.h-32` should be just `h-32`
- Voided badge: `dark:zinc-300` should be `dark:text-zinc-300`

---

## Implementation Order

```mermaid
flowchart TD
    subgraph critical [Critical Priority]
        P1["1. Fix unpause recursion"]
        P8["8. Fix resolveDispute balance"]
    end

    subgraph lifecycle [Lifecycle Hooks]
        P3["3. Accept -> clientAccept on-chain"]
        P4_5["4-5. Milestone relay API route"]
        P2["2. Final payment -> lockFinal"]
        P10["10. Cron for releaseFinal"]
    end

    subgraph checkout [Payment Fixes]
        P6["6. Deposit/final amount calc"]
        P7["7. Admin/grant bypass pipeline"]
    end

    subgraph contract [Contract Addition]
        P9["9. extendDeadline function"]
    end

    subgraph minor [Minor Fixes]
        P11["11. Remove unused import"]
        P12["12. Dashboard CSS typos"]
    end

    P1 --> P8
    P8 --> P3
    P3 --> P4_5
    P4_5 --> P2
    P2 --> P10
    P6 --> P7
    P9 --> P4_5
```

Patches 1 and 8 are the most critical (smart contract bugs). Patches 2-5 and 10 complete the on-chain lifecycle. Patch 6-7 fix the traditional payment path. Patch 9 adds the missing deadline extension. Patches 11-12 are cleanup.
