import express from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = express()
app.use(express.json())

interface AgentTask {
  id: string
  type: string
  dependencies: string[]
  input: Record<string, unknown>
  config?: Record<string, unknown>
}

interface PrdDecomposition {
  gsd_decomposition: {
    tasks: Array<{
      id: string
      type: string
      dependencies: string[]
      input?: Record<string, unknown>
      config?: Record<string, unknown>
    }>
  }
}

class CycleError extends Error {
  constructor(public readonly cycle: string[]) {
    super(`Dependency cycle detected: ${cycle.join(' -> ')}`)
    this.name = 'CycleError'
  }
}

/**
 * Kahn's algorithm for topological sorting with cycle detection.
 * Returns agents ordered so that every agent appears after all its dependencies.
 */
function topologicalSort(agents: AgentTask[]): AgentTask[] {
  const idSet = new Set(agents.map((a) => a.id))
  const agentMap = new Map<string, AgentTask>()
  for (const agent of agents) {
    if (agentMap.has(agent.id)) {
      throw new Error(`Duplicate agent id: "${agent.id}"`)
    }
    agentMap.set(agent.id, agent)
  }

  for (const agent of agents) {
    for (const dep of agent.dependencies) {
      if (!idSet.has(dep)) {
        throw new Error(
          `Agent "${agent.id}" depends on unknown agent "${dep}"`,
        )
      }
    }
  }

  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const agent of agents) {
    inDegree.set(agent.id, 0)
    adjacency.set(agent.id, [])
  }

  for (const agent of agents) {
    for (const dep of agent.dependencies) {
      adjacency.get(dep)!.push(agent.id)
      inDegree.set(agent.id, inDegree.get(agent.id)! + 1)
    }
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const sorted: AgentTask[] = []

  while (queue.length > 0) {
    const current = queue.shift()!
    sorted.push(agentMap.get(current)!)

    for (const neighbor of adjacency.get(current)!) {
      const newDeg = inDegree.get(neighbor)! - 1
      inDegree.set(neighbor, newDeg)
      if (newDeg === 0) queue.push(neighbor)
    }
  }

  if (sorted.length !== agents.length) {
    const remaining = agents
      .filter((a) => !sorted.some((s) => s.id === a.id))
      .map((a) => a.id)
    throw new CycleError(remaining)
  }

  return sorted
}

function parsePrdToAgents(prd: PrdDecomposition): AgentTask[] {
  const decomposition = prd?.gsd_decomposition
  if (!decomposition?.tasks || !Array.isArray(decomposition.tasks)) {
    throw new Error(
      'Invalid PRD: missing gsd_decomposition.tasks array',
    )
  }

  return decomposition.tasks.map((task) => {
    if (!task.id || !task.type) {
      throw new Error(
        `Invalid task in PRD: each task requires "id" and "type"`,
      )
    }
    return {
      id: task.id,
      type: task.type,
      dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
      input: task.input ?? {},
      config: task.config,
    }
  })
}

async function logError(buildId: string | undefined, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[gsd-dependency] ${message}`)

  if (!buildId) return

  try {
    const build = await prisma.build.findUnique({ where: { id: buildId } })
    if (build) {
      const existing = Array.isArray(build.errorLogs) ? build.errorLogs : []
      await prisma.build.update({
        where: { id: buildId },
        data: {
          status: 'FAILED',
          failureCount: { increment: 1 },
          errorLogs: [...(existing as any[]), { source: 'gsd-dependency', error: message, timestamp: new Date().toISOString() }],
        },
      })
    }
  } catch (dbErr) {
    console.error('[gsd-dependency] Failed to log error to database:', dbErr)
  }
}

app.post('/sort', async (req, res) => {
  const { buildId, agents } = req.body

  if (!agents || !Array.isArray(agents)) {
    return res.status(400).json({ success: false, error: 'agents array is required' })
  }

  try {
    const sorted = topologicalSort(agents as AgentTask[])

    if (buildId) {
      await prisma.build.update({
        where: { id: buildId },
        data: {
          executionIds: sorted.map((a) => a.id),
        },
      })
    }

    return res.json({ success: true, sorted })
  } catch (error) {
    await logError(buildId, error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    const status = error instanceof CycleError ? 422 : 500
    return res.status(status).json({ success: false, error: message })
  }
})

app.post('/parse-prd', async (req, res) => {
  const { buildId, prd } = req.body

  if (!prd) {
    return res.status(400).json({ success: false, error: 'prd object is required' })
  }

  try {
    const agents = parsePrdToAgents(prd as PrdDecomposition)
    const sorted = topologicalSort(agents)

    if (buildId) {
      await prisma.build.update({
        where: { id: buildId },
        data: {
          executionIds: sorted.map((a) => a.id),
        },
      })
    }

    return res.json({ success: true, agents: sorted })
  } catch (error) {
    await logError(buildId, error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    const status = error instanceof CycleError ? 422 : 400
    return res.status(status).json({ success: false, error: message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`GSD Dependency Checker listening on port ${PORT}`))
