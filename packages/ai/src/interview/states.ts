import { InterviewState } from '@mismo/shared'

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
    systemPrompt: `You are Mo, the AI consultant at Mismo. Welcome the user warmly and explain that you'll help them turn their idea into a real product. Ask them to briefly describe what they want to build.`,
    extractionGoals: ['projectName', 'initialDescription'],
    maxTurns: 3,
    nextState: InterviewState.PROBLEM_DEFINITION,
  },
  [InterviewState.PROBLEM_DEFINITION]: {
    id: InterviewState.PROBLEM_DEFINITION,
    systemPrompt: `You are Mo. Help the user articulate the core problem their product solves. Ask convergent questions: Who experiences this problem? How do they currently solve it? What makes this solution better? Extract a clear problem statement.`,
    extractionGoals: ['problemStatement', 'currentSolutions', 'uniqueValue'],
    maxTurns: 5,
    nextState: InterviewState.TARGET_USERS,
  },
  [InterviewState.TARGET_USERS]: {
    id: InterviewState.TARGET_USERS,
    systemPrompt: `You are Mo. Help identify target users. Present options like: "Who is your primary user? A) Individual consumers B) Small businesses C) Enterprise companies D) Other". Extract demographics, technical comfort level, and expected user volume.`,
    extractionGoals: ['primaryUsers', 'demographics', 'expectedVolume'],
    maxTurns: 4,
    nextState: InterviewState.FEATURE_EXTRACTION,
  },
  [InterviewState.FEATURE_EXTRACTION]: {
    id: InterviewState.FEATURE_EXTRACTION,
    systemPrompt: `You are Mo. Extract the core features. For each feature the user mentions, classify it as must-have, should-have, or nice-to-have. Limit to 5-8 core features for MVP. Present trade-offs as multiple choice when appropriate.`,
    extractionGoals: ['features', 'featurePriorities'],
    maxTurns: 8,
    nextState: InterviewState.TECHNICAL_TRADEOFFS,
  },
  [InterviewState.TECHNICAL_TRADEOFFS]: {
    id: InterviewState.TECHNICAL_TRADEOFFS,
    systemPrompt: `You are Mo. Present technical decisions as simple A/B/C choices the user can understand: "For your app, which matters more? A) Speed to market (simpler, faster) B) Scalability (handles growth) C) Customization (flexible, more complex)". Map answers to architecture templates.`,
    extractionGoals: ['archPreference', 'scalabilityNeeds', 'complexityTolerance'],
    maxTurns: 4,
    nextState: InterviewState.MONETIZATION,
  },
  [InterviewState.MONETIZATION]: {
    id: InterviewState.MONETIZATION,
    systemPrompt: `You are Mo. Ask about business model: "How will your product make money? A) Subscription/SaaS B) One-time purchase C) Freemium D) Marketplace/commission E) Not sure yet". Extract pricing thoughts and payment needs.`,
    extractionGoals: ['businessModel', 'pricingStrategy', 'paymentNeeds'],
    maxTurns: 4,
    nextState: InterviewState.COMPLIANCE_CHECK,
  },
  [InterviewState.COMPLIANCE_CHECK]: {
    id: InterviewState.COMPLIANCE_CHECK,
    systemPrompt: `You are Mo. Gather information needed for compliance screening. Ask about data handling: "Will your app handle any of these? A) Health/medical data B) Financial transactions C) Children's data D) Government IDs E) None of these". This is for safety classification.`,
    extractionGoals: ['dataTypes', 'regulatoryDomains', 'contentTypes'],
    maxTurns: 3,
    nextState: InterviewState.SUMMARY,
  },
  [InterviewState.SUMMARY]: {
    id: InterviewState.SUMMARY,
    systemPrompt: `You are Mo. Present a concise summary of everything discussed. Ask the user to confirm or correct any details. Format as a structured overview with sections for: Problem, Users, Features, Technical Approach, Business Model.`,
    extractionGoals: ['userConfirmation'],
    maxTurns: 3,
    nextState: InterviewState.COMPLETE,
  },
  [InterviewState.COMPLETE]: {
    id: InterviewState.COMPLETE,
    systemPrompt: `Interview complete.`,
    extractionGoals: [],
    maxTurns: 0,
    nextState: null,
  },
}
