# Decidendi: Blockchain Milestone Escrow System

Decidendi is Mismo's on-chain escrow system built on **Base L2** using **USDC**. It provides transparent, auditable payment lifecycle management for client commissions through smart contracts.

## Overview

The system supports a **hybrid payment flow**: clients can choose either **traditional payment** (Stripe/PaymentAsia only) or **Decidendi escrow** (on-chain transparency). Both paths use the same deposit/final invoice model.

### Traditional Flow (ENABLE_DECIDENDI=false)

- Client pays deposit (40%) and final (60%) via Stripe/PaymentAsia
- No on-chain escrow; payments go directly to Mismo
- Same lifecycle: build pipeline, delivery, client acceptance, final invoice

### Decidendi Flow (ENABLE_DECIDENDI=true)

1. Client pays deposit (40%) via fiat (Stripe/PaymentAsia)
2. Mismo relayer locks equivalent USDC in escrow on Base L2
3. Build pipeline runs; milestones recorded on-chain
4. Client reviews and accepts deliverables
5. Deposit released to Mismo; final invoice (60%) issued
6. Final payment locked in escrow, released after 3-day grace period

## Architecture

```
packages/decidendi/
├── contracts/                # Solidity smart contracts
│   ├── DecidendiEscrow.sol   # Core escrow with milestone-gated releases
│   ├── CommissionRegistry.sol # On-chain audit trail
│   ├── DecidendiArbiter.sol  # 2-of-3 multi-sig for disputes
│   ├── interfaces/
│   │   └── IDecidendiEscrow.sol
│   └── libraries/
│       └── MilestoneLib.sol
├── test/                     # Foundry tests (fuzz + unit)
├── scripts/
│   └── deploy.ts             # Hardhat deploy to Base Sepolia/Mainnet
├── security/
│   ├── audit.sh              # Slither + Mythril analysis script
│   └── threat-model.md       # Comprehensive threat model
├── src/                      # TypeScript SDK
│   ├── index.ts              # Package exports
│   ├── relayer.ts            # DecidendiRelayer class (viem)
│   ├── abi.ts                # Contract ABIs
│   ├── types.ts              # TypeScript types
│   └── oracle.ts             # HKD -> USDC conversion
├── hardhat.config.ts
├── foundry.toml
└── package.json              # @mismo/decidendi
```

## Smart Contracts

### DecidendiEscrow

The core escrow contract. Each commission gets an escrow record with:

- `payer` (client wallet or Mismo custodial)
- `payee` (Mismo treasury)
- `depositAmount` / `finalAmount` in USDC
- Milestone progression: `CREATED → DEPOSIT_LOCKED → BUILD_COMPLETE → DELIVERED → ACCEPTED → FINALIZED`

Key functions:

- `lockDeposit()` - Lock USDC deposit after fiat payment confirmed
- `completeMilestone()` - Advance milestone (operator only)
- `clientAccept()` - Client accepts deliverables; releases deposit
- `lockFinal()` / `releaseFinal()` - Final payment with 3-day grace period
- `extendDeadline()` - Operator extends SLA deadline (new deadline must be later)
- `dispute()` - Freeze funds for arbiter resolution
- `voidContract()` - Reclaim deposit after SLA deadline exceeded
- `reclaimExpired()` - Permissionless safety valve after deadline + 30 days

### CommissionRegistry

On-chain audit trail storing:

- PRD hash (keccak256 of PRD JSON)
- Milestone timestamps
- Delivery artifact hashes
- Public `verify()` view function for transparency dashboard

### DecidendiArbiter

2-of-3 multi-sig for dispute resolution:

- `proposeResolveDispute()` - Propose refund percentage
- `proposeEmergencyPause()` / `proposeEmergencyUnpause()`
- `confirm()` - Second signer confirms; auto-executes at 2/3

## Payment Flow

| Tier     | Total (HKD) | Deposit (40%) | Final (60%) |
| -------- | ----------- | ------------- | ----------- |
| VIBE     | $15,600     | $6,240        | $9,360      |
| VERIFIED | $62,400     | $24,960       | $37,440     |
| FOUNDRY  | $195,000    | $78,000       | $117,000    |

### Deposit Flow

1. Client selects tier → Mo interview → PRD generated
2. Client signs contract (IP, age, AUP acknowledgments)
3. Client pays deposit via Stripe/PaymentAsia
4. Webhook fires → `advanceCommissionPaymentState()` → `UNPAID → PARTIAL`
5. Relayer converts to USDC → `lockDeposit()` on Base L2
6. Registry records PRD hash on-chain
7. Build pipeline auto-triggered (`ENABLE_AUTO_BUILD=true`)

