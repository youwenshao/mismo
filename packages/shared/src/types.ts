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
  MARKETING = 'MARKETING',
  SAAS = 'SAAS',
  PIPELINE = 'PIPELINE',
  INTEGRATION = 'INTEGRATION',
  AI = 'AI',
  INTERACTIVE = 'INTERACTIVE',
  COMPLIANCE = 'COMPLIANCE',
}

export enum InterviewState {
  IN_PROGRESS = 'IN_PROGRESS',
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
  readiness_score: number
  current_phase: string
  technical_profile: Record<string, any>
  next_questions: string[]
  missing_critical: string[]
  prer_draft: string
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

// API Specification types for PRD
export interface APISpec {
  version: string
  baseUrl: string
  authentication: string
  endpoints: APIEndpoint[]
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  description: string
  auth: string
  request?: {
    query?: string[]
    body?: APIField[]
  }
  response: {
    type: string
    items?: string
  }
}

export interface APIField {
  field: string
  type: string
  required: boolean
}
