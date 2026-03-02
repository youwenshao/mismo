/**
 * Interview State Machine v3
 * 
 * Key changes from v2:
 * - REMOVED: Time-based expiration logic
 * - REMOVED: Turn count limits
 * - REMOVED: Automatic transition pressure
 * - ADDED: Quality gates for each phase
 * - ADDED: Deep validation before completion
 * - ADDED: Explicit confirmation requirements
 */

import { InterviewState, type InterviewMessage, type SessionCheckpoint } from '@mismo/shared'
import { MO_V3_SYSTEM_PROMPT } from './prompts-v3'

export interface InterviewContextV3 {
  currentState: InterviewState
  currentPhase: InterviewPhase
  extractedData: Record<string, unknown>
  phaseQualityGates: PhaseQualityGates
  messages: InterviewMessage[]
  checkpoints: SessionCheckpoint[]
  startedAt: string
  // Removed: expiresAt - no time limit
  // Removed: turnCount - no turn limit
}

export type InterviewPhase = 
  | 'origin'      // Phase 1: The Origin Story
  | 'humans'      // Phase 2: The Humans Involved
  | 'journey'     // Phase 3: The Journey (Workflows)
  | 'feel'        // Phase 4: The Feel (Design)
  | 'reality'     // Phase 5: The Reality (Constraints)
  | 'validation'  // Phase 6: Validation & Synthesis
  | 'complete'

export interface PhaseQualityGates {
  origin: {
    hasSpecificStory: boolean
    hasPainPoint: boolean
    hasSuccessVision: boolean
  }
  humans: {
    userTypesIdentified: boolean
    hasUserGoals: boolean
    hasUserPainPoints: boolean
  }
  journey: {
    workflowsMapped: boolean
    hasHappyPath: boolean
    hasEdgeCases: boolean
  }
  feel: {
    emotionalToneIdentified: boolean
    hasReferences: boolean
    brandConstraintsKnown: boolean
  }
  reality: {
    scaleUnderstood: boolean
    integrationsKnown: boolean
    complianceIdentified: boolean
  }
  validation: {
    summaryConfirmed: boolean
    allFeaturesSpecific: boolean
    noVagueLanguage: boolean
  }
}

const META_REGEX = /\[META\]([\s\S]*?)\[\/META\]/

export class InterviewStateMachineV3 {
  private context: InterviewContextV3

  constructor() {
    this.context = {
      currentState: InterviewState.IN_PROGRESS,
      currentPhase: 'origin',
      extractedData: {},
      phaseQualityGates: this.initializeQualityGates(),
      messages: [],
      checkpoints: [],
      startedAt: new Date().toISOString(),
    }
  }

  static fromContext(ctx: InterviewContextV3): InterviewStateMachineV3 {
    const machine = new InterviewStateMachineV3()
    machine.context = {
      ...ctx,
      phaseQualityGates: ctx.phaseQualityGates || machine.initializeQualityGates(),
    }
    return machine
  }

  private initializeQualityGates(): PhaseQualityGates {
    return {
      origin: { hasSpecificStory: false, hasPainPoint: false, hasSuccessVision: false },
      humans: { userTypesIdentified: false, hasUserGoals: false, hasUserPainPoints: false },
      journey: { workflowsMapped: false, hasHappyPath: false, hasEdgeCases: false },
      feel: { emotionalToneIdentified: false, hasReferences: false, brandConstraintsKnown: false },
      reality: { scaleUnderstood: false, integrationsKnown: false, complianceIdentified: false },
      validation: { summaryConfirmed: false, allFeaturesSpecific: false, noVagueLanguage: false },
    }
  }

  get state(): InterviewState {
    return this.context.currentState
  }

  get phase(): InterviewPhase {
    return this.context.currentPhase
  }

  get isComplete(): boolean {
    return this.context.currentState === InterviewState.COMPLETE
  }

  // Removed: isExpired - no time limit

  getContext(): InterviewContextV3 {
    return { ...this.context }
  }

  getSystemPrompt(): string {
    return MO_V3_SYSTEM_PROMPT
  }

  addMessage(message: InterviewMessage): void {
    this.context.messages.push(message)
  }

  setExtractedData(key: string, value: unknown): void {
    this.context.extractedData[key] = value
  }

  /**
   * Update quality gate status
   */
  updateQualityGate(phase: InterviewPhase, gate: string, value: boolean): void {
    if (phase === 'complete') return
    
    const phaseGates = this.context.phaseQualityGates[phase]
    if (phaseGates && gate in phaseGates) {
      (phaseGates as Record<string, boolean>)[gate] = value
    }
  }

  /**
   * Check if current phase quality gates are satisfied
   */
  areCurrentPhaseGatesMet(): boolean {
    const phase = this.context.currentPhase
    if (phase === 'complete') return true
    
    const gates = this.context.phaseQualityGates[phase]
    if (!gates) return false
    
    return Object.values(gates).every(v => v === true)
  }

