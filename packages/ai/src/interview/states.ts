import { InterviewState } from '@mismo/shared'
import { STATE_PROMPTS } from './prompts'

export interface StateConfig {
  id: InterviewState
  systemPrompt: string
  extractionGoals: string[]
  maxTurns: number
  nextState: InterviewState | null
}

export const INTERVIEW_STATES: Record<InterviewState, StateConfig> = {
  [InterviewState.GREETING]: {
    id: InterviewState.GREETING,
    systemPrompt: STATE_PROMPTS.GREETING,
    extractionGoals: ['projectName', 'initialDescription'],
    maxTurns: 3,
    nextState: InterviewState.PROBLEM_DEFINITION,
  },
  [InterviewState.PROBLEM_DEFINITION]: {
    id: InterviewState.PROBLEM_DEFINITION,
    systemPrompt: STATE_PROMPTS.PROBLEM_DEFINITION,
    extractionGoals: ['problemStatement', 'currentSolutions', 'uniqueValue'],
    maxTurns: 5,
    nextState: InterviewState.TARGET_USERS,
  },
  [InterviewState.TARGET_USERS]: {
    id: InterviewState.TARGET_USERS,
    systemPrompt: STATE_PROMPTS.TARGET_USERS,
    extractionGoals: ['primaryUsers', 'demographics', 'expectedVolume'],
    maxTurns: 4,
    nextState: InterviewState.FEATURE_EXTRACTION,
  },
  [InterviewState.FEATURE_EXTRACTION]: {
    id: InterviewState.FEATURE_EXTRACTION,
    systemPrompt: STATE_PROMPTS.FEATURE_EXTRACTION,
    extractionGoals: ['features', 'featurePriorities'],
    maxTurns: 8,
    nextState: InterviewState.TECHNICAL_TRADEOFFS,
  },
  [InterviewState.TECHNICAL_TRADEOFFS]: {
    id: InterviewState.TECHNICAL_TRADEOFFS,
    systemPrompt: STATE_PROMPTS.TECHNICAL_TRADEOFFS,
    extractionGoals: ['archPreference', 'scalabilityNeeds', 'complexityTolerance'],
    maxTurns: 4,
    nextState: InterviewState.MONETIZATION,
  },
  [InterviewState.MONETIZATION]: {
    id: InterviewState.MONETIZATION,
    systemPrompt: STATE_PROMPTS.MONETIZATION,
    extractionGoals: ['businessModel', 'pricingStrategy', 'paymentNeeds'],
    maxTurns: 4,
    nextState: InterviewState.COMPLIANCE_CHECK,
  },
  [InterviewState.COMPLIANCE_CHECK]: {
    id: InterviewState.COMPLIANCE_CHECK,
    systemPrompt: STATE_PROMPTS.COMPLIANCE_CHECK,
    extractionGoals: ['dataTypes', 'regulatoryDomains', 'contentTypes'],
    maxTurns: 3,
    nextState: InterviewState.SUMMARY,
  },
  [InterviewState.SUMMARY]: {
    id: InterviewState.SUMMARY,
    systemPrompt: STATE_PROMPTS.SUMMARY,
    extractionGoals: ['userConfirmation'],
    maxTurns: 3,
    nextState: InterviewState.FEASIBILITY_AND_PRICING,
  },
  [InterviewState.FEASIBILITY_AND_PRICING]: {
    id: InterviewState.FEASIBILITY_AND_PRICING,
    systemPrompt: STATE_PROMPTS.FEASIBILITY_AND_PRICING,
    extractionGoals: ['priceAccepted'],
    maxTurns: 4,
    nextState: InterviewState.CONFIRMATION,
  },
  [InterviewState.CONFIRMATION]: {
    id: InterviewState.CONFIRMATION,
    systemPrompt: STATE_PROMPTS.CONFIRMATION,
    extractionGoals: ['finalConfirmation'],
    maxTurns: 2,
    nextState: InterviewState.COMPLETE,
  },
  [InterviewState.COMPLETE]: {
    id: InterviewState.COMPLETE,
    systemPrompt: STATE_PROMPTS.COMPLETE,
    extractionGoals: [],
    maxTurns: 0,
    nextState: null,
  },
}
