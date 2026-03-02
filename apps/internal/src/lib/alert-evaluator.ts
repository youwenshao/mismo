import type { Alert } from '@/components/shared/alert-banner'
import { TOKEN_BUDGET_PER_FEATURE } from '@mismo/shared'

interface BuildData {
  id: string
  commissionId: string
  status: string
  kimiqTokensUsed: number
  executionIds: unknown
  createdAt: Date
  updatedAt: Date
  commission: {
    feasibilityScore: number | null
    prdJson: unknown
  }
}

interface DeliveryData {
  id: string
  commissionId: string
  contractCheckPassed: boolean
}

export function evaluateAlerts(
  builds: BuildData[],
  deliveries: DeliveryData[]
): Alert[] {
  const alerts: Alert[] = []
  const now = Date.now()

  for (const build of builds) {
    // Critical path blocked: RUNNING for >15 min
    if (build.status === 'RUNNING') {
      const elapsed = now - build.updatedAt.getTime()
      if (elapsed > 15 * 60 * 1000) {
        alerts.push({
          id: `blocked-${build.id}`,
          severity: 'error',
          message: `Build ${build.id.slice(0, 8)} has been running for ${Math.floor(elapsed / 60000)}min with no progress`,
          timestamp: new Date(),
        })
      }
    }

    // Expected risk materializing
    if (
      build.status === 'FAILED' &&
      build.commission.feasibilityScore != null &&
      build.commission.feasibilityScore < 80
    ) {
      alerts.push({
        id: `risk-${build.id}`,
        severity: 'warning',
        message: `Build ${build.id.slice(0, 8)} failed as predicted — feasibility score was ${build.commission.feasibilityScore.toFixed(0)}`,
        timestamp: new Date(),
      })
    }

    // Cost overrun
    const prd = build.commission.prdJson as Record<string, unknown> | null
    const featureCount = Array.isArray(prd?.features)
      ? (prd!.features as unknown[]).length
      : 1
    const estimate = TOKEN_BUDGET_PER_FEATURE * featureCount
    if (build.kimiqTokensUsed > estimate * 3) {
      alerts.push({
        id: `cost-${build.id}`,
        severity: 'warning',
        message: `Build ${build.id.slice(0, 8)} costing ${(build.kimiqTokensUsed / estimate).toFixed(1)}x estimate — investigate`,
        timestamp: new Date(),
      })
    }
  }

  // Architecture drift
  for (const delivery of deliveries) {
    if (!delivery.contractCheckPassed) {
      alerts.push({
        id: `drift-${delivery.id}`,
        severity: 'error',
        message: `Architecture drift detected in delivery ${delivery.id.slice(0, 8)} — contract check failed`,
        timestamp: new Date(),
      })
    }
  }

  return alerts
}
