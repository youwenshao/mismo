/**
 * Mo Interview System - Main Exports
 * 
 * Exports both v2 (legacy) and v3 (improved) interview systems.
 * v3 is recommended for new interviews as it produces higher quality PRDs.
 */

// v2 Legacy System (kept for backwards compatibility)
export { InterviewStateMachine } from './state-machine'
export { MO_V2_SYSTEM_PROMPT } from './prompts'

// v3 Improved System (recommended)
export { InterviewStateMachineV3 } from './state-machine-v3'
export { MO_V3_SYSTEM_PROMPT } from './prompts-v3'
export type { InterviewContextV3, InterviewPhase, PhaseQualityGates } from './state-machine-v3'

// Re-export shared types
export type { InterviewContext } from './state-machine'
