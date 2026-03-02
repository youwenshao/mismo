import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

interface FeasibilityBreakdown {
  category: string
  points: number
  reason: string
}

interface ArchitectureDecision {
  platform_strategy: 'expo-managed' | 'expo-bare' | 'fully-native'
  justification: string
  native_modules_required: string[]
  certificate_strategy: 'client-provided' | 'agency-managed-transfer'
  risk_mitigation: string[]
}

interface PrdMobileConfig {
  archetype?: string
  hardware_integrations?: string[]
  apple_developer_confirmed?: boolean
  google_play_confirmed?: boolean
  estimated_size_mb?: number
  push_notifications?: boolean
  background_location?: boolean
  custom_native_modules?: string[]
  native_modules_required?: string[]
}

function scoreFeasibility(mobileConfig: PrdMobileConfig): {
  score: number
  breakdown: FeasibilityBreakdown[]
} {
  const breakdown: FeasibilityBreakdown[] = []
  let score = 0

  const isPureRN =
    !mobileConfig.custom_native_modules?.length &&
    !mobileConfig.native_modules_required?.length
  if (isPureRN) {
    score += 2
    breakdown.push({ category: 'archetype', points: 2, reason: 'Pure React Native / Expo managed workflow' })
  }

  const complexHardware = (mobileConfig.hardware_integrations || []).some((h) =>
    ['bluetooth', 'nfc', 'usb', 'ar', 'vr'].includes(h.toLowerCase()),
  )
  if (!complexHardware) {
    score += 2
    breakdown.push({ category: 'hardware', points: 2, reason: 'No complex hardware integration required' })
  } else {
    breakdown.push({ category: 'hardware', points: 0, reason: `Complex hardware detected: ${mobileConfig.hardware_integrations?.join(', ')}` })
  }

  if (mobileConfig.apple_developer_confirmed) {
    score += 2
    breakdown.push({ category: 'apple_account', points: 2, reason: 'Apple Developer account confirmed' })
  } else {
    breakdown.push({ category: 'apple_account', points: 0, reason: 'Apple Developer account not confirmed' })
  }

  if (mobileConfig.google_play_confirmed) {
    score += 2
    breakdown.push({ category: 'google_account', points: 2, reason: 'Google Play Console confirmed' })
  } else {
    breakdown.push({ category: 'google_account', points: 0, reason: 'Google Play Console not confirmed' })
  }

  const estimatedSize = mobileConfig.estimated_size_mb ?? 50
  if (estimatedSize <= 100) {
    score += 2
    breakdown.push({ category: 'app_size', points: 2, reason: `Estimated size ${estimatedSize}MB within 100MB limit` })
  } else {
    breakdown.push({ category: 'app_size', points: 0, reason: `Estimated size ${estimatedSize}MB exceeds 100MB limit` })
  }

  if (mobileConfig.push_notifications) {
    score -= 3
    breakdown.push({ category: 'push_notifications', points: -3, reason: 'Push notifications require complex certificate management' })
  }

  if (mobileConfig.background_location) {
    score -= 3
    breakdown.push({ category: 'background_location', points: -3, reason: 'Background location triggers App Store privacy review risk' })
  }

  const customNativeModules = mobileConfig.custom_native_modules || mobileConfig.native_modules_required || []
  if (customNativeModules.length > 0) {
    score -= 5
    breakdown.push({ category: 'native_modules', points: -5, reason: `Custom native modules required: ${customNativeModules.join(', ')}` })
  }

  return { score: Math.max(0, Math.min(10, score)), breakdown }
}

function deriveArchitectureDecision(
  mobileConfig: PrdMobileConfig,
  score: number,
): ArchitectureDecision {
  const customNativeModules = mobileConfig.custom_native_modules || mobileConfig.native_modules_required || []
  const risks: string[] = []

  let strategy: ArchitectureDecision['platform_strategy'] = 'expo-managed'
  let justification: string

  if (customNativeModules.length > 0) {
    strategy = 'expo-bare'
    justification = 'Custom native modules require ejecting from Expo managed workflow'
    risks.push('Bare workflow increases build complexity and maintenance burden')
    risks.push('OTA updates limited to JS-only changes')
  } else if (mobileConfig.background_location || mobileConfig.push_notifications) {
    strategy = 'expo-managed'
    justification = 'Expo managed workflow with config plugins for notifications/location'
    if (mobileConfig.push_notifications) {
      risks.push('Push notification certificates must be configured before build')
    }
    if (mobileConfig.background_location) {
      risks.push('Background location requires App Store privacy justification')
    }
  } else {
    justification = 'Standard Expo managed workflow — simplest path for autonomous builds'
  }

  if (score < 8) {
    risks.push('Feasibility score below optimal — monitor build closely')
  }
  risks.push('iOS builds require physical Mac (Studio 2) availability')
  risks.push('Max EAS cloud build time: 30 minutes')

  return {
    platform_strategy: strategy,
    justification,
    native_modules_required: customNativeModules,
    certificate_strategy: mobileConfig.apple_developer_confirmed ? 'client-provided' : 'agency-managed-transfer',
    risk_mitigation: risks,
  }
}

export class MobileFeasibilityChecker implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Mobile Feasibility Checker',
    name: 'mobileFeasibilityChecker',
    icon: 'fa:mobile-alt',
    group: ['transform'],
    version: 1,
    description: 'BMAD feasibility gate for mobile builds — scores PRD and outputs architecture decision',
    defaults: {
      name: 'Mobile Feasibility Checker',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Build ID',
        name: 'buildId',
        type: 'string',
        default: '',
        description: 'The Supabase Build ID for audit logging',
      },
      {
        displayName: 'Mobile Config',
        name: 'mobileConfig',
        type: 'json',
        default: '{}',
        description: 'PRD mobile configuration: archetype, hardware, accounts, size, features',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const buildId = this.getNodeParameter('buildId', i) as string
      const mobileConfigRaw = this.getNodeParameter('mobileConfig', i) as string | object

      try {
        const mobileConfig: PrdMobileConfig =
          typeof mobileConfigRaw === 'string' ? JSON.parse(mobileConfigRaw) : mobileConfigRaw

        const { score, breakdown } = scoreFeasibility(mobileConfig)
        const architectureDecision = deriveArchitectureDecision(mobileConfig, score)

        const recommendation = score >= 6 ? 'proceed' : score >= 4 ? 'review' : 'halt'

        returnData.push({
          json: {
            buildId,
            score,
            recommendation,
            breakdown,
            architectureDecision,
            halted: recommendation === 'halt',
            haltReason:
              recommendation === 'halt'
                ? `Feasibility score ${score}/10 is below threshold (6). This requires custom native development outside autonomous scope.`
                : undefined,
          },
        })
      } catch (error: unknown) {
        if (this.continueOnFail()) {
          const message = error instanceof Error ? error.message : String(error)
          returnData.push({ json: { success: false, error: message } })
        } else {
          throw error
        }
      }
    }

    return [returnData]
  }
}
