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
