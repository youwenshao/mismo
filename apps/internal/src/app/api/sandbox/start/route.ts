import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const execAsync = promisify(exec)

const SANDBOX_DIR = '/tmp/mismo-sandbox'
const DEFAULT_PORT = 5679
const HEALTH_CHECK_RETRIES = 24
const HEALTH_CHECK_INTERVAL_MS = 2500

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { port?: number }
    const port = body.port || DEFAULT_PORT

    await mkdir(SANDBOX_DIR, { recursive: true })

    const compose = generateComposeFile(port)
    const composePath = join(SANDBOX_DIR, 'docker-compose.yml')
    await writeFile(composePath, compose, 'utf-8')

    await execAsync(`docker compose -f ${composePath} down --remove-orphans`, {
      cwd: SANDBOX_DIR,
    }).catch(() => {})

    const { stdout } = await execAsync(
      `docker compose -f ${composePath} up -d --wait`,
      { cwd: SANDBOX_DIR, timeout: 60_000 },
    )

    const { stdout: psOut } = await execAsync(
      `docker compose -f ${composePath} ps -q n8n-sandbox`,
      { cwd: SANDBOX_DIR },
    )
    const containerId = psOut.trim()

    const n8nUrl = `http://localhost:${port}`
    await waitForHealthy(n8nUrl)

    return NextResponse.json({
      containerId,
      n8nUrl,
      port,
      composePath,
      logs: stdout.slice(0, 500),
    })
  } catch (err) {
    console.error('Sandbox start failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start sandbox' },
      { status: 500 },
    )
  }
}

async function waitForHealthy(url: string): Promise<void> {
  for (let i = 0; i < HEALTH_CHECK_RETRIES; i++) {
    try {
      const res = await fetch(`${url}/healthz`, {
        signal: AbortSignal.timeout(2000),
      })
      if (res.ok) return
    } catch {
      // n8n not ready yet
    }
    await new Promise((r) => setTimeout(r, HEALTH_CHECK_INTERVAL_MS))
  }
  throw new Error('n8n sandbox did not become healthy in time')
}

function generateComposeFile(port: number): string {
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
    '      - N8N_PERSONALIZATION_ENABLED=false',
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
