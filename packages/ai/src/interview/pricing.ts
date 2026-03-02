import { type PriceEstimate, ServiceTier, ArchTemplate } from '@mismo/shared'
import { SERVICE_TIER_PRICING, HOSTING_MONTHLY_PRICING, PRICING } from '@mismo/shared'

interface PricingInput {
  featureCount: number
  archPreference: string
  regulatoryDomains: string[]
  complexityTolerance: string
  expectedVolume: string
  archetype?: string
}

function resolveArchTemplate(input: PricingInput): ArchTemplate {
  // Use Mo v2 archetype if available
  if (input.archetype) {
    const mapped = input.archetype.toUpperCase() as keyof typeof ArchTemplate
    if (ArchTemplate[mapped]) return ArchTemplate[mapped]
  }

  // Fallback to preference mapping
  const lower = input.archPreference?.toLowerCase() || ''
  if (lower.includes('marketing') || lower.includes('landing')) return ArchTemplate.MARKETING
  if (lower.includes('ai') || lower.includes('smart')) return ArchTemplate.AI
  if (lower.includes('data') || lower.includes('pipeline')) return ArchTemplate.PIPELINE
  if (lower.includes('compliance') || lower.includes('secure')) return ArchTemplate.COMPLIANCE
  
  return ArchTemplate.SAAS
}

function resolveTier(featureCount: number, arch: ArchTemplate, hasCompliance: boolean): ServiceTier {
  if (arch === ArchTemplate.AI || arch === ArchTemplate.COMPLIANCE || featureCount > 6 || hasCompliance) {
    return ServiceTier.FOUNDRY
  }
  if (arch === ArchTemplate.SAAS || arch === ArchTemplate.PIPELINE || featureCount > 4) {
    return ServiceTier.VERIFIED
  }
  return ServiceTier.VIBE
}

function estimateTimeline(tier: ServiceTier, featureCount: number): { min: number; max: number } {
  const base = { [ServiceTier.VIBE]: 2, [ServiceTier.VERIFIED]: 4, [ServiceTier.FOUNDRY]: 8 }
  const min = base[tier]
  const featureAddon = Math.max(0, featureCount - 3) * 0.5
  return { min: Math.ceil(min + featureAddon), max: Math.ceil(min * 1.5 + featureAddon) }
}

function assessDifficulty(featureCount: number, arch: ArchTemplate, hasCompliance: boolean): number {
  let score = 1
  if (featureCount > 3) score += 1
  if (featureCount > 6) score += 1
  if ([ArchTemplate.AI, ArchTemplate.COMPLIANCE, ArchTemplate.INTEGRATION].includes(arch)) score += 1
  if (hasCompliance) score += 1
  return Math.min(score, 5)
}

export function calculatePriceEstimate(input: PricingInput): PriceEstimate {
  const arch = resolveArchTemplate(input)
  const hasCompliance = (input.regulatoryDomains || []).some(
    (d) => d && d.toLowerCase() !== 'none' && d.toLowerCase() !== 'regular',
  )
  const tier = resolveTier(input.featureCount, arch, hasCompliance)
  const basePrice = SERVICE_TIER_PRICING[tier]

  const extraFeatures = Math.max(0, input.featureCount - PRICING.baseFeatureCount)
  const featureMultiplier = 1 + extraFeatures * PRICING.perExtraFeaturePercent
  const archMultiplier = PRICING.architectureMultiplier[arch] || 1.0

  let complianceAddon = 0
  for (const domain of (input.regulatoryDomains || [])) {
    const lower = domain.toLowerCase()
    if (lower.includes('health') || lower.includes('medical') || lower.includes('hipaa')) {
      complianceAddon += PRICING.complianceAddon.healthcare
    } else if (lower.includes('financ') || lower.includes('bank') || lower.includes('payment')) {
      complianceAddon += PRICING.complianceAddon.financial
    } else if (lower.includes('child') || lower.includes('minor') || lower.includes('coppa')) {
      complianceAddon += PRICING.complianceAddon.childrenData
    } else if (lower.includes('government') || lower.includes('id') || lower.includes('passport')) {
      complianceAddon += PRICING.complianceAddon.governmentId
    }
  }

  const rawPrice = basePrice * featureMultiplier * archMultiplier * (1 + complianceAddon)
  const biasedPrice = rawPrice * (1 + PRICING.marginBias)

  const minPrice = Math.round(rawPrice / 100) * 100
  const maxPrice = Math.round(biasedPrice / 100) * 100

  const timeline = estimateTimeline(tier, input.featureCount)
  const difficulty = assessDifficulty(input.featureCount, arch, hasCompliance)

  const feasibilityNotes: string[] = []
  if (difficulty >= 4) {
    feasibilityNotes.push('This is a complex project that will benefit from phased delivery')
  }
  if (hasCompliance || arch === ArchTemplate.COMPLIANCE) {
    feasibilityNotes.push('Regulatory compliance requirements add development time for security and audit measures')
  }
  if (input.featureCount > 6) {
    feasibilityNotes.push('Consider prioritizing a smaller feature set for an initial launch, then iterating')
  }
  if (arch === ArchTemplate.AI) {
    feasibilityNotes.push('AI integration requires specialized testing and model fine-tuning')
  }

  return {
    tierRecommendation: tier,
    priceRange: { min: minPrice, max: maxPrice },
    breakdown: {
      basePrice,
      featureComplexity: featureMultiplier,
      architectureMultiplier: archMultiplier,
      complianceAddon,
      hostingMonthly: HOSTING_MONTHLY_PRICING,
    },
    estimatedTimeline: timeline,
    difficultyScore: difficulty,
    feasibilityNotes,
  }
}
