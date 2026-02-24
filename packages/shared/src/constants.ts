export const INTERVIEW_TIME_LIMIT_MS = 15 * 60 * 1000 // 15 minutes

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
