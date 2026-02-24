import { InterviewState, type InterviewMessage } from '@mismo/shared'
import { INTERVIEW_STATES, type StateConfig } from './states'

export interface InterviewContext {
  currentState: InterviewState
  extractedData: Record<string, unknown>
  turnCount: number
  totalTurnCount: number
  messages: InterviewMessage[]
  startedAt: string
  expiresAt: string
}

export class InterviewStateMachine {
  private context: InterviewContext

  constructor(expiresAt: Date) {
    this.context = {
      currentState: InterviewState.GREETING,
      extractedData: {},
      turnCount: 0,
      totalTurnCount: 0,
      messages: [],
      startedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    }
  }

  static fromContext(ctx: InterviewContext): InterviewStateMachine {
    const machine = new InterviewStateMachine(new Date(ctx.expiresAt))
    machine.context = ctx
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

  canTransition(): boolean {
    const config = this.currentStateConfig
    const goals = config.extractionGoals
    const allGoalsMet = goals.every((goal) => this.context.extractedData[goal] !== undefined)
    const maxTurnsReached = this.context.turnCount >= config.maxTurns
    return allGoalsMet || maxTurnsReached
  }

  transition(): boolean {
    const nextState = this.currentStateConfig.nextState
    if (!nextState) return false
    this.context.currentState = nextState
    this.context.turnCount = 0
    return true
  }
}
