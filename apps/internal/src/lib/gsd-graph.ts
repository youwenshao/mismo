import type { Node, Edge } from '@xyflow/react'

export interface GsdTask {
  id: string
  type: string
  dependencies: string[]
  input?: Record<string, unknown>
  config?: Record<string, unknown>
}

export type TaskStatus = 'completed' | 'in_progress' | 'waiting' | 'failed'

interface GraphInput {
  tasks: GsdTask[]
  completedTaskIds: string[]
  currentTaskId: string | null
  buildFailed: boolean
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  completed: '#22c55e',
  in_progress: '#3b82f6',
  waiting: '#9ca3af',
  failed: '#ef4444',
}

const TYPE_LABELS: Record<string, string> = {
  database: 'Database',
  backend: 'Backend',
  frontend: 'Frontend',
  devops: 'DevOps',
  qa: 'QA',
  coordinator: 'Coordinator',
}

export function buildGraphData(input: GraphInput): {
  nodes: Node[]
  edges: Edge[]
  criticalPath: string[]
} {
  const { tasks, completedTaskIds, currentTaskId, buildFailed } = input
  const completedSet = new Set(completedTaskIds)

  function getStatus(taskId: string): TaskStatus {
    if (completedSet.has(taskId)) return 'completed'
    if (taskId === currentTaskId) {
      return buildFailed ? 'failed' : 'in_progress'
    }
    return 'waiting'
  }

  // Layout: arrange nodes by depth (topological layers)
  const depths = computeDepths(tasks)
  const maxDepth = Math.max(...Array.from(depths.values()), 0)
  const layerCounts = new Map<number, number>()
  for (const d of depths.values()) {
    layerCounts.set(d, (layerCounts.get(d) ?? 0) + 1)
  }
  const layerIndex = new Map<number, number>()

  const nodes: Node[] = tasks.map((task) => {
    const depth = depths.get(task.id) ?? 0
    const layerSize = layerCounts.get(depth) ?? 1
    const idx = layerIndex.get(depth) ?? 0
    layerIndex.set(depth, idx + 1)
    const status = getStatus(task.id)

    return {
      id: task.id,
      type: 'taskNode',
      position: {
        x: depth * 250,
        y: idx * 120 - (layerSize - 1) * 60,
      },
      data: {
        label: TYPE_LABELS[task.type] ?? task.type,
        taskId: task.id,
        taskType: task.type,
        status,
        color: STATUS_COLORS[status],
      },
    }
  })

  const edges: Edge[] = tasks.flatMap((task) =>
    task.dependencies.map((dep) => ({
      id: `${dep}-${task.id}`,
      source: dep,
      target: task.id,
      animated: getStatus(task.id) === 'in_progress',
      style: { stroke: '#d1d5db', strokeWidth: 2 },
    }))
  )

  const criticalPath = computeCriticalPath(tasks)

  // Highlight critical path edges
  const cpSet = new Set<string>()
  for (let i = 0; i < criticalPath.length - 1; i++) {
    cpSet.add(`${criticalPath[i]}-${criticalPath[i + 1]}`)
  }
  for (const edge of edges) {
    if (cpSet.has(edge.id)) {
      edge.style = { stroke: '#000', strokeWidth: 3 }
    }
  }

  return { nodes, edges, criticalPath }
}

function computeDepths(tasks: GsdTask[]): Map<string, number> {
  const taskMap = new Map(tasks.map((t) => [t.id, t]))
  const depths = new Map<string, number>()

  function getDepth(id: string): number {
    if (depths.has(id)) return depths.get(id)!
    const task = taskMap.get(id)
    if (!task || task.dependencies.length === 0) {
      depths.set(id, 0)
      return 0
    }
    const d = Math.max(...task.dependencies.map(getDepth)) + 1
    depths.set(id, d)
    return d
  }

  for (const task of tasks) getDepth(task.id)
  return depths
}

function computeCriticalPath(tasks: GsdTask[]): string[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]))
  const longestPath = new Map<string, string[]>()

  function getLongestPath(id: string): string[] {
    if (longestPath.has(id)) return longestPath.get(id)!
    const task = taskMap.get(id)
    if (!task || task.dependencies.length === 0) {
      const path = [id]
      longestPath.set(id, path)
      return path
    }
    const depPaths = task.dependencies.map(getLongestPath)
    const longest = depPaths.reduce((a, b) => (a.length >= b.length ? a : b), [])
    const path = [...longest, id]
    longestPath.set(id, path)
    return path
  }

  let result: string[] = []
  for (const task of tasks) {
    const path = getLongestPath(task.id)
    if (path.length > result.length) result = path
  }
  return result
}
