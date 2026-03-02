import { NextRequest, NextResponse } from 'next/server'
import type { SandboxResult } from '@mismo/ai'

const MAX_POLL_ATTEMPTS = 30
const POLL_INTERVAL_MS = 2_000
const INFINITE_LOOP_THRESHOLD_MS = 60_000

interface N8nExecution {
  id: string
  finished: boolean
  status: string
  data?: {
    resultData?: {
      runData?: Record<
        string,
        Array<{
          startTime?: number
          executionTime?: number
          source?: Array<{ previousNode: string }>
          inputData?: unknown
          data?: { main?: unknown[][] }
          error?: { message: string }
        }>
      >
      error?: { message: string }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      n8nUrl: string
      workflow: Record<string, unknown>
    }

    if (!body.n8nUrl || !body.workflow) {
      return NextResponse.json(
        { error: 'Missing n8nUrl or workflow' },
        { status: 400 },
      )
    }

    const { n8nUrl, workflow } = body

    const importRes = await fetch(`${n8nUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...workflow, active: false }),
    })

    if (!importRes.ok) {
      const errText = await importRes.text()
      return NextResponse.json(
        { error: `Import failed: ${errText}` },
        { status: 502 },
      )
    }

    const { id: workflowId } = (await importRes.json()) as { id: string }

    const execRes = await fetch(
      `${n8nUrl}/api/v1/workflows/${workflowId}/run`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )

    if (!execRes.ok) {
      const errText = await execRes.text()
      return NextResponse.json(
        { error: `Execution failed: ${errText}` },
        { status: 502 },
      )
    }

    const { id: executionId } = (await execRes.json()) as { id: string }

    const result = await pollExecution(n8nUrl, executionId)

    await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
      method: 'DELETE',
    }).catch(() => {})

    return NextResponse.json(result)
  } catch (err) {
    console.error('Sandbox test failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Test execution failed' },
      { status: 500 },
    )
  }
}

async function pollExecution(
  n8nUrl: string,
  executionId: string,
): Promise<SandboxResult> {
  const startTime = Date.now()

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS)

    const elapsed = Date.now() - startTime
    if (elapsed > INFINITE_LOOP_THRESHOLD_MS) {
      return {
        success: false,
        executionId,
        nodeResults: [],
        infiniteLoopDetected: true,
        errorPathsCovered: false,
        totalExecutionTimeMs: elapsed,
      }
    }

    try {
      const res = await fetch(`${n8nUrl}/api/v1/executions/${executionId}`)
      if (!res.ok) continue

      const execution = (await res.json()) as N8nExecution
      if (!execution.finished && execution.status !== 'error') continue

      return buildResult(executionId, execution, Date.now() - startTime)
    } catch {
      continue
    }
  }

  return {
    success: false,
    executionId,
    nodeResults: [],
    infiniteLoopDetected: false,
    errorPathsCovered: false,
    totalExecutionTimeMs: Date.now() - startTime,
  }
}

function buildResult(
  executionId: string,
  execution: N8nExecution,
  totalMs: number,
): SandboxResult {
  const runData = execution.data?.resultData?.runData || {}

  const nodeResults = Object.entries(runData).map(([nodeName, runs]) => {
    const lastRun = runs[runs.length - 1]
    return {
      nodeName,
      nodeType: lastRun?.source?.[0]?.previousNode || 'trigger',
      input: lastRun?.inputData ?? null,
      output: lastRun?.data?.main?.[0] ?? null,
      executionTimeMs: lastRun?.executionTime || 0,
      error: lastRun?.error?.message,
    }
  })

  const hasErrors = nodeResults.some((n) => n.error)
  const hasErrorHandler = Object.keys(runData).some(
    (name) => name === 'On Workflow Error',
  )

  return {
    success: execution.status !== 'error' && !hasErrors,
    executionId,
    nodeResults,
    infiniteLoopDetected: false,
    errorPathsCovered: hasErrorHandler || !hasErrors,
    totalExecutionTimeMs: totalMs,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
