import type { PRDContent, PRDFeature, UserStory } from '@mismo/shared'

/**
 * Criterion for checking if content is sufficient
 */
export interface SufficientCriterion {
  id: string
  name: string
  weight: number
  check: (value: unknown) => boolean
  evaluate: (value: unknown) => { passed: boolean; score: number; details: string }
}

/**
 * Gate for checking clarity
 */
export interface ClarityGate {
  id: string
  name: string
  test: (text: string) => { passed: boolean; issues: string[] }
}

/**
 * Indicator for technical feasibility
 */
export interface FeasibilityIndicator {
  id: string
  name: string
  category: 'scale' | 'integration' | 'complexity' | 'performance' | 'security'
  extract: (prd: unknown) => { present: boolean; value: unknown; confidence: number }
}

/**
 * Pattern for detecting incomplete specifications
 */
export interface IncompletePattern {
  id: string
  name: string
  pattern: RegExp
  severity: ValidationSeverity
  message: string
  suggestion: string
}

/**
 * Question for validation
 */
export interface ValidationQuestion {
  id: string
  category: string
  question: string
  whyItMatters: string
  whenToAsk: 'always' | 'if-unclear' | 'for-must-have'
  passCriteria: string
  exampleGoodAnswer: string
  exampleBadAnswer: string
}

/**
 * Severity levels for validation issues
 */
export enum ValidationSeverity {
  CRITICAL = 'critical',   // Blocks implementation entirely
  HIGH = 'high',          // Major gaps, high risk of incorrect implementation
  MEDIUM = 'medium',      // Important details missing, some assumptions needed
  LOW = 'low',            // Minor improvements suggested
  INFO = 'info',          // Observations, not blocking
}

/**
 * Categories for validation issues
 */
export enum ValidationCategory {
  SYNTACTIC = 'syntactic',       // Schema/structure issues
  SEMANTIC = 'semantic',         // Content quality issues
  COMPLETENESS = 'completeness', // Missing required information
  CLARITY = 'clarity',           // Ambiguity issues
  FEASIBILITY = 'feasibility',   // Technical viability concerns
}

/**
 * A single validation issue
 */
export interface ValidationIssue {
  id: string
  severity: ValidationSeverity
  category: ValidationCategory
  feature?: string
  field?: string
  message: string
  details?: string
  suggestion: string
  examples?: {
    bad?: string
    good?: string
  }
}

/**
 * A follow-up question for the interviewer to ask
 */
export interface FollowUpQuestion {
  id: string
  priority: 'must-answer' | 'should-answer' | 'nice-to-have'
  category: string
  question: string
  context: string
  targetField?: string
  exampleAnswer?: string
}

/**
 * Feature-level validation result
 */
export interface FeatureValidationResult {
  feature: PRDFeature
  score: number
  isComplete: boolean
  issues: ValidationIssue[]
  completeness: {
    hasDescription: boolean
    hasUserStories: boolean
    hasBusinessRules: boolean
    hasDataModel: boolean
    hasApiSpec: boolean
    hasUiSpec: boolean
  }
}

/**
 * Data model validation result
 */
export interface DataModelValidationResult {
  score: number
  issues: ValidationIssue[]
  entities: Array<{
    name: string
    isComplete: boolean
    hasId: boolean
    hasTimestamps: boolean
    fieldCount: number
    genericFieldRatio: number
    issues: ValidationIssue[]
  }>
}

/**
 * API specification validation result
 */
export interface ApiSpecValidationResult {
  score: number
  issues: ValidationIssue[]
  endpoints: Array<{
    path: string
    method: string
    isDocumented: boolean
    hasRequestSchema: boolean
    hasResponseSchema: boolean
    hasErrorHandling: boolean
  }>
}

/**
 * Business logic validation result
 */
export interface BusinessLogicValidationResult {
  score: number
  issues: ValidationIssue[]
  rules: Array<{
    feature: string
    rule: string
    isQuantified: boolean
    hasConditions: boolean
    hasTriggers: boolean
  }>
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  isValid: boolean
  isImplementable: boolean
  implementabilityScore: number
  
  // Component scores (0-100)
  scores: {
    overall: number
    syntactic: number
    semantic: number
    completeness: number
    clarity: number
    feasibility: number
    features: number
    dataModel: number
    apiSpec: number
    businessLogic: number
  }
  
  // Detailed results
  issues: ValidationIssue[]
  featureResults: FeatureValidationResult[]
  dataModelResult: DataModelValidationResult
  apiSpecResult: ApiSpecValidationResult
  businessLogicResult: BusinessLogicValidationResult
  
  // Follow-up actions
  followUpQuestions: FollowUpQuestion[]
  requiredInterviewerActions: string[]
  
  // Metadata
  validatedAt: string
  validatorVersion: string
}

/**
 * Validation configuration options
 */
export interface ValidationConfig {
  // Thresholds
  minImplementabilityScore: number
  maxCriticalIssues: number
  maxHighIssues: number
  
  // Feature requirements
  minUserStoriesPerMustHaveFeature: number
  minUserStoriesPerShouldHaveFeature: number
  minDescriptionLength: number
  
  // Data model requirements
  minFieldsPerEntity: number
  maxGenericFieldRatio: number
  
  // Business logic
  requireQuantifiedRules: boolean
  requireStateTransitions: boolean
  
  // API specifications
  requireApiDocumentation: boolean
  requireErrorHandling: boolean
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  minImplementabilityScore: 75,
  maxCriticalIssues: 0,
  maxHighIssues: 3,
  minUserStoriesPerMustHaveFeature: 2,
  minUserStoriesPerShouldHaveFeature: 1,
  minDescriptionLength: 50,
  minFieldsPerEntity: 3,
  maxGenericFieldRatio: 0.4,
  requireQuantifiedRules: true,
  requireStateTransitions: true,
  requireApiDocumentation: true,
  requireErrorHandling: true,
}

/**
 * Generic field patterns that indicate under-specification
 */
export const GENERIC_FIELD_PATTERNS = [
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

/**
 * Generic description patterns that indicate under-specification
 */
export const GENERIC_DESCRIPTION_PATTERNS = [
  /core entity/i,
  /manages?\s+\w+/i,
  /handles?\s+\w+/i,
  /this feature/i,
  /allows?\s+users?\s+to/i,
  /enables?\s+\w+/i,
  /provide\s+s?\w+/i,
  /support\s+for/i,
]

/**
 * Ambiguous terms that require clarification
 */
export const AMBIGUOUS_TERMS = [
  'etc',
  'etc.',
  'and so on',
  'various',
  'some',
  'many',
  'several',
  'appropriate',
  'relevant',
  'as needed',
  'when necessary',
  'depending on',
  'flexible',
  'scalable',
  'robust',
  'efficient',
  'user-friendly',
  'easy to use',
  'fast',
  'quick',
  'soon',
  'later',
  'eventually',
  'maybe',
  'possibly',
  'probably',
  'usually',
  'generally',
  'typically',
  'often',
  'sometimes',
]

/**
 * Placeholder patterns indicating incomplete specification
 */
export const PLACEHOLDER_PATTERNS = [
  /\b(tbd|to be determined|todo|to do|fixme|fix me)\b/i,
  /\[.*\?.*\]/,  // [?], [what?], [unknown]
  /\{.*\?.*\}/,  // {?}, {unknown}
  /coming soon/i,
  /not defined/i,
  /needs clarification/i,
  /placeholder/i,
  /xx+/i,  // xxx, xxxx
  /fill in/i,
  /specify later/i,
]
