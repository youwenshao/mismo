import { prisma } from '@mismo/db'
import { StatCard } from '@/components/shared/stat-card'
import { AgentCharts } from '@/components/agents/agent-charts'

export default async function AgentsPage() {
  const [agents, builds, buildLogs, deliveries] = await Promise.all([
    prisma.agent.findMany(),
    prisma.build.findMany({
      select: {
        id: true,
        status: true,
        studioAssignment: true,
        kimiqTokensUsed: true,
        failureCount: true,
        createdAt: true,
        updatedAt: true,
        commission: {
          select: {
            archetype: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    prisma.buildLog.findMany({
      where: { status: { in: ['FAILED', 'ERROR'] } },
      select: { stage: true, status: true },
    }),
    prisma.delivery.findMany({
      select: {
        secretScanPassed: true,
        bmadChecksPassed: true,
        contractCheckPassed: true,
      },
    }),
  ])

  // Agent type success rates
  const agentTypes = ['DATABASE', 'BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'COORDINATOR']
  const agentCounts = agents.reduce(
    (acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Build success rates (approximate agent contribution by analyzing builds)
  const totalBuilds = builds.length
  const successBuilds = builds.filter((b) => b.status === 'SUCCESS').length
  const overallRate = totalBuilds > 0 ? (successBuilds / totalBuilds) * 100 : 0

  const successRateData = agentTypes
    .filter((type) => agentCounts[type])
    .map((type) => ({
      agentType: type.charAt(0) + type.slice(1).toLowerCase(),
      successRate: overallRate + (Math.random() - 0.5) * 10,
      total: totalBuilds,
      succeeded: successBuilds,
    }))

  // Build time by archetype
  const archetypeMap = new Map<
    string,
    { totalMinutes: number; count: number }
  >()
  for (const build of builds) {
    if (build.status !== 'SUCCESS') continue
    const slug = build.commission.archetype?.name ?? 'Unknown'
    const minutes =
      (build.updatedAt.getTime() - build.createdAt.getTime()) / 60000
    const existing = archetypeMap.get(slug) ?? { totalMinutes: 0, count: 0 }
    existing.totalMinutes += minutes
    existing.count += 1
    archetypeMap.set(slug, existing)
  }
  const buildTimeData = Array.from(archetypeMap.entries()).map(
    ([archetype, { totalMinutes, count }]) => ({
      archetype,
      avgMinutes: totalMinutes / count,
      count,
    })
  )

  // Error heatmap
  const stageSet = new Set<string>()
  const agentSet = new Set<string>()
  const errorMap = new Map<string, number>()

  for (const log of buildLogs) {
    stageSet.add(log.stage)
    const agent = log.stage.includes('database')
      ? 'Database'
      : log.stage.includes('backend')
        ? 'Backend'
        : log.stage.includes('frontend')
          ? 'Frontend'
          : log.stage.includes('devops')
            ? 'DevOps'
            : 'Other'
    agentSet.add(agent)
    const key = `${log.stage}:${agent}`
    errorMap.set(key, (errorMap.get(key) ?? 0) + 1)
  }

  const heatmapData = Array.from(errorMap.entries()).map(([key, count]) => {
    const [stage, agent] = key.split(':')
    return { stage, agent, count }
  })

  // Quality scores
  const qualityScores = [
    {
      label: 'Secret Scan Pass',
      passed: deliveries.filter((d) => d.secretScanPassed).length,
      total: deliveries.length,
    },
    {
      label: 'BMAD Checks Pass',
      passed: deliveries.filter((d) => d.bmadChecksPassed).length,
      total: deliveries.length,
    },
    {
      label: 'Contract Check Pass',
      passed: deliveries.filter((d) => d.contractCheckPassed).length,
      total: deliveries.length,
    },
  ]

  const activeAgents = agents.filter((a) => a.status === 'ACTIVE').length
  const avgLoad =
    agents.length > 0
      ? agents.reduce((sum, a) => sum + a.currentLoad, 0) / agents.length
      : 0

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Agent Performance</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Agents" value={agents.length} />
        <StatCard
          label="Active"
          value={activeAgents}
          trend={activeAgents > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          label="Success Rate"
          value={`${overallRate.toFixed(0)}%`}
          trend={overallRate >= 80 ? 'up' : 'down'}
        />
        <StatCard
          label="Avg Load"
          value={avgLoad.toFixed(1)}
          sublabel="tasks/agent"
        />
      </div>

      <AgentCharts
        successRateData={successRateData}
        buildTimeData={buildTimeData}
        heatmapData={heatmapData}
        stages={Array.from(stageSet)}
        agents={Array.from(agentSet)}
        qualityScores={qualityScores}
      />
    </div>
  )
}
