/**
 * Spec Generator - Main Exports
 * 
 * Exports both v2 (legacy) and v3 (improved) spec generators.
 * v3 includes PRD validation and produces more detailed specifications.
 */

// v2 Legacy System (kept for backwards compatibility)
export { SpecGenerator } from './generator'
export type { GeneratedPRD as GeneratedPRDv2, LLMPromptPayload } from './generator'

// v3 Improved System (recommended)
export { SpecGeneratorV3 } from './generator-v3'
export type { GeneratedPRD } from './generator-v3'
