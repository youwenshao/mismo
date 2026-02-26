export enum Role {
  CLIENT = 'CLIENT',
  ENGINEER = 'ENGINEER',
  ADMIN = 'ADMIN',
}

export enum AgeTier {
  MINOR = 'MINOR',
  ADULT = 'ADULT',
}

export enum ProjectStatus {
  DISCOVERY = 'DISCOVERY',
  REVIEW = 'REVIEW',
  CONTRACTED = 'CONTRACTED',
  DEVELOPMENT = 'DEVELOPMENT',
  VERIFICATION = 'VERIFICATION',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum ServiceTier {
  VIBE = 'VIBE',
  VERIFIED = 'VERIFIED',
  FOUNDRY = 'FOUNDRY',
}

export enum SafetyTier {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
}

export enum ArchTemplate {
  SERVERLESS_SAAS = 'SERVERLESS_SAAS',
  MONOLITHIC_MVP = 'MONOLITHIC_MVP',
  MICROSERVICES_SCALE = 'MICROSERVICES_SCALE',
}

export enum InterviewState {
  GREETING = 'GREETING',
  PROBLEM_DEFINITION = 'PROBLEM_DEFINITION',
  TARGET_USERS = 'TARGET_USERS',
  FEATURE_EXTRACTION = 'FEATURE_EXTRACTION',
  TECHNICAL_TRADEOFFS = 'TECHNICAL_TRADEOFFS',
  MONETIZATION = 'MONETIZATION',
  COMPLIANCE_CHECK = 'COMPLIANCE_CHECK',
  SUMMARY = 'SUMMARY',
  FEASIBILITY_AND_PRICING = 'FEASIBILITY_AND_PRICING',
  CONFIRMATION = 'CONFIRMATION',
  COMPLETE = 'COMPLETE',
}

export interface InterviewMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface PRDContent {
  overview: string
  problemStatement: string
  targetUsers: string
  features: PRDFeature[]
  monetization: string
  constraints: string[]
}

export interface PRDFeature {
  name: string
  description: string
  priority: 'must-have' | 'should-have' | 'nice-to-have'
  userStories: UserStory[]
}

export interface UserStory {
  title: string
  given: string
  when: string
  then: string
}

export interface SafetyClassification {
  tier: SafetyTier
  reasons: string[]
  flaggedKeywords: string[]
  llmReasoning: string
}

export interface PriceEstimate {
  tierRecommendation: ServiceTier
  priceRange: { min: number; max: number }
  breakdown: {
    basePrice: number
    featureComplexity: number
    architectureMultiplier: number
    complianceAddon: number
    hostingMonthly: { min: number; max: number }
  }
  estimatedTimeline: { min: number; max: number }
  difficultyScore: number
  feasibilityNotes: string[]
}

export interface ModelProviderConfig {
  id: string
  name: string
  models: Array<{ id: string; name: string; default?: boolean }>
  envKey: string
}

export interface ReadinessMetadata {
  readiness: number
  missing: string[]
}

export interface ChoiceOption {
  label: string
  description: string
}

export interface SessionCheckpoint {
  messageIndex: number
  context: Record<string, unknown>
  timestamp: string
}
