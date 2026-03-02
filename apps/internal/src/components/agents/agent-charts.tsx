'use client'

import { SuccessRateChart } from './success-rate-chart'
import { BuildTimeChart } from './build-time-chart'
import { ErrorHeatmap } from './error-heatmap'
import { QualityScoreCard } from './quality-score-card'

interface AgentChartsProps {
  successRateData: Array<{
    agentType: string
    successRate: number
    total: number
    succeeded: number
  }>
  buildTimeData: Array<{
    archetype: string
    avgMinutes: number
    count: number
  }>
  heatmapData: Array<{
    stage: string
    agent: string
    count: number
  }>
  stages: string[]
  agents: string[]
  qualityScores: Array<{
    label: string
    passed: number
    total: number
  }>
}

export function AgentCharts({
  successRateData,
  buildTimeData,
  heatmapData,
  stages,
  agents,
  qualityScores,
}: AgentChartsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SuccessRateChart data={successRateData} />
        <BuildTimeChart data={buildTimeData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorHeatmap data={heatmapData} stages={stages} agents={agents} />
        <QualityScoreCard scores={qualityScores} />
      </div>
    </div>
  )
}
