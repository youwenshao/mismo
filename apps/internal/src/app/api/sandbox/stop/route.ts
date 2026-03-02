import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { access } from 'fs/promises'

const execAsync = promisify(exec)

const SANDBOX_DIR = '/tmp/mismo-sandbox'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { containerId?: string }
    const composePath = join(SANDBOX_DIR, 'docker-compose.yml')

    try {
      await access(composePath)
    } catch {
      return NextResponse.json({ stopped: true, message: 'No sandbox running' })
    }

    await execAsync(
      `docker compose -f ${composePath} down --remove-orphans --volumes --timeout 10`,
      { cwd: SANDBOX_DIR, timeout: 30_000 },
    )

    return NextResponse.json({
      stopped: true,
      containerId: body.containerId || 'unknown',
    })
  } catch (err) {
    console.error('Sandbox stop failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to stop sandbox' },
      { status: 500 },
    )
  }
}
