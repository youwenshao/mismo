// Main exports
export { PRDValidator, validatePRD } from './validator'

// Types
export {
  ValidationSeverity,
  ValidationCategory,
  DEFAULT_VALIDATION_CONFIG,
  type ValidationIssue,
  type FollowUpQuestion,
  type ValidationResult,
  type FeatureValidationResult,
  type DataModelValidationResult,
  type ApiSpecValidationResult,
  type BusinessLogicValidationResult,
  type ValidationConfig,
  type SufficientCriterion,
  type ClarityGate,
  type FeasibilityIndicator,
  type IncompletePattern,
  type ValidationQuestion,
} from './types'

// Rubric - validation rules and criteria
export {
  FEATURE_DESCRIPTION_CRITERIA,
  USER_STORY_CRITERIA,
  DATA_MODEL_CRITERIA,
  CLARITY_GATES,
  FEASIBILITY_INDICATORS,
  INCOMPLETE_PATTERNS,
  VALIDATION_QUESTIONS,
  SCORING_WEIGHTS,
  SEVERITY_WEIGHTS,
} from './rubric'

// Note: Pattern constants are defined locally in utility functions below

// Utility functions for quick checks
export function isGenericDescription(description: string): boolean {
  const patterns = [
    /core entity/i,
    /manages?\s+\w+/i,
    /handles?\s+\w+/i,
    /this feature/i,
    /allows?\s+users?\s+to/i,
    /enables?\s+\w+/i,
    /provide\s+s?\w+/i,
    /support\s+for/i,
  ]
  return patterns.some(p => p.test(description))
}

export function containsPlaceholders(text: string): boolean {
  const patterns = [
    /\b(tbd|to be determined|todo|to do|fixme|fix me)\b/i,
    /\[.*\?.*\]/,
    /\{.*\?.*\}/,
    /coming soon/i,
    /not defined/i,
    /needs clarification/i,
    /placeholder/i,
    /xx+/i,
    /fill in/i,
    /specify later/i,
  ]
  return patterns.some(p => p.test(text))
}

export function findAmbiguousTerms(text: string): string[] {
  const terms = [
    'etc', 'etc.', 'and so on', 'various', 'some', 'many', 'several',
    'appropriate', 'relevant', 'as needed', 'when necessary',
    'depending on', 'flexible', 'scalable', 'robust', 'efficient',
    'user-friendly', 'easy to use', 'fast', 'quick', 'soon', 'later',
    'eventually', 'maybe', 'possibly', 'probably', 'usually',
    'generally', 'typically', 'often', 'sometimes',
  ]
  return terms.filter(term => 
    new RegExp(`\\b${term}\\b`, 'i').test(text)
  )
}

export function calculateGenericFieldRatio(fields: string[]): number {
  if (fields.length === 0) return 1
  const genericPatterns = [
    /^id$/i,
    /^userId$/i,
    /^title$/i,
    /^name$/i,
    /^status$/i,
    /^metadata$/i,
    /^createdAt$/i,
    /^updatedAt$/i,
    /^description$/i,
    /^type$/i,
    /^content$/i,
    /^data$/i,
    /^config$/i,
    /^settings$/i,
  ]
  const genericCount = fields.filter(f => 
    genericPatterns.some(p => p.test(f))
  ).length
  return genericCount / fields.length
}

// Quick validation check for integration with interview flow
export function quickCompletenessCheck(prd: unknown): {
  isComplete: boolean
  missing: string[]
  score: number
} {
  const missing: string[] = []
  let score = 100
  
  const p = prd as Record<string, unknown>
  
  if (!p.overview || (p.overview as string).length < 50) {
    missing.push('overview')
    score -= 20
  }
  
  if (!p.problemStatement) {
    missing.push('problemStatement')
    score -= 15
  }
  
  if (!Array.isArray(p.features) || p.features.length === 0) {
    missing.push('features')
    score -= 25
  } else {
    const features = p.features as Array<{ description?: string; userStories?: unknown[] }>
    const genericDescPatterns = [
      /core entity/i,
      /manages?\s+\w+/i,
      /handles?\s+\w+/i,
      /this feature/i,
      /allows?\s+users?\s+to/i,
      /enables?\s+\w+/i,
      /provide\s+s?\w+/i,
      /support\s+for/i,
    ]
    const genericFeatures = features.filter(f => 
      !f.description || 
      f.description.length < 50 ||
      genericDescPatterns.some(pattern => pattern.test(f.description || ''))
    )
    if (genericFeatures.length > 0) {
      missing.push(`${genericFeatures.length} features with generic descriptions`)
      score -= 10 * genericFeatures.length
    }
    
    const missingStories = features.filter(f => !f.userStories || f.userStories.length === 0)
    if (missingStories.length > 0) {
      missing.push(`${missingStories.length} features without user stories`)
      score -= 10 * missingStories.length
    }
  }
  
  return {
    isComplete: missing.length === 0 && score >= 70,
    missing,
    score: Math.max(0, score),
  }
}
