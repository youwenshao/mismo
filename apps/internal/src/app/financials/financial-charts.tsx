'use client'

import { RevenueChart } from '@/components/financials/revenue-chart'
import { CostBreakdown } from '@/components/financials/cost-breakdown'
import { ProfitByArchetype } from '@/components/financials/profit-by-archetype'
import { CostAlertCard } from '@/components/financials/cost-alert-card'

interface FinancialChartsProps {
  revenueData: Array<{ month: string; revenue: number }>
  costData: Array<{
    buildId: string
    tokenCost: number
    infraCost: number
    totalCost: number
    archetype: string
  }>
  profitData: Array<{
    archetype: string
    revenue: number
    cost: number
    profit: number
    margin: number
    count: number
  }>
  costAlerts: Array<{
    buildId: string
    commissionEmail: string
    tokens: number
    estimate: number
    ratio: number
  }>
}

export function FinancialCharts({
  revenueData,
  costData,
  profitData,
  costAlerts,
}: FinancialChartsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={revenueData} />
        <CostBreakdown data={costData} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfitByArchetype data={profitData} />
        <CostAlertCard alerts={costAlerts} />
      </div>
    </div>
  )
}
