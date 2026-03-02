import type { GsdTask } from './gsd-graph'

export interface ParallelizationSuggestion {
  taskId: string
  taskType: string
  blockingDependency: string
  blockingType: string
  message: string
}

export function analyzeParallelization(
  tasks: GsdTask[],
  completedTaskIds: string[]
): ParallelizationSuggestion[] {
  const suggestions: ParallelizationSuggestion[] = []
  const completedSet = new Set(completedTaskIds)
  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  for (const task of tasks) {
    if (completedSet.has(task.id)) continue
    if (task.dependencies.length !== 1) continue

    const blockingId = task.dependencies[0]
    if (completedSet.has(blockingId)) continue

    const blocking = taskMap.get(blockingId)
    if (!blocking) continue

    // Tasks that could start with early approval of blocking dependency
    const allOtherDepsComplete = task.dependencies
      .filter((d) => d !== blockingId)
      .every((d) => completedSet.has(d))

    if (allOtherDepsComplete) {
      const blockingLabel =
        blocking.type.charAt(0).toUpperCase() + blocking.type.slice(1)
      const taskLabel =
        task.type.charAt(0).toUpperCase() + task.type.slice(1)

      suggestions.push({
        taskId: task.id,
        taskType: task.type,
        blockingDependency: blockingId,
        blockingType: blocking.type,
        message: `${taskLabel} could start now if ${blockingLabel} contract is approved early`,
      })
    }
  }

  return suggestions
}
