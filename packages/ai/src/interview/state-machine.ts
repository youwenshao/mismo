import {
  InterviewState,
  READINESS_THRESHOLD,
  INTERVIEW_REMINDER_MS,
  type InterviewMessage,
  type SessionCheckpoint,
  type ReadinessMetadata,
} from '@mismo/shared'
import { INTERVIEW_STATES, type StateConfig } from './states'
import { MO_BASE_PROMPT } from './prompts'

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
      currentState: InterviewState.GREETING,
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

  get currentStateConfig(): StateConfig {
    return INTERVIEW_STATES[this.context.currentState]
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
    return this.currentStateConfig.systemPrompt
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
      context: JSON.parse(
        JSON.stringify({
          currentState: this.context.currentState,
          extractedData: this.context.extractedData,
          readinessScore: this.context.readinessScore,
          turnCount: this.context.turnCount,
          totalTurnCount: this.context.totalTurnCount,
        }),
      ),
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
      const metadata = JSON.parse(match[1])
      this.context.readinessScore = metadata.readiness

      if (metadata.extractedData && typeof metadata.extractedData === 'object') {
        this.context.extractedData = {
          ...this.context.extractedData,
          ...metadata.extractedData,
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

    const lines = match[1]
      .trim()
      .split('\n')
      .filter((l) => l.trim())
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
    const config = this.currentStateConfig
    const goals = config.extractionGoals
    const allGoalsMet = goals.every((goal) => this.context.extractedData[goal] !== undefined)
    const maxTurnsReached = this.context.turnCount >= config.maxTurns

    if (
      this.context.readinessScore >= READINESS_THRESHOLD &&
      this.context.currentState !== InterviewState.SUMMARY &&
      this.context.currentState !== InterviewState.FEASIBILITY_AND_PRICING &&
      this.context.currentState !== InterviewState.CONFIRMATION &&
      this.context.currentState !== InterviewState.COMPLETE
    ) {
      return true
    }

    if (
      this.context.currentState === InterviewState.SUMMARY ||
      this.context.currentState === InterviewState.FEASIBILITY_AND_PRICING ||
      this.context.currentState === InterviewState.CONFIRMATION
    ) {
      const lastMessage = this.context.messages[this.context.messages.length - 1]
      if (lastMessage?.role === 'user') {
        const content = lastMessage.content.toLowerCase()
        const isPositiveChoice =
          content.startsWith('a:') ||
          content.includes('proceed') ||
          content.includes('sounds good') ||
          content.includes('looks right') ||
          content.includes('submit')
        if (isPositiveChoice) return true
      }
    }

    return allGoalsMet || maxTurnsReached
  }

  transition(): boolean {
    const config = this.currentStateConfig

    if (
      this.context.readinessScore >= READINESS_THRESHOLD &&
      this.context.currentState !== InterviewState.SUMMARY &&
      this.context.currentState !== InterviewState.FEASIBILITY_AND_PRICING &&
      this.context.currentState !== InterviewState.CONFIRMATION &&
      this.context.currentState !== InterviewState.COMPLETE
    ) {
      this.context.currentState = InterviewState.SUMMARY
      this.context.turnCount = 0
      return true
    }

    const nextState = config.nextState
    if (!nextState) return false
    this.context.currentState = nextState
    this.context.turnCount = 0
    return true
  }

  buildFullSystemPrompt(priceEstimateJson?: string): string {
    const config = this.currentStateConfig
    const ctx = this.context

    let prompt =
      MO_BASE_PROMPT + '\n\n---\n\nCURRENT PHASE: ' + config.id + '\n\n' + config.systemPrompt

    prompt += `\n\n### EXTRACTION RULES (CRITICAL)
You MUST extract structured data from the user's input and include it in your [META] block. 
The system uses this to build the technical specification. 
Expected fields for the entire interview:
- projectName: string
- initialDescription: string
- problemStatement: string
- currentSolutions: string
- uniqueValue: string
- primaryUsers: string
- demographics: string
- expectedVolume: string
- features: Array<{name: string, description: string, priority: "must-have" | "should-have" | "nice-to-have"}>
- archPreference: "speed" | "scalability" | "customization"
- scalabilityNeeds: "low" | "medium" | "high"
- businessModel: string
- pricingStrategy: string
- paymentNeeds: string
- dataTypes: string[]
- regulatoryDomains: string[]
- contentTypes: string[]

Update the "extractedData" object in your [META] block with ANY information gathered so far. 
NEVER drop previously extracted fields unless they are being corrected.

Format your [META] block exactly like this:
[META]{"readiness":<score>,"missing":[...],"extractedData":{...}}[/META]`

    if (Object.keys(ctx.extractedData).length > 0) {
      prompt += `\n\nInformation gathered so far:\n${JSON.stringify(ctx.extractedData, null, 2)}`
    }

    prompt += `\n\nYou are in the "${config.id}" phase (turn ${ctx.turnCount + 1}/${config.maxTurns}).`
    prompt += `\nExtraction goals for this phase: ${config.extractionGoals.join(', ') || 'none'}`

    if (config.nextState && config.nextState !== InterviewState.COMPLETE) {
      prompt += `\nAfter this phase, you will move to: ${config.nextState}`
    }

    if (priceEstimateJson && ctx.currentState === InterviewState.FEASIBILITY_AND_PRICING) {
      prompt += `\n\nPRICE ESTIMATE DATA (use these exact numbers in your response):\n${priceEstimateJson}`
    }

    const elapsedMs = Date.now() - new Date(ctx.startedAt).getTime()
    if (elapsedMs >= INTERVIEW_REMINDER_MS) {
      prompt += `\n\n[SYSTEM REMINDER] You have been in this interview for ${Math.round(elapsedMs / 60000)} minutes. Please start wrapping up the interview to ensure full readiness by the 15-minute mark. Focus on finalizing the requirements and moving towards the summary phase.`
    }

    prompt += `\n\nREMEMBER: End every response with [META]{"readiness":<score>,"missing":[...],"extractedData":{...}}[/META]. This is EXTREMELY IMPORTANT for the system to process the requirements.`

    return prompt
  }
}
