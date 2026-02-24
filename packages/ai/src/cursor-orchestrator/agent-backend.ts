import type { TaskDefinition, TaskResult } from './orchestrator'

export interface AgentContext {
  repoPath: string
  cursorrules: string
  prdContext: string
}

export interface AgentBackend {
  name: string
  execute(task: TaskDefinition, context: AgentContext): Promise<TaskResult>
}

export class CursorAgentBackend implements AgentBackend {
  name = 'cursor-cli'

  async execute(task: TaskDefinition, context: AgentContext): Promise<TaskResult> {
    console.log(`[CursorAgentBackend] Would execute task "${task.id}" via Cursor CLI`)
    console.log(`  Feature: ${task.feature}`)
    console.log(`  Description: ${task.description}`)
    console.log(`  Repo: ${context.repoPath}`)
    console.log(`  Acceptance criteria: ${task.acceptanceCriteria.length} items`)
    console.log(`  Token budget: ${task.tokenBudget}`)

    return {
      taskId: task.id,
      status: 'success',
      tokensUsed: 0,
      buildOutput: '[CursorAgentBackend] Placeholder — Cursor CLI not yet integrated',
      clarificationCount: 0,
      failureCount: 0,
    }
  }
}

export class MockAgentBackend implements AgentBackend {
  name = 'mock'

  private scenario: 'success' | 'failure' | 'human_takeover'

  constructor(scenario: 'success' | 'failure' | 'human_takeover' = 'success') {
    this.scenario = scenario
  }

  async execute(task: TaskDefinition, _context: AgentContext): Promise<TaskResult> {
    const tokenUsage = Math.floor(Math.random() * task.tokenBudget * 0.8)

    switch (this.scenario) {
      case 'failure':
        return {
          taskId: task.id,
          status: 'failed',
          tokensUsed: tokenUsage,
          buildOutput: 'Mock build failure: compilation error in generated code',
          clarificationCount: 0,
          failureCount: 4,
        }
      case 'human_takeover':
        return {
          taskId: task.id,
          status: 'human_takeover',
          tokensUsed: tokenUsage,
          buildOutput: 'Mock: too many clarifications requested',
          clarificationCount: 4,
          failureCount: 0,
        }
      default:
        return {
          taskId: task.id,
          status: 'success',
          tokensUsed: tokenUsage,
          buildOutput: 'Mock build succeeded. All acceptance criteria met.',
          clarificationCount: 1,
          failureCount: 0,
        }
    }
  }
}