  /**
   * Get missing quality gates for current phase
   */
  getMissingGates(): string[] {
    const phase = this.context.currentPhase
    if (phase === 'complete') return []
    
    const gates = this.context.phaseQualityGates[phase]
    if (!gates) return []
    
    return Object.entries(gates)
      .filter(([, value]) => value === false)
      .map(([key]) => key)
  }

  /**
   * Advance to next phase if quality gates are met
   */
  advancePhase(): boolean {
    if (!this.areCurrentPhaseGatesMet()) {
      return false
    }

    const phaseOrder: InterviewPhase[] = [
      'origin', 'humans', 'journey', 'feel', 'reality', 'validation', 'complete'
    ]
    
    const currentIndex = phaseOrder.indexOf(this.context.currentPhase)
    if (currentIndex < phaseOrder.length - 1) {
      this.context.currentPhase = phaseOrder[currentIndex + 1]
      return true
    }
    
    return false
  }

  /**
   * Force complete the interview (with validation)
   */
  complete(): boolean {
    // Check if all phases have their gates met
    const allGatesMet = Object.entries(this.context.phaseQualityGates).every(([phase, gates]) => {
      if (phase === 'complete') return true
      return Object.values(gates).every(v => v === true)
    })

    if (allGatesMet) {
      this.context.currentState = InterviewState.COMPLETE
      this.context.currentPhase = 'complete'
      return true
    }

    return false
  }

  saveCheckpoint(): void {
    this.context.checkpoints.push({
      messageIndex: this.context.messages.length,
      context: JSON.parse(JSON.stringify({
        currentState: this.context.currentState,
        currentPhase: this.context.currentPhase,
        extractedData: this.context.extractedData,
        phaseQualityGates: this.context.phaseQualityGates,
      })),
      timestamp: new Date().toISOString(),
    })
  }

  rewindToCheckpoint(checkpointIndex: number): boolean {
    const checkpoint = this.context.checkpoints[checkpointIndex]
    if (!checkpoint) return false

    const saved = checkpoint.context as Record<string, unknown>
    this.context.currentState = saved.currentState as InterviewState
    this.context.currentPhase = saved.currentPhase as InterviewPhase
    this.context.extractedData = saved.extractedData as Record<string, unknown>
    this.context.phaseQualityGates = saved.phaseQualityGates as PhaseQualityGates
    this.context.messages = this.context.messages.slice(0, checkpoint.messageIndex)
    this.context.checkpoints = this.context.checkpoints.slice(0, checkpointIndex + 1)
    return true
  }

  /**
   * Parse metadata from LLM response and update context
   */
  parseAndStripMetadata(text: string): { 
    cleanText: string
    metadata: Record<string, unknown> | null 
    phaseInfo: {
      currentPhase: InterviewPhase
      gatesMet: boolean
      missingGates: string[]
    } | null
  } {
    const match = text.match(META_REGEX)
    if (!match) {
      return { 
        cleanText: text, 
        metadata: null,
        phaseInfo: null 
      }
    }

    try {
      const metadata = JSON.parse(match[1]) as Record<string, unknown>
      
      // Update extracted data
      if (metadata.extracted_insights) {
        this.context.extractedData = {
          ...this.context.extractedData,
          ...metadata.extracted_insights as Record<string, unknown>,
        }
      }

      // Update phase if specified
      if (metadata.current_phase) {
        const newPhase = metadata.current_phase as InterviewPhase
        if (newPhase !== this.context.currentPhase) {
          // Only advance if gates are met
          if (this.areCurrentPhaseGatesMet()) {
            this.context.currentPhase = newPhase
          }
        }
      }

      // Update quality gates if provided
      if (metadata.readiness_indicators) {
        const indicators = metadata.readiness_indicators as Record<string, boolean>
        this.updateGatesFromIndicators(indicators)
      }

      // Check for completion
      if (metadata.current_phase === 'complete' && this.areCurrentPhaseGatesMet()) {
        this.context.currentState = InterviewState.COMPLETE
      }

      const phaseInfo = {
        currentPhase: this.context.currentPhase,
        gatesMet: this.areCurrentPhaseGatesMet(),
        missingGates: this.getMissingGates(),
      }

      const cleanText = text.replace(META_REGEX, '').trim()
      return { cleanText, metadata, phaseInfo }
    } catch {
      const cleanText = text.replace(META_REGEX, '').trim()
      return { cleanText, metadata: null, phaseInfo: null }
    }
  }

