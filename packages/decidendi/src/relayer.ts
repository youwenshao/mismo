import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  type PublicClient,
  type WalletClient,
  type Chain,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base, baseSepolia } from 'viem/chains'
import { DECIDENDI_ESCROW_ABI, COMMISSION_REGISTRY_ABI, ERC20_ABI } from './abi'
import type { DecidendiConfig, Milestone, CommissionOnChain, RegistryEntry } from './types'

function getChain(chainId: number): Chain {
  if (chainId === 8453) return base
  if (chainId === 84532) return baseSepolia
  throw new Error(`Unsupported chain ID: ${chainId}`)
}

export class DecidendiRelayer {
  private publicClient: PublicClient
  private walletClient: WalletClient
  private config: DecidendiConfig
  private account: ReturnType<typeof privateKeyToAccount>

  constructor(config: DecidendiConfig) {
    this.config = config
    this.account = privateKeyToAccount(config.relayerPrivateKey)

    const chain = getChain(config.chainId)

    this.publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    })

    this.walletClient = createWalletClient({
      account: this.account,
      chain,
      transport: http(config.rpcUrl),
    })
  }

  /**
   * Compute the on-chain commission ID from a Mismo database commission ID.
   */
  commissionIdToBytes32(commissionId: string): `0x${string}` {
    return keccak256(toBytes(commissionId))
  }

  /**
   * Compute the PRD hash from PRD JSON.
   */
  prdToHash(prdJson: unknown): `0x${string}` {
    const jsonStr = JSON.stringify(prdJson)
    return keccak256(toBytes(jsonStr))
  }

  // ─── Escrow Operations ──────────────────────────────────────────

  async ensureUsdcAllowance(amount: bigint): Promise<void> {
    const allowance = await this.publicClient.readContract({
      address: this.config.usdcAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [this.account.address, this.config.escrowAddress],
    })

    if ((allowance as bigint) < amount) {
      const hash = await this.walletClient.writeContract({
        address: this.config.usdcAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [this.config.escrowAddress, amount * 10n],
      })
      await this.publicClient.waitForTransactionReceipt({ hash })
    }
  }

  async lockDeposit(
    commissionId: string,
    payerAddress: `0x${string}`,
    depositUsdc: bigint,
    finalUsdc: bigint,
    deadlineTimestamp: number,
    prdJson: unknown,
  ): Promise<`0x${string}`> {
    const id = this.commissionIdToBytes32(commissionId)
    const prdHash = this.prdToHash(prdJson)

    await this.ensureUsdcAllowance(depositUsdc)

    const hash = await this.walletClient.writeContract({
      address: this.config.escrowAddress,
      abi: DECIDENDI_ESCROW_ABI,
      functionName: 'lockDeposit',
      args: [id, payerAddress, depositUsdc, finalUsdc, BigInt(deadlineTimestamp), prdHash],
    })

    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  async completeMilestone(commissionId: string, milestone: Milestone): Promise<`0x${string}`> {
    const id = this.commissionIdToBytes32(commissionId)

    const hash = await this.walletClient.writeContract({
      address: this.config.escrowAddress,
      abi: DECIDENDI_ESCROW_ABI,
      functionName: 'completeMilestone',
      args: [id, milestone],
    })

    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  async clientAccept(commissionId: string): Promise<`0x${string}`> {
    const id = this.commissionIdToBytes32(commissionId)

    const hash = await this.walletClient.writeContract({
      address: this.config.escrowAddress,
      abi: DECIDENDI_ESCROW_ABI,
      functionName: 'clientAccept',
      args: [id],
    })

    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  async lockFinal(commissionId: string, finalUsdc: bigint): Promise<`0x${string}`> {
    const id = this.commissionIdToBytes32(commissionId)

    await this.ensureUsdcAllowance(finalUsdc)

    const hash = await this.walletClient.writeContract({
      address: this.config.escrowAddress,
      abi: DECIDENDI_ESCROW_ABI,
      functionName: 'lockFinal',
      args: [id],
    })

    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  async releaseFinal(commissionId: string): Promise<`0x${string}`> {
    const id = this.commissionIdToBytes32(commissionId)

    const hash = await this.walletClient.writeContract({
      address: this.config.escrowAddress,
      abi: DECIDENDI_ESCROW_ABI,
      functionName: 'releaseFinal',
      args: [id],
    })

    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  async extendDeadline(commissionId: string, newDeadlineTimestamp: number): Promise<`0x${string}`> {
    const id = this.commissionIdToBytes32(commissionId)

    const hash = await this.walletClient.writeContract({
      address: this.config.escrowAddress,
      abi: DECIDENDI_ESCROW_ABI,
      functionName: 'extendDeadline',
      args: [id, BigInt(newDeadlineTimestamp)],
    })

    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  async getCommission(commissionId: string): Promise<CommissionOnChain> {
    const id = this.commissionIdToBytes32(commissionId)

    const result = await this.publicClient.readContract({
      address: this.config.escrowAddress,
      abi: DECIDENDI_ESCROW_ABI,
      functionName: 'getCommission',
      args: [id],
    })

    return result as unknown as CommissionOnChain
  }

  // ─── Registry Operations ────────────────────────────────────────

  async registerCommission(
    commissionId: string,
    prdJson: unknown,
    clientAddress: `0x${string}`,
    depositUsdc: bigint,
    finalUsdc: bigint,
  ): Promise<`0x${string}`> {
    const id = this.commissionIdToBytes32(commissionId)
    const prdHash = this.prdToHash(prdJson)

    const hash = await this.walletClient.writeContract({
      address: this.config.registryAddress,
      abi: COMMISSION_REGISTRY_ABI,
      functionName: 'registerCommission',
      args: [id, prdHash, clientAddress, depositUsdc, finalUsdc],
    })

    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  async recordBuildComplete(commissionId: string): Promise<`0x${string}`> {
    const id = this.commissionIdToBytes32(commissionId)

    const hash = await this.walletClient.writeContract({
      address: this.config.registryAddress,
      abi: COMMISSION_REGISTRY_ABI,
      functionName: 'recordBuildComplete',
      args: [id],
    })

    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  async recordDelivered(
    commissionId: string,
    deliveryArtifactsHash: `0x${string}`,
  ): Promise<`0x${string}`> {
    const id = this.commissionIdToBytes32(commissionId)

    const hash = await this.walletClient.writeContract({
      address: this.config.registryAddress,
      abi: COMMISSION_REGISTRY_ABI,
      functionName: 'recordDelivered',
      args: [id, deliveryArtifactsHash],
    })

    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  async recordAccepted(commissionId: string): Promise<`0x${string}`> {
    const id = this.commissionIdToBytes32(commissionId)

    const hash = await this.walletClient.writeContract({
      address: this.config.registryAddress,
      abi: COMMISSION_REGISTRY_ABI,
      functionName: 'recordAccepted',
      args: [id],
    })

    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  async recordFinalized(commissionId: string): Promise<`0x${string}`> {
    const id = this.commissionIdToBytes32(commissionId)

    const hash = await this.walletClient.writeContract({
      address: this.config.registryAddress,
      abi: COMMISSION_REGISTRY_ABI,
      functionName: 'recordFinalized',
      args: [id],
    })

    await this.publicClient.waitForTransactionReceipt({ hash })
    return hash
  }

  async verifyCommission(commissionId: string): Promise<RegistryEntry> {
    const id = this.commissionIdToBytes32(commissionId)

    const result = await this.publicClient.readContract({
      address: this.config.registryAddress,
      abi: COMMISSION_REGISTRY_ABI,
      functionName: 'verify',
      args: [id],
    })

    return result as unknown as RegistryEntry
  }

  async verifyPrdHash(commissionId: string, prdJson: unknown): Promise<boolean> {
    const id = this.commissionIdToBytes32(commissionId)
    const prdHash = this.prdToHash(prdJson)

    const result = await this.publicClient.readContract({
      address: this.config.registryAddress,
      abi: COMMISSION_REGISTRY_ABI,
      functionName: 'verifyPrdHash',
      args: [id, prdHash],
    })

    return result as boolean
  }

  // ─── Helpers ────────────────────────────────────────────────────

  get relayerAddress(): `0x${string}` {
    return this.account.address
  }

  getExplorerUrl(txHash: `0x${string}`): string {
    if (this.config.chainId === 8453) {
      return `https://basescan.org/tx/${txHash}`
    }
    return `https://sepolia.basescan.org/tx/${txHash}`
  }
}

/**
 * Create a DecidendiRelayer from environment variables.
 * Returns null if Decidendi is not enabled.
 */
export function createRelayerFromEnv(): DecidendiRelayer | null {
  if (process.env.ENABLE_DECIDENDI !== 'true') return null

  const relayerKey = process.env.DECIDENDI_RELAYER_PRIVATE_KEY
  const escrow = process.env.DECIDENDI_ESCROW_ADDRESS
  const registry = process.env.DECIDENDI_REGISTRY_ADDRESS
  const arbiter = process.env.DECIDENDI_ARBITER_ADDRESS
  const usdcAddr = process.env.USDC_CONTRACT_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org'
  const chainId = parseInt(process.env.BASE_CHAIN_ID || '8453', 10)

  if (!relayerKey || !escrow || !registry || !arbiter) return null

  return new DecidendiRelayer({
    escrowAddress: escrow as `0x${string}`,
    registryAddress: registry as `0x${string}`,
    arbiterAddress: arbiter as `0x${string}`,
    usdcAddress: usdcAddr as `0x${string}`,
    relayerPrivateKey: relayerKey as `0x${string}`,
    rpcUrl,
    chainId,
    depositRatio: parseFloat(process.env.DECIDENDI_DEPOSIT_RATIO || '0.40'),
    gracePeriodDays: parseInt(process.env.DECIDENDI_GRACE_PERIOD_DAYS || '3', 10),
    slaBufferDays: parseInt(process.env.DECIDENDI_SLA_BUFFER_DAYS || '7', 10),
  })
}
