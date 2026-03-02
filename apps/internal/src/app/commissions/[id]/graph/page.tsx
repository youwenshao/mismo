import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@mismo/db'
import { DependencyGraph } from '@/components/gsd/dependency-graph'

export default async function GraphPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const commission = await prisma.commission.findUnique({
    where: { id },
    select: {
      id: true,
      clientEmail: true,
      status: true,
    },
  })

  if (!commission) notFound()

  return (
    <div>
      <Link
        href={`/commissions/${id}`}
        className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block"
      >
        &larr; Commission Detail
      </Link>

      <h1 className="text-xl font-semibold mb-2">Dependency Graph</h1>
      <p className="text-sm text-gray-500 mb-6">
        {commission.clientEmail} &middot; {commission.status}
      </p>

      <DependencyGraph commissionId={id} />
    </div>
  )
}