### Acceptance & Final Payment

8. Build completes → n8n calls `POST /api/decidendi/milestone` with `milestone: BUILD_COMPLETE` (if Decidendi enabled)
9. Delivery completes → same API with `milestone: DELIVERED`
10. Client reviews via dashboard → clicks "Accept" → `POST /api/delivery/accept`
11. `clientAccept()` and `recordAccepted()` called on-chain (Decidendi path only)
12. Final invoice issued → client pays via Stripe/PaymentAsia
13. Webhook → `advanceCommissionPaymentState()` → `lockFinal()` on-chain (Decidendi only)
14. Cron `GET /api/cron/decidendi-release` runs hourly → `releaseFinal()` after grace period
15. Commission marked `COMPLETED`

### Checkout Amount by Phase

The checkout route applies `DECIDENDI_DEPOSIT_RATIO` (default 0.40):

- `phase: DEPOSIT` → charges 40% of tier price
- `phase: FINAL` → charges 60% of tier price

### Dispute Resolution

- Client calls `dispute()` → funds frozen
- Arbiter multi-sig proposes refund percentage
- 2-of-3 confirmation → `resolveDispute()` splits funds

### Safety Valves

- `voidContract()`: Client reclaims deposit after SLA deadline
- `reclaimExpired()`: Anyone can trigger after deadline + 30 days (permissionless)

## Internal API Routes

### POST /api/decidendi/milestone

Internal route for the n8n pipeline to relay milestone completions on-chain. Protected by `x-internal-secret` header.

**Headers:** `x-internal-secret: <DECIDENDI_INTERNAL_SECRET>`

**Body:**

```json
{
  "commissionId": "clxxx",
  "milestone": "BUILD_COMPLETE",
  "deliveryHash": "0x..."
}
```

- `milestone`: `BUILD_COMPLETE` or `DELIVERED`
- `deliveryHash`: Optional; required for `DELIVERED` (or auto-generated)

**Response:** `{ success, onChain, txHash?, explorerUrl?, milestone }`

### GET /api/cron/decidendi-release

Cron endpoint to auto-release final payments after the 3-day grace period. Call hourly via Vercel Cron or an external scheduler.

**Headers:** `Authorization: Bearer <CRON_SECRET>`

**Response:** `{ released, total, errors? }`

## Frontend Integration

The transparency dashboard is at `/project/[id]/escrow` and shows:

- Milestone timeline with on-chain timestamps
- Financial summary (deposit, final, total in USDC)
- PRD hash verification
- BaseScan transaction links
- Optional wallet connection (Coinbase Smart Wallet / MetaMask)

## Configuration

Set these in `.env`:

```env
# Feature flag: false = traditional Stripe/PaymentAsia only; true = on-chain escrow
ENABLE_DECIDENDI=true

# Contract addresses (deploy via packages/decidendi/scripts/deploy.ts)
DECIDENDI_ESCROW_ADDRESS=0x...
DECIDENDI_REGISTRY_ADDRESS=0x...
DECIDENDI_ARBITER_ADDRESS=0x...

# Relayer (hot wallet for on-chain calls; use KMS in production)
DECIDENDI_RELAYER_PRIVATE_KEY=0x...

# Base L2 RPC and chain
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_CHAIN_ID=8453

# USDC on Base (native)
USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Payment split and grace period
DECIDENDI_DEPOSIT_RATIO=0.40
DECIDENDI_GRACE_PERIOD_DAYS=3
DECIDENDI_SLA_BUFFER_DAYS=7

# Internal API secrets
DECIDENDI_INTERNAL_SECRET=    # For POST /api/decidendi/milestone
CRON_SECRET=                  # For GET /api/cron/decidendi-release
HKD_USD_RATE=7.80
```

When `ENABLE_DECIDENDI=false`, the system uses the traditional payment flow (Stripe/PaymentAsia) with no on-chain escrow. Clients can always use traditional payment regardless of the flag; the flag controls whether Decidendi is available for new commissions.

## Development

```bash
# Run Foundry tests
cd packages/decidendi
forge test -vvv

# Deploy to Base Sepolia
pnpm --filter @mismo/decidendi deploy:sepolia

# Run security audit
bash security/audit.sh
```

## Security

See `packages/decidendi/security/threat-model.md` for the full threat analysis covering:

- Reentrancy protection (OpenZeppelin ReentrancyGuard)
- Operator key compromise mitigation (KMS + arbiter override)
- USDC depeg handling (emergency pause)
- Non-upgradeable contracts (no proxy attack surface)
- Comprehensive fuzz testing

Contracts are non-upgradeable by design. New versions deploy as new contracts; existing escrows always honor their original terms.
