import { prisma } from '@mismo/db'
import { StatCard } from '@/components/shared/stat-card'
import { FleetDashboard } from '@/components/fleet/fleet-dashboard'

export default async function FleetPage() {
  const [totalBuilds, runningBuilds, failedBuilds, agents] =
    await Promise.all([
      prisma.build.count(),
      prisma.build.count({ where: { status: 'RUNNING' } }),
      prisma.build.count({ where: { status: 'FAILED' } }),
      prisma.agent.count({ where: { status: 'ACTIVE' } }),
    ])

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Fleet Status</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Builds" value={totalBuilds} />
        <StatCard
          label="Running"
          value={runningBuilds}
          sublabel={runningBuilds > 0 ? 'Active now' : 'Idle'}
          trend={runningBuilds > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          label="Failed"
          value={failedBuilds}
          trend={failedBuilds > 0 ? 'down' : 'neutral'}
        />
        <StatCard label="Active Agents" value={agents} />
      </div>

      <FleetDashboard />
    </div>
  )
}