  private updateGatesFromIndicators(indicators: Record<string, boolean>): void {
    const phase = this.context.currentPhase
    
    // Map indicators to gates based on current phase
    switch (phase) {
      case 'origin':
        if (indicators.has_specific_story) {
          this.updateQualityGate('origin', 'hasSpecificStory', true)
        }
        break
      case 'humans':
        if (indicators.has_user_types_defined) {
          this.updateQualityGate('humans', 'userTypesIdentified', true)
        }
        break
      case 'journey':
        if (indicators.has_concrete_workflows) {
          this.updateQualityGate('journey', 'workflowsMapped', true)
        }
        if (indicators.has_edge_cases_considered) {
          this.updateQualityGate('journey', 'hasEdgeCases', true)
        }
        break
    }
  }

  /**
   * Build the full system prompt with current context
   */
  buildFullSystemPrompt(): string {
    let prompt = MO_V3_SYSTEM_PROMPT

    // Add current phase context
    prompt += `\n\n### CURRENT PHASE\nYou are in Phase: ${this.context.currentPhase.toUpperCase()}`

    // Add quality gate status
    const missingGates = this.getMissingGates()
    if (missingGates.length > 0) {
      prompt += `\n\n### QUALITY GATES NOT YET MET\nBefore advancing, you MUST satisfy:\n${missingGates.map(g => `- ${g}`).join('\n')}`
    } else {
      prompt += `\n\n### QUALITY GATES MET\nAll gates for this phase are satisfied. You may advance to the next phase when ready.`
    }

    // Add extracted data context
    if (Object.keys(this.context.extractedData).length > 0) {
      prompt += `\n\n### EXTRACTED INSIGHTS (Do not lose this context)\n${JSON.stringify(this.context.extractedData, null, 2)}`
    }

    // Add elapsed time info (for context, not pressure)
    const elapsedMinutes = Math.round(
      (Date.now() - new Date(this.context.startedAt).getTime()) / 60000
    )
    prompt += `\n\n### INTERVIEW DURATION\n${elapsedMinutes} minutes elapsed. Remember: quality over speed. Continue until quality gates are met.`

    return prompt
  }

  /**
   * Get suggested next questions based on current state
   */
  getSuggestedQuestions(): string[] {
    const phase = this.context.currentPhase
    const missingGates = this.getMissingGates()

    // Map missing gates to suggested questions
    const questionMap: Record<string, Record<string, string[]>> = {
      origin: {
        hasSpecificStory: [
          'Tell me about a specific time this problem happened recently.',
          'Walk me through exactly what went wrong.',
        ],
        hasPainPoint: [
          'What does this problem cost you? Time, money, stress?',
          'How often does this happen?',
        ],
        hasSuccessVision: [
          'Imagine this is working perfectly. What does that look like?',
          'How will you know this project is successful?',
        ],
      },
      humans: {
        userTypesIdentified: [
          'Who exactly will use this system?',
          'Tell me about the different types of people involved.',
        ],
        hasUserGoals: [
          'What is each person trying to accomplish?',
          'What does success look like for them?',
        ],
        hasUserPainPoints: [
          'What frustrates each type of user about the current process?',
          'Tell me about a time a user struggled.',
        ],
      },
      journey: {
        workflowsMapped: [
          'Walk me through the exact steps someone takes.',
          'What happens first, then what, then what?',
        ],
        hasHappyPath: [
          'Describe the ideal scenario from start to finish.',
        ],
        hasEdgeCases: [
          'What if they need to change their mind halfway through?',
          'What if something goes wrong?',
        ],
      },
      feel: {
        emotionalToneIdentified: [
          'How should people feel when using this?',
          'What adjectives describe the experience?',
        ],
        hasReferences: [
          'Are there apps or websites you admire?',
          'What should this feel similar to?',
        ],
        brandConstraintsKnown: [
          'Do you have existing brand guidelines?',
          'Are there colors, fonts, or styles you must use?',
        ],
      },
      reality: {
        scaleUnderstood: [
          'How many people will use this?',
          'How much data will you have?',
        ],
        integrationsKnown: [
          'What tools do you currently use?',
          'What does this need to connect to?',
        ],
        complianceIdentified: [
          'Do you handle sensitive data?',
          'Are there industry regulations?',
        ],
      },
      validation: {
        summaryConfirmed: [
          'Let me summarize what I understand. Does this capture it?',
        ],
        allFeaturesSpecific: [
          'Tell me more about how [feature] works.',
          'What exactly can users do with [feature]?',
        ],
        noVagueLanguage: [
          'When you say "manage", what specific actions are involved?',
          'Can you be more specific about what "handle" means?',
        ],
      },
    }

    const phaseQuestions = questionMap[phase] || {}
    const suggestions: string[] = []

    for (const gate of missingGates) {
      const questions = phaseQuestions[gate as keyof typeof phaseQuestions]
      if (questions) {
        suggestions.push(...questions)
      }
    }

    return suggestions.slice(0, 3) // Return top 3 suggestions
  }
}
