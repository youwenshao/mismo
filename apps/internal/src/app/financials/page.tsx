import { prisma } from '@mismo/db'
import { SERVICE_TIER_PRICING, TOKEN_BUDGET_PER_FEATURE } from '@mismo/shared'
import { StatCard } from '@/components/shared/stat-card'
import { FinancialCharts } from './financial-charts'

const COST_PER_1K_TOKENS = 0.002
const INFRA_COST_PER_STUDIO_HOUR = 5

export default async function FinancialsPage() {
  const commissions = await prisma.commission.findMany({
    where: { status: { not: 'CANCELLED' } },
    include: {
      archetype: { select: { name: true, slug: true } },
      builds: {
        select: {
          id: true,
          kimiqTokensUsed: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  })

  // Revenue by month
  const monthlyRevenue = new Map<string, number>()
  let totalRevenue = 0
  for (const c of commissions) {
    if (c.paymentState === 'UNPAID') continue
    const month = c.createdAt.toISOString().slice(0, 7)
    const revenue = SERVICE_TIER_PRICING.VIBE
    monthlyRevenue.set(month, (monthlyRevenue.get(month) ?? 0) + revenue)
    totalRevenue += revenue
  }
  const revenueData = Array.from(monthlyRevenue.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ month, revenue }))

  // Cost per build
  let totalCost = 0
  const costData = commissions.flatMap((c) =>
    c.builds.map((b) => {
      const tokenCost = (b.kimiqTokensUsed / 1000) * COST_PER_1K_TOKENS
      const durationHours =
        (b.updatedAt.getTime() - b.createdAt.getTime()) / (1000 * 60 * 60)
      const infraCost = durationHours * INFRA_COST_PER_STUDIO_HOUR
      const total = tokenCost + infraCost
      totalCost += total
      return {
        buildId: b.id.slice(0, 8),
        tokenCost: Math.round(tokenCost * 100) / 100,
        infraCost: Math.round(infraCost * 100) / 100,
        totalCost: Math.round(total * 100) / 100,
        archetype: c.archetype?.name ?? 'Unknown',
      }
    })
  )

  // Profit by archetype
  const archetypeMap = new Map<string, { revenue: number; cost: number; count: number }>()
  for (const c of commissions) {
    const name = c.archetype?.name ?? 'Unknown'
    const entry = archetypeMap.get(name) ?? { revenue: 0, cost: 0, count: 0 }
    if (c.paymentState !== 'UNPAID') entry.revenue += SERVICE_TIER_PRICING.VIBE
    for (const b of c.builds) {
      const tokenCost = (b.kimiqTokensUsed / 1000) * COST_PER_1K_TOKENS
      const hours = (b.updatedAt.getTime() - b.createdAt.getTime()) / 3600000
      entry.cost += tokenCost + hours * INFRA_COST_PER_STUDIO_HOUR
    }
    entry.count++
    archetypeMap.set(name, entry)
  }
  const profitData = Array.from(archetypeMap.entries()).map(
    ([archetype, { revenue, cost, count }]) => ({
      archetype,
      revenue: Math.round(revenue),
      cost: Math.round(cost * 100) / 100,
      profit: Math.round((revenue - cost) * 100) / 100,
      margin: revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100) : 0,
      count,
    })
  )

  // Cost alerts
  const costAlerts = commissions.flatMap((c) => {
    const prd = c.prdJson as Record<string, unknown> | null
    const featureCount = Array.isArray(prd?.features)
      ? (prd!.features as unknown[]).length
      : 1
    const estimate = TOKEN_BUDGET_PER_FEATURE * featureCount
    return c.builds
      .filter((b) => b.kimiqTokensUsed > estimate * 3)
      .map((b) => ({
        buildId: b.id.slice(0, 8),
        commissionEmail: c.clientEmail,
        tokens: b.kimiqTokensUsed,
        estimate,
        ratio: Math.round((b.kimiqTokensUsed / estimate) * 10) / 10,
      }))
  })

  const totalProfit = totalRevenue - totalCost
  const overallMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Financial Telemetry</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} />
        <StatCard
          label="Total Cost"
          value={`$${Math.round(totalCost).toLocaleString()}`}
        />
        <StatCard
          label="Net Profit"
          value={`$${Math.round(totalProfit).toLocaleString()}`}
          trend={totalProfit > 0 ? 'up' : 'down'}
        />
        <StatCard
          label="Margin"
          value={`${overallMargin}%`}
          trend={overallMargin >= 50 ? 'up' : overallMargin >= 0 ? 'neutral' : 'down'}
        />
      </div>

      <FinancialCharts
        revenueData={revenueData}
        costData={costData}
        profitData={profitData}
        costAlerts={costAlerts}
      />
    </div>
  )
}
