'use client'

import { useReadContract, useAccount } from 'wagmi'
import { COMMISSION_REGISTRY_ABI, DECIDENDI_ESCROW_ABI } from '@mismo/decidendi'
import { keccak256, toBytes } from 'viem'
import { ConnectWallet } from './connect-wallet'

const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_DECIDENDI_ESCROW_ADDRESS ?? '0x0') as `0x${string}`
const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_DECIDENDI_REGISTRY_ADDRESS ??
  '0x0') as `0x${string}`

const MILESTONES = [
  'Created',
  'Deposit Locked',
  'Build Complete',
  'Delivered',
  'Accepted',
  'Finalized',
]

function formatUsdc(amount: bigint): string {
  return `$${(Number(amount) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`
}

function formatDate(ts: bigint): string {
  if (ts === 0n) return '—'
  return new Date(Number(ts) * 1000).toLocaleString()
}

interface EscrowDashboardProps {
  commissionId: string
  chainId: number
}

export function EscrowDashboard({ commissionId, chainId }: EscrowDashboardProps) {
  const { isConnected } = useAccount()
  const onChainId = keccak256(toBytes(commissionId))

  const { data: registryData, isLoading: registryLoading } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: COMMISSION_REGISTRY_ABI,
    functionName: 'verify',
    args: [onChainId],
    chainId,
  })

  const { data: escrowData, isLoading: escrowLoading } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: DECIDENDI_ESCROW_ABI,
    functionName: 'getCommission',
    args: [onChainId],
    chainId,
  })

  const isLoading = registryLoading || escrowLoading

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <div className="h-6 w-1/3 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-32 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    )
  }

  const registry = registryData as
    | {
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
    | undefined

  const escrow = escrowData as
    | {
        currentMilestone: number
        depositAmount: bigint
        finalAmount: bigint
        totalAmount: bigint
        deadlineAt: bigint
        disputed: boolean
        voided: boolean
        prdHash: `0x${string}`
      }
    | undefined

  if (!registry || !escrow) {
    return (
      <div className="rounded-xl border border-zinc-200 p-6 text-center dark:border-zinc-700">
        <p className="text-zinc-500">No on-chain escrow data found for this commission.</p>
        <p className="mt-1 text-sm text-zinc-400">
          Escrow is created after the deposit payment is confirmed.
        </p>
      </div>
    )
  }

  const currentMilestone = Number(escrow.currentMilestone)
  const explorerBase = chainId === 8453 ? 'https://basescan.org' : 'https://sepolia.basescan.org'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Escrow Transparency Dashboard</h2>
        <ConnectWallet />
      </div>

      {/* Status badges */}
      <div className="flex gap-2">
        {escrow.disputed && (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
            Disputed
          </span>
        )}
        {escrow.voided && (
          <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            Voided
          </span>
        )}
        {!escrow.disputed && !escrow.voided && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Active
          </span>
        )}
      </div>

      {/* Milestone Timeline */}
      <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <h3 className="mb-4 text-sm font-medium text-zinc-500 uppercase tracking-wide">
          Milestone Progress
        </h3>
        <div className="flex items-center gap-1">
          {MILESTONES.map((name, i) => (
            <div key={name} className="flex flex-1 flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  i <= currentMilestone
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700'
                }`}
              >
                {i <= currentMilestone ? '✓' : i + 1}
              </div>
              <span className="mt-1 text-center text-[10px] text-zinc-500">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <p className="text-xs text-zinc-500">Deposit</p>
          <p className="mt-1 text-lg font-semibold">{formatUsdc(escrow.depositAmount)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <p className="text-xs text-zinc-500">Final Payment</p>
          <p className="mt-1 text-lg font-semibold">{formatUsdc(escrow.finalAmount)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <p className="text-xs text-zinc-500">Total</p>
          <p className="mt-1 text-lg font-semibold">{formatUsdc(escrow.totalAmount)}</p>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
        <h3 className="mb-4 text-sm font-medium text-zinc-500 uppercase tracking-wide">
          On-Chain Audit Trail
        </h3>
        <div className="space-y-3 text-sm">
          <AuditRow label="PRD Hash" value={registry.prdHash} />
          {registry.deliveryHash !==
            '0x0000000000000000000000000000000000000000000000000000000000000000' && (
            <AuditRow label="Delivery Hash" value={registry.deliveryHash} />
          )}
          <AuditRow label="Registered" value={formatDate(registry.registeredAt)} />
          {registry.buildCompletedAt > 0n && (
            <AuditRow label="Build Completed" value={formatDate(registry.buildCompletedAt)} />
          )}
          {registry.deliveredAt > 0n && (
            <AuditRow label="Delivered" value={formatDate(registry.deliveredAt)} />
          )}
          {registry.acceptedAt > 0n && (
            <AuditRow label="Accepted" value={formatDate(registry.acceptedAt)} />
          )}
          {registry.finalizedAt > 0n && (
            <AuditRow label="Finalized" value={formatDate(registry.finalizedAt)} />
          )}
          <div className="pt-2">
            <AuditRow label="SLA Deadline" value={formatDate(escrow.deadlineAt)} />
          </div>
        </div>
      </div>

      {/* Explorer Links */}
      <div className="text-center">
        <a
          href={`${explorerBase}/address/${ESCROW_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          View Escrow Contract on BaseScan ↗
        </a>
      </div>
    </div>
  )
}

function AuditRow({ label, value }: { label: string; value: string }) {
  const isHash = value.startsWith('0x') && value.length > 10
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      {isHash ? (
        <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
          {value.slice(0, 10)}...{value.slice(-8)}
        </span>
      ) : (
        <span className="text-zinc-700 dark:text-zinc-300">{value}</span>
      )}
    </div>
  )
}
