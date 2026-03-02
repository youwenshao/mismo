import { prisma } from '@mismo/db'
import { KanbanBoard } from '@/components/commissions/kanban-board'
import { StatCard } from '@/components/shared/stat-card'

export default async function CommissionsPage() {
  const commissions = await prisma.commission.findMany({
    where: { status: { not: 'CANCELLED' } },
    include: {
      archetype: { select: { name: true } },
      builds: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const cards = commissions.map((c) => ({
    id: c.id,
    clientEmail: c.clientEmail,
    status: c.status,
    paymentState: c.paymentState,
    archetypeName: c.archetype?.name ?? null,
    latestBuildStatus: c.builds[0]?.status ?? null,
    feasibilityScore: c.feasibilityScore,
    createdAt: c.createdAt.toISOString(),
  }))

  const counts = {
    total: commissions.length,
    inProgress: commissions.filter((c) => c.status === 'IN_PROGRESS').length,
    completed: commissions.filter((c) => c.status === 'COMPLETED').length,
    escalated: commissions.filter((c) => c.status === 'ESCALATED').length,
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Commission Pipeline</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Active" value={counts.total} />
        <StatCard
          label="In Progress"
          value={counts.inProgress}
          trend={counts.inProgress > 0 ? 'up' : 'neutral'}
        />
        <StatCard label="Delivered" value={counts.completed} trend="up" />
        <StatCard
          label="Escalated"
          value={counts.escalated}
          trend={counts.escalated > 0 ? 'down' : 'neutral'}
        />
      </div>

      <KanbanBoard initialCommissions={cards} />
    </div>
  )
}
