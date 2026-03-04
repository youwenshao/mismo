import { prisma } from '@mismo/db'
import { notFound } from 'next/navigation'
import { EscrowDashboard } from '@/components/web3/escrow-dashboard'
import { Web3Provider } from '@/components/web3/wagmi-provider'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EscrowPage({ params }: PageProps) {
  const { id: commissionId } = await params

  const commission = await prisma.commission.findUnique({
    where: { id: commissionId },
    select: {
      id: true,
      escrowTxHash: true,
      escrowChainId: true,
      status: true,
      paymentState: true,
    },
  })

  if (!commission) notFound()

  const chainId = commission.escrowChainId ?? 8453

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Web3Provider>
        <EscrowDashboard commissionId={commission.id} chainId={chainId} />
      </Web3Provider>
    </main>
  )
}
