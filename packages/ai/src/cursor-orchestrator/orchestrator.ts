import {
  TOKEN_BUDGET_PER_FEATURE,
  MAX_CURSOR_CLARIFICATIONS,
  MAX_CONSECUTIVE_BUILD_FAILURES,
} from '@mismo/shared'
import type { PRDContent, PRDFeature } from '@mismo/shared'
import type { AgentBackend, AgentContext } from './agent-backend'

export interface TaskDefinition {
  id: string
  feature: string
  description: string
  acceptanceCriteria: string[]
  tokenBudget: number
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'human_takeover'

export interface TaskResult {
  taskId: string
  status: 'success' | 'failed' | 'human_takeover'
  tokensUsed: number
  buildOutput: string
  clarificationCount: number
  failureCount: number
}

export interface TaskState {
  definition: TaskDefinition
  status: TaskStatus
  result: TaskResult | null
  startedAt: string | null
  completedAt: string | null
}

export interface OrchestratorConfig {
  maxClarifications: number
  maxConsecutiveFailures: number
  tokenBudgetPerFeature: number
  progressReportIntervalMs: number
}

export interface ProgressReport {
  timestamp: string
  totalTasks: number
  completed: number
  failed: number
  humanTakeover: number
  pending: number
  running: number
  totalTokensUsed: number
  taskSummaries: Array<{
    taskId: string
    feature: string
    status: TaskStatus
    tokensUsed: number
  }>
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxClarifications: MAX_CURSOR_CLARIFICATIONS,
  maxConsecutiveFailures: MAX_CONSECUTIVE_BUILD_FAILURES,
  tokenBudgetPerFeature: TOKEN_BUDGET_PER_FEATURE,
  progressReportIntervalMs: 30 * 60 * 1000,
}

export class CursorOrchestrator {
  private tasks: Map<string, TaskState> = new Map()
  private config: OrchestratorConfig
  private backend: AgentBackend
  private progressTimer: ReturnType<typeof setInterval> | null = null

  constructor(backend: AgentBackend, config?: Partial<OrchestratorConfig>) {
    this.backend = backend
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  decomposePRD(prd: PRDContent): TaskDefinition[] {
    return prd.features.map((feature, index) => this.featureToTask(feature, index))
  }

  private featureToTask(feature: PRDFeature, index: number): TaskDefinition {
    const acceptanceCriteria = feature.userStories.map(
      (story) => `Given ${story.given}, when ${story.when}, then ${story.then}`,
    )

    return {
      id: `task-${index}-${slugify(feature.name)}`,
      feature: feature.name,
      description: feature.description,
      acceptanceCriteria,
      tokenBudget: this.config.tokenBudgetPerFeature,
    }
  }

  loadTasks(tasks: TaskDefinition[]): void {
    this.tasks.clear()
    for (const task of tasks) {
      this.tasks.set(task.id, {
        definition: task,
        status: 'pending',
        result: null,
        startedAt: null,
        completedAt: null,
      })
    }
  }

  async executeAll(context: AgentContext): Promise<ProgressReport> {
    this.startProgressReporting()

    try {
      const taskIds = Array.from(this.tasks.keys())
      for (const taskId of taskIds) {
        const state = this.tasks.get(taskId)!
        if (state.status !== 'pending') continue
        await this.executeTask(taskId, context)
      }
    } finally {
      this.stopProgressReporting()
    }

    return this.generateProgressReport()
  }

  async executeTask(taskId: string, context: AgentContext): Promise<TaskResult> {
    const state = this.tasks.get(taskId)
    if (!state) {
      throw new Error(`Task not found: ${taskId}`)
    }

    state.status = 'running'
    state.startedAt = new Date().toISOString()

    const result = await this.backend.execute(state.definition, context)

    const resolvedStatus = this.resolveStatus(result)
    state.result = { ...result, status: resolvedStatus }
    state.status = resolvedStatus === 'success' ? 'completed' : resolvedStatus
    state.completedAt = new Date().toISOString()

    return state.result
  }

  private resolveStatus(result: TaskResult): TaskResult['status'] {
    if (result.clarificationCount > this.config.maxClarifications) {
      return 'human_takeover'
    }
    if (result.failureCount > this.config.maxConsecutiveFailures) {
      return 'human_takeover'
    }
    return result.status
  }

  generateProgressReport(): ProgressReport {
    const states = Array.from(this.tasks.values())

    const taskSummaries = states.map((s) => ({
      taskId: s.definition.id,
      feature: s.definition.feature,
      status: s.status,
      tokensUsed: s.result?.tokensUsed ?? 0,
    }))

    return {
      timestamp: new Date().toISOString(),
      totalTasks: states.length,
      completed: states.filter((s) => s.status === 'completed').length,
      failed: states.filter((s) => s.status === 'failed').length,
      humanTakeover: states.filter((s) => s.status === 'human_takeover').length,
      pending: states.filter((s) => s.status === 'pending').length,
      running: states.filter((s) => s.status === 'running').length,
      totalTokensUsed: states.reduce((sum, s) => sum + (s.result?.tokensUsed ?? 0), 0),
      taskSummaries,
    }
  }

  getTaskState(taskId: string): TaskState | undefined {
    return this.tasks.get(taskId)
  }

  getAllTaskStates(): TaskState[] {
    return Array.from(this.tasks.values())
  }

  getHumanTakeoverTasks(): TaskState[] {
    return Array.from(this.tasks.values()).filter((s) => s.status === 'human_takeover')
  }

  private startProgressReporting(): void {
    this.progressTimer = setInterval(() => {
      const report = this.generateProgressReport()
      console.log('[CursorOrchestrator] Progress Report:', JSON.stringify(report, null, 2))
    }, this.config.progressReportIntervalMs)
  }

  private stopProgressReporting(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer)
      this.progressTimer = null
    }
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
