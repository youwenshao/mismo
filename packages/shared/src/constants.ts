export const INTERVIEW_TIME_LIMIT_MS = 15 * 60 * 1000 // 15 minutes
export const INTERVIEW_REMINDER_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Service tier names: Source (code handover), Deploy (white-glove + retainer), Onsite (hardware)
 * All pricing in HKD cents (1 HKD = 100 cents)
 */
export const SERVICE_TIERS = {
  SOURCE: { id: 'SOURCE', name: 'Source', nameCn: '源碼', tagline: 'You build it' },
  DEPLOY: { id: 'DEPLOY', name: 'Deploy', nameCn: '託管', tagline: 'We run it' },
  ONSITE: { id: 'ONSITE', name: 'Onsite', nameCn: '實體', tagline: 'We bring it' },
} as const

export const SOURCE_TIER_PRICING = {
  VIBE: { amount: 15_600_00, label: 'Source — Vibe', timeline: '2 weeks', features: 3 },
  VERIFIED: { amount: 62_400_00, label: 'Source — Verified', timeline: '4 weeks', features: 6 },
  FOUNDRY: { amount: 195_000_00, label: 'Source — Foundry', timeline: '8 weeks', features: -1 },
} as const

export const DEPLOY_BASE_MULTIPLIER = 1.25

export const DEPLOY_RETAINER_PRICING = {
  ESSENTIAL: { amount: 3_000_00, label: 'Essential', sla: 'Quarterly updates' },
  PROFESSIONAL: { amount: 5_000_00, label: 'Professional', sla: 'Monthly updates' },
  PRIORITY: { amount: 8_000_00, label: 'Priority', sla: '4-hour response SLA' },
} as const

export const ONSITE_PRICING = {
  SMALL: {
    amount: 24_900_00,
    label: 'Onsite — Small',
    retainer: 6_000_00,
    hw: 'Mac mini M4 16GB/256GB',
  },
  MEDIUM: {
    amount: 26_900_00,
    label: 'Onsite — Medium',
    retainer: 8_000_00,
    hw: 'Mac mini M4 16GB/512GB',
  },
  LARGE: {
    amount: 36_900_00,
    label: 'Onsite — Large',
    retainer: 12_000_00,
    hw: 'iMac 24" M4 24GB/512GB',
  },
} as const

/** @deprecated Use SOURCE_TIER_PRICING instead */
export const SERVICE_TIER_PRICING = {
  VIBE: 15_600,
  VERIFIED: 62_400,
  FOUNDRY: 195_000,
} as const

export const HOSTING_MONTHLY_PRICING = {
  min: 3_000,
  max: 12_000,
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
    SERVERLESS_SAAS: 1.0,
    MONOLITHIC_MVP: 1.1,
    MICROSERVICES_SCALE: 1.4,
  },
  complianceAddon: {
    hipaa: 0.2,
    financial: 0.2,
    childrenData: 0.15,
    governmentId: 0.1,
  },
  languageAddon: {
    zhHantTw: 0.08,
  },
  hardwareMarkup: 0.175,
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
    models: [{ id: 'kimi-k2', name: 'Kimi K2', default: true }],
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

export const ALERT_PRIORITY = {
  P0: 'P0',
  P1: 'P1',
  P2: 'P2',
} as const

export const ALERT_CATEGORY = {
  RESOURCE: 'RESOURCE',
  API: 'API',
  BUILD: 'BUILD',
  SECURITY: 'SECURITY',
  BACKUP: 'BACKUP',
} as const

export const FARM_THRESHOLDS = {
  RAM_WARN_PERCENT: 85,
  RAM_WARN_DURATION_MS: 5 * 60_000,
  DISK_CRITICAL_PERCENT: 90,
  CPU_CRITICAL_PERCENT: 95,
  CPU_CRITICAL_DURATION_MS: 10 * 60_000,
  KIMI_LATENCY_THRESHOLD_MS: 3_000,
  SUPABASE_RETRY_INTERVAL_MS: 30_000,
  BUILD_MAX_RETRIES: 3,
  BUILD_STUCK_TIMEOUT_MS: 60 * 60_000,
  SUCCESS_RATE_CRITICAL: 0.8,
  SUCCESS_RATE_WINDOW_MS: 60 * 60_000,
  CRED_ROTATION_WARNING_DAYS: 30,
  WORKER_RESTART_THRESHOLD: 5,
  WORKER_RESTART_WINDOW_MS: 10 * 60_000,
  GITHUB_RATE_LIMIT_MIN: 100,
} as const

export const STUDIOS = {
  STUDIO_1: { id: 'studio-1', role: 'control-plane' },
  STUDIO_2: { id: 'studio-2', role: 'worker' },
  STUDIO_3: { id: 'studio-3', role: 'worker' },
} as const

export const FLEET_CONFIG = {
  'studio-1': {
    id: 'studio-1',
    name: 'Studio 1 (Main)',
    role: 'control-plane' as const,
    chip: 'M4 Max',
    ram: '48 GB',
    workerConcurrency: 0,
    services: [
      'n8n-main',
      'PostgreSQL',
      'Redis',
      'BMAD-Validator',
      'GSD-Dependency',
      'Farm-Monitor',
      'Docker Registry',
    ],
  },
  'studio-2': {
    id: 'studio-2',
    name: 'Studio 2 (Build)',
    role: 'worker' as const,
    chip: 'M2 Ultra',
    ram: '64 GB',
    workerConcurrency: 25,
    services: ['n8n-worker', 'Contract-Checker'],
  },
  'studio-3': {
    id: 'studio-3',
    name: 'Studio 3 (QA)',
    role: 'worker' as const,
    chip: 'M2 Ultra',
    ram: '64 GB',
    workerConcurrency: 25,
    services: ['n8n-worker', 'Contract-Checker'],
  },
} as const

export const FLEET_STALENESS_THRESHOLD_MS = 5 * 60_000

export const CAPACITY_THRESHOLDS = {
  QUEUE_DEPTH_SCALE_TRIGGER: 20,
  QUEUE_DEPTH_SCALE_DURATION_MS: 60 * 60_000,
  DAILY_BUILD_CAPACITY_WARNING: 40,
} as const
