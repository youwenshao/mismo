export const INTERVIEW_TIME_LIMIT_MS = 15 * 60 * 1000 // 15 minutes
export const INTERVIEW_REMINDER_MS = 10 * 60 * 1000 // 10 minutes

export const SERVICE_TIER_PRICING = {
  VIBE: 2_000,
  VERIFIED: 8_000,
  FOUNDRY: 25_000,
} as const

export const HOSTING_MONTHLY_PRICING = {
  min: 50,
  max: 200,
} as const

export const TOKEN_BUDGET_PER_FEATURE = 100_000

export const MAX_CURSOR_CLARIFICATIONS = 3
export const MAX_CONSECUTIVE_BUILD_FAILURES = 3

export const AMBIGUITY_THRESHOLD = 0.2 // 20%

export const SLA = {
  specGenerationHours: 24,
  devReviewBusinessDays: 2,
  codeGenerationBusinessDays: { min: 5, max: 10 },
  clientAcceptanceBusinessDays: 3,
  freeRevisionCycles: 2,
} as const

export const LIGHTHOUSE_THRESHOLD = 90

export const TECHNICAL_DEBT_LEVELS = {
  L1: 'Cosmetic',
  L2: 'Performance',
  L3: 'Architectural',
} as const

export const PRICING = {
  baseFeatureCount: 3,
  perExtraFeaturePercent: 0.12,
  architectureMultiplier: {
    MARKETING: 1.0,
    SAAS: 1.2,
    PIPELINE: 1.3,
    INTEGRATION: 1.2,
    AI: 1.5,
    INTERACTIVE: 1.4,
    COMPLIANCE: 1.5,
  },
  complianceAddon: {
    healthcare: 0.2,
    financial: 0.2,
    childrenData: 0.15,
    governmentId: 0.1,
  },
  marginBias: 0.15,
} as const

export const READINESS_THRESHOLD = 85

export const MODEL_PROVIDERS = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3 Chat', default: true },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
    ],
    envKey: 'DEEPSEEK_API_KEY',
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi (Moonshot)',
    models: [
      { id: 'kimi-k2', name: 'Kimi K2', default: true },
    ],
    envKey: 'KIMI_API_KEY',
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    models: [
      { id: 'MiniMax-M2.5', name: 'MiniMax M2.5', default: true },
      { id: 'MiniMax-M2', name: 'MiniMax M2' },
    ],
    envKey: 'MINIMAX_API_KEY',
  },
  zai: {
    id: 'zai',
    name: 'Z.ai (Zhipu)',
    models: [
      { id: 'glm-5', name: 'GLM-5', default: true },
      { id: 'glm-4.5', name: 'GLM-4.5' },
    ],
    envKey: 'ZAI_API_KEY',
  },
} as const
