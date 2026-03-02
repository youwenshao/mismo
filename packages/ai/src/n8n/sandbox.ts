import type { N8nWorkflow, N8nNode, SandboxResult } from './schema'

const SANDBOX_TIMEOUT_MS = 120_000
const MAX_EXECUTION_POLL_ATTEMPTS = 30
const POLL_INTERVAL_MS = 2_000
const INFINITE_LOOP_THRESHOLD_MS = 60_000

export interface SandboxConfig {
  studioHost: string
  studioPort?: number
  dockerComposeDir?: string
}

export interface SandboxSession {
  containerId: string
  n8nUrl: string
  startedAt: string
}

export class WorkflowSandbox {
  private config: SandboxConfig

  constructor(config: SandboxConfig) {
    this.config = {
      studioPort: 5679,
      dockerComposeDir: '/tmp/mismo-sandbox',
      ...config,
    }
  }

  async runTest(
    workflow: N8nWorkflow,
    mockDataNode: N8nNode,
  ): Promise<SandboxResult> {
    let session: SandboxSession | undefined

    try {
      session = await this.spinUp()
      const workflowId = await this.importWorkflow(session, workflow)
      const executionId = await this.executeWorkflow(session, workflowId)
      const result = await this.captureTrace(session, executionId)

      return result
    } catch (err) {
      return {
        success: false,
        nodeResults: [],
        infiniteLoopDetected: false,
        errorPathsCovered: false,
        totalExecutionTimeMs: 0,
        executionId: undefined,
      }
    } finally {
      if (session) {
        await this.tearDown(session).catch(() => {})
      }
    }
  }

  async spinUp(): Promise<SandboxSession> {
    const { studioHost, studioPort } = this.config
    const baseUrl = `http://${studioHost}:${studioPort}`

    const response = await fetch(`${baseUrl}/api/sandbox/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port: studioPort }),
      signal: AbortSignal.timeout(SANDBOX_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(`Failed to spin up sandbox: ${response.status}`)
    }

    const data = (await response.json()) as {
      containerId: string
      n8nUrl: string
    }

    return {
      containerId: data.containerId,
      n8nUrl: data.n8nUrl,
      startedAt: new Date().toISOString(),
    }
  }

  private async importWorkflow(
    session: SandboxSession,
    workflow: N8nWorkflow,
  ): Promise<string> {
    const response = await fetch(`${session.n8nUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...workflow, active: false }),
    })

    if (!response.ok) {
      throw new Error(`Failed to import workflow: ${response.status}`)
    }

    const data = (await response.json()) as { id: string }
    return data.id
  }

  private async executeWorkflow(
    session: SandboxSession,
    workflowId: string,
  ): Promise<string> {
    const response = await fetch(
      `${session.n8nUrl}/api/v1/workflows/${workflowId}/run`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to execute workflow: ${response.status}`)
    }

    const data = (await response.json()) as { id: string }
    return data.id
  }

  private async captureTrace(
    session: SandboxSession,
    executionId: string,
  ): Promise<SandboxResult> {
    const startTime = Date.now()
    let executionData: ExecutionResponse | null = null

    for (let attempt = 0; attempt < MAX_EXECUTION_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS)

      const response = await fetch(
        `${session.n8nUrl}/api/v1/executions/${executionId}`,
      )

      if (!response.ok) continue

      const data = (await response.json()) as ExecutionResponse
      if (data.finished || data.status === 'error') {
        executionData = data
        break
      }

      if (Date.now() - startTime > INFINITE_LOOP_THRESHOLD_MS) {
        return {
          success: false,
          executionId,
          nodeResults: [],
          infiniteLoopDetected: true,
          errorPathsCovered: false,
          totalExecutionTimeMs: Date.now() - startTime,
        }
      }
    }

    if (!executionData) {
      return {
        success: false,
        executionId,
        nodeResults: [],
        infiniteLoopDetected: false,
        errorPathsCovered: false,
        totalExecutionTimeMs: Date.now() - startTime,
      }
    }

    const nodeResults = Object.entries(
      executionData.data?.resultData?.runData || {},
    ).map(([nodeName, runs]) => {
      const lastRun = Array.isArray(runs) ? runs[runs.length - 1] : runs
      return {
        nodeName,
        nodeType: lastRun?.source?.[0]?.previousNode || 'unknown',
        input: lastRun?.inputData || null,
        output: lastRun?.data?.main?.[0] || null,
        executionTimeMs: lastRun?.executionTime || 0,
        error: lastRun?.error?.message,
      }
    })

    const hasErrorHandler = nodeResults.some(
      (n) =>
        n.nodeName === 'On Workflow Error' ||
        n.nodeType === 'n8n-nodes-base.errorTrigger',
    )

    return {
      success: executionData.status !== 'error',
      executionId,
      nodeResults,
      infiniteLoopDetected: false,
      errorPathsCovered: hasErrorHandler,
      totalExecutionTimeMs: Date.now() - startTime,
    }
  }

  async tearDown(session: SandboxSession): Promise<void> {
    const { studioHost, studioPort } = this.config
    const baseUrl = `http://${studioHost}:${studioPort}`

    await fetch(`${baseUrl}/api/sandbox/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ containerId: session.containerId }),
    })
  }

  generateDockerCompose(port: number): string {
    return [
      'version: "3.8"',
      'services:',
      '  n8n-sandbox:',
      '    image: docker.n8n.io/n8nio/n8n',
      '    restart: "no"',
      '    environment:',
      '      - DB_TYPE=sqlite',
      '      - N8N_PORT=5678',
      '      - N8N_DIAGNOSTICS_ENABLED=false',
      '      - N8N_HIRING_BANNER_ENABLED=false',
      '      - EXECUTIONS_DATA_PRUNE=true',
      '      - EXECUTIONS_DATA_MAX_AGE=1',
      '    ports:',
      `      - "${port}:5678"`,
      '    tmpfs:',
      '      - /home/node/.n8n',
      '    healthcheck:',
      '      test: ["CMD", "wget", "--spider", "-q", "http://localhost:5678/healthz"]',
      '      interval: 5s',
      '      timeout: 5s',
      '      retries: 12',
      '',
    ].join('\n')
  }
}

interface ExecutionResponse {
  id: string
  finished: boolean
  status: string
  data?: {
    resultData?: {
      runData?: Record<
        string,
        Array<{
          source?: Array<{ previousNode: string }>
          inputData?: unknown
          data?: { main?: unknown[][] }
          executionTime?: number
          error?: { message: string }
        }>
      >
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
