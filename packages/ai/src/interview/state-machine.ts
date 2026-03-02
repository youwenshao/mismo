import { InterviewState, INTERVIEW_REMINDER_MS, type InterviewMessage, type SessionCheckpoint, type ReadinessMetadata } from '@mismo/shared'
import { MO_V2_SYSTEM_PROMPT } from './prompts'

export interface InterviewContext {
  currentState: InterviewState
  extractedData: Record<string, unknown>
  readinessScore: number
  turnCount: number
  totalTurnCount: number
  messages: InterviewMessage[]
  checkpoints: SessionCheckpoint[]
  startedAt: string
  expiresAt: string
}

const META_REGEX = /\[META\]([\s\S]*?)\[\/META\]/
const CHOICES_REGEX = /\[CHOICES\]([\s\S]*?)\[\/CHOICES\]/gi

export class InterviewStateMachine {
  private context: InterviewContext

  constructor(expiresAt: Date) {
    this.context = {
      currentState: InterviewState.IN_PROGRESS,
      extractedData: {},
      readinessScore: 0,
      turnCount: 0,
      totalTurnCount: 0,
      messages: [],
      checkpoints: [],
      startedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    }
  }

  static fromContext(ctx: InterviewContext): InterviewStateMachine {
    const machine = new InterviewStateMachine(new Date(ctx.expiresAt))
    machine.context = {
      ...ctx,
      readinessScore: ctx.readinessScore ?? 0,
      checkpoints: ctx.checkpoints ?? [],
    }
    return machine
  }

  get state(): InterviewState {
    return this.context.currentState
  }

  get isComplete(): boolean {
    return this.context.currentState === InterviewState.COMPLETE
  }

  get isExpired(): boolean {
    return new Date() >= new Date(this.context.expiresAt)
  }

  getContext(): InterviewContext {
    return { ...this.context }
  }

  getSystemPrompt(): string {
    return MO_V2_SYSTEM_PROMPT
  }

  addMessage(message: InterviewMessage): void {
    this.context.messages.push(message)
    if (message.role === 'user') {
      this.context.turnCount++
      this.context.totalTurnCount++
    }
  }

  setExtractedData(key: string, value: unknown): void {
    this.context.extractedData[key] = value
  }

  saveCheckpoint(): void {
    this.context.checkpoints.push({
      messageIndex: this.context.messages.length,
      context: JSON.parse(JSON.stringify({
        currentState: this.context.currentState,
        extractedData: this.context.extractedData,
        readinessScore: this.context.readinessScore,
        turnCount: this.context.turnCount,
        totalTurnCount: this.context.totalTurnCount,
      })),
      timestamp: new Date().toISOString(),
    })
  }

  rewindToCheckpoint(checkpointIndex: number): boolean {
    const checkpoint = this.context.checkpoints[checkpointIndex]
    if (!checkpoint) return false

    const saved = checkpoint.context as Record<string, unknown>
    this.context.currentState = saved.currentState as InterviewState
    this.context.extractedData = saved.extractedData as Record<string, unknown>
    this.context.readinessScore = (saved.readinessScore as number) ?? 0
    this.context.turnCount = saved.turnCount as number
    this.context.totalTurnCount = saved.totalTurnCount as number
    this.context.messages = this.context.messages.slice(0, checkpoint.messageIndex)
    this.context.checkpoints = this.context.checkpoints.slice(0, checkpointIndex + 1)
    return true
  }

  parseAndStripMetadata(text: string): { cleanText: string; metadata: ReadinessMetadata | null } {
    const match = text.match(META_REGEX)
    if (!match) return { cleanText: text, metadata: null }

    try {
      const metadata = JSON.parse(match[1]) as ReadinessMetadata
      
      this.context.readinessScore = metadata.readiness_score || 0
      
      if (metadata.current_phase === 'complete') {
        this.context.currentState = InterviewState.COMPLETE
      }
      
      this.context.extractedData = {
        ...this.context.extractedData,
        ...metadata.technical_profile, // Flatten technical profile (archetype, feasibility_score, etc.)
        ...metadata.prer_draft, // Flatten prer_draft (business_problem, solution_approach, etc.)
        technical_profile: metadata.technical_profile,
        current_phase: metadata.current_phase,
        next_questions: metadata.next_questions,
        missing_critical: metadata.missing_critical,
        prer_draft: metadata.prer_draft,
      }

      // Map new Mo v2 fields to legacy EXPECTED_FIELDS for SpecGenerator compatibility
      if (metadata.prer_draft) {
        if (metadata.prer_draft.business_problem) {
          this.context.extractedData.problemStatement = metadata.prer_draft.business_problem
        }
        if (metadata.prer_draft.solution_approach) {
          this.context.extractedData.initialDescription = metadata.prer_draft.solution_approach
        }
      }
      if (metadata.technical_profile) {
        if (metadata.technical_profile.detected_constraints) {
          this.context.extractedData.regulatoryDomains = metadata.technical_profile.detected_constraints
        }
        if (metadata.technical_profile.key_entities) {
          this.context.extractedData.features = metadata.technical_profile.key_entities.map((name: string) => ({
            name,
            description: `Core entity: ${name}`,
            priority: 'must-have'
          }))
        }
      }

      const cleanText = text.replace(META_REGEX, '').trim()
      return { cleanText, metadata }
    } catch {
      return { cleanText: text.replace(META_REGEX, '').trim(), metadata: null }
    }
  }

  static parseChoices(text: string): Array<{ label: string; description: string }> | null {
    const match = CHOICES_REGEX.exec(text)
    CHOICES_REGEX.lastIndex = 0
    if (!match) return null

    const lines = match[1].trim().split('\n').filter((l) => l.trim())
    return lines.map((line) => {
      const trimmed = line.trim()
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx === -1) return { label: trimmed, description: '' }
      const label = trimmed.slice(0, colonIdx).trim()
      const rest = trimmed.slice(colonIdx + 1).trim()
      const dashIdx = rest.indexOf('—')
      if (dashIdx === -1) return { label, description: rest }
      return { label, description: rest }
    })
  }

  static stripChoiceBlocks(text: string): string {
    return text.replace(CHOICES_REGEX, '').trim()
  }

  canTransition(): boolean {
    return false // Transitions are now handled by LLM metadata
  }

  transition(): boolean {
    return false // Transitions are now handled by LLM metadata
  }

  buildFullSystemPrompt(): string {
    let prompt = MO_V2_SYSTEM_PROMPT

    if (Object.keys(this.context.extractedData).length > 0) {
      prompt += `\n\n### CURRENT CONTEXT (DO NOT LOSE THIS)\n${JSON.stringify(this.context.extractedData, null, 2)}`
    }

    const elapsedMs = Date.now() - new Date(this.context.startedAt).getTime()
    if (elapsedMs >= INTERVIEW_REMINDER_MS) {
      prompt += `\n\n[SYSTEM REMINDER] You have been in this interview for ${Math.round(elapsedMs / 60000)} minutes. Please start wrapping up the interview to ensure full readiness by the 15-minute mark. Focus on finalizing the requirements and transitioning current_phase to "complete".`
    }

    return prompt
  }
}
