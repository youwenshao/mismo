export enum Milestone {
  CREATED = 0,
  DEPOSIT_LOCKED = 1,
  BUILD_COMPLETE = 2,
  DELIVERED = 3,
  ACCEPTED = 4,
  FINALIZED = 5,
}

export interface CommissionOnChain {
  commissionId: `0x${string}`
  payer: `0x${string}`
  payee: `0x${string}`
  depositAmount: bigint
  finalAmount: bigint
  totalAmount: bigint
  currentMilestone: Milestone
  createdAt: bigint
  deadlineAt: bigint
  disputed: boolean
  voided: boolean
  prdHash: `0x${string}`
}

export interface RegistryEntry {
  commissionId: `0x${string}`
  prdHash: `0x${string}`
  deliveryHash: `0x${string}`
  client: `0x${string}`
  registeredAt: bigint
  buildCompletedAt: bigint
  deliveredAt: bigint
  acceptedAt: bigint
  finalizedAt: bigint
  depositAmountUsdc: bigint
  finalAmountUsdc: bigint
}

export interface DecidendiConfig {
  escrowAddress: `0x${string}`
  registryAddress: `0x${string}`
  arbiterAddress: `0x${string}`
  usdcAddress: `0x${string}`
  relayerPrivateKey: `0x${string}`
  rpcUrl: string
  chainId: number
  depositRatio: number
  gracePeriodDays: number
  slaBufferDays: number
}
