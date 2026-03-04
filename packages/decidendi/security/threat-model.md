# Decidendi Threat Model

## System Overview

Decidendi is a milestone-based escrow system on Base L2 using USDC. It consists of three contracts:

- **DecidendiEscrow**: Holds funds and enforces milestone-gated releases
- **CommissionRegistry**: On-chain audit trail for transparency
- **DecidendiArbiter**: 2-of-3 multi-sig for dispute resolution

## Trust Model

| Actor                    | Trust Level | Capabilities                                                         |
| ------------------------ | ----------- | -------------------------------------------------------------------- |
| Operator (Mismo Relayer) | High        | Lock deposits, advance milestones, accept on behalf of client        |
| Arbiter (Multi-sig)      | Critical    | Resolve disputes, emergency pause, change operator                   |
| Client (Payer)           | Medium      | Accept deliverables, raise disputes, void expired contracts, reclaim |
| Treasury                 | Recipient   | Receives released funds                                              |

## Threat Analysis

### T1: Reentrancy Attack

- **Vector**: Malicious token callback during `safeTransfer`
- **Impact**: Critical - fund drain
- **Mitigation**: `ReentrancyGuard` on all state-changing functions. USDC uses standard ERC20 transfer (no callback). Checks-effects-interactions pattern enforced.
- **Residual Risk**: Low

### T2: Operator Key Compromise

- **Vector**: Relayer private key stolen
- **Impact**: Critical - operator can advance milestones and release funds
- **Mitigation**:
  - Key stored in AWS KMS / HSM in production
  - Arbiter can emergency pause all operations
  - Arbiter can replace operator via `setOperator()`
  - Client can still dispute and reclaim after deadline
- **Residual Risk**: Medium (depends on KMS security)

### T3: Front-Running Milestone Completions

- **Vector**: MEV bot front-runs milestone transactions
- **Impact**: Low - only operator can call `completeMilestone`, no financial benefit from ordering
- **Mitigation**: Access control (onlyOperator modifier)
- **Residual Risk**: Negligible

### T4: Flash Loan Attack

- **Vector**: Manipulate oracle or liquidity for advantage
- **Impact**: N/A - no oracle dependency for pricing (amounts fixed at lock time)
- **Mitigation**: Fixed amounts at deposit time, no AMM interaction
- **Residual Risk**: None

### T5: USDC Depeg / Blacklist

- **Vector**: Circle blacklists escrow address or USDC depegs
- **Impact**: Medium-High - funds frozen
- **Mitigation**:
  - `emergencyPause()` callable by arbiter multi-sig
  - Arbiter can resolve all disputes and release funds
  - Non-custodial: funds distributed, not pooled long-term
- **Residual Risk**: Medium (systemic risk, cannot be eliminated)

### T6: Client Wallet Phishing

- **Vector**: Client tricked into signing malicious transaction
- **Impact**: Medium - could call `dispute()` or `clientAccept()` unintentionally
- **Mitigation**:
  - Wallet is optional; default flow uses relayer
  - Write operations require explicit wallet confirmation
  - One dispute per commission maximum
- **Residual Risk**: Low

### T7: Arbiter Collusion

- **Vector**: 2 of 3 arbiter signers collude
- **Impact**: High - can resolve disputes unfairly, pause system
- **Mitigation**:
  - Signers are independent (founder, auditor, community)
  - All actions are on-chain and auditable
  - Rotation of community member
- **Residual Risk**: Low-Medium

### T8: Relayer Downtime

- **Vector**: Mismo backend goes offline
- **Impact**: Medium - milestones can't advance, funds stuck temporarily
- **Mitigation**:
  - `reclaimExpired()` is permissionless after deadline + 30 days
  - `voidContract()` callable by client after deadline
  - Arbiter can still operate independently
- **Residual Risk**: Low

### T9: Integer Overflow

- **Vector**: Arithmetic overflow in fund calculations
- **Impact**: Critical if exploitable
- **Mitigation**: Solidity 0.8+ built-in overflow checks. USDC 6 decimals (max ~$18T fits uint256)
- **Residual Risk**: None

### T10: Contract Upgradeability Attack

- **Vector**: Governance attack on upgradeable proxy
- **Impact**: N/A - contracts are NOT upgradeable by design
- **Mitigation**: Immutable deployment. New versions deploy as new contracts.
- **Residual Risk**: None

### T11: Dispute Spam

- **Vector**: Client repeatedly raises disputes to delay
- **Impact**: Low - 1 dispute per commission max
- **Mitigation**: `require(!c.disputed)` check. Only payer or operator can dispute.
- **Residual Risk**: None

## Security Checklist

- [x] ReentrancyGuard on all external state-changing functions
- [x] Checks-effects-interactions pattern
- [x] Access control modifiers on all privileged functions
- [x] SafeERC20 for all token transfers
- [x] No delegatecall usage
- [x] No upgradeable proxy (intentional design choice)
- [x] Emergency pause mechanism via arbiter
- [x] Permissionless safety valve (reclaimExpired)
- [x] Milestone transitions validated (forward-only)
- [x] Solidity 0.8.24 (overflow protection)
- [x] No external oracle dependency
- [x] Comprehensive fuzz testing

## Pre-Mainnet Checklist

- [ ] Run Slither static analysis (see `security/audit.sh`)
- [ ] Run Mythril symbolic execution
- [ ] Verify all test cases pass on fork
- [ ] Deploy to Base Sepolia and run E2E
- [ ] Professional audit (recommended for mainnet)
- [ ] Verify Circle USDC contract address
- [ ] Configure KMS for relayer key
- [ ] Set up arbiter multi-sig with independent signers
- [ ] Monitor first 10 commissions closely
