import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const buildId = searchParams.get('buildId')

    if (!buildId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: buildId' },
        { status: 400 },
      )
    }

    const n8nApiUrl = process.env.N8N_MANAGED_URL || 'http://localhost:5678'
    const n8nApiKey = process.env.N8N_MANAGED_API_KEY || ''

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (n8nApiKey) {
      headers['X-N8N-API-KEY'] = n8nApiKey
    }

    const executionsRes = await fetch(
      `${n8nApiUrl}/api/v1/executions?status=running,waiting,success,error&limit=10`,
      { headers },
    )

    if (!executionsRes.ok) {
      return NextResponse.json({
        buildId,
        status: 'UNKNOWN',
        message: 'Could not query n8n executions API',
      })
    }

    const executions = await executionsRes.json()
    const matching = (executions.data || []).find(
      (exec: Record<string, unknown>) => {
        const data = exec.data as Record<string, unknown> | undefined
        return data && JSON.stringify(data).includes(buildId)
      },
    )

    if (!matching) {
      return NextResponse.json({
        buildId,
        status: 'NOT_FOUND',
        message: 'No matching execution found. Pipeline may not have started yet.',
      })
    }

    const status = matching.finished
      ? matching.stoppedAt
        ? 'COMPLETED'
        : 'FAILED'
      : 'RUNNING'

    return NextResponse.json({
      buildId,
      status,
      executionId: matching.id,
      startedAt: matching.startedAt,
      stoppedAt: matching.stoppedAt || null,
      mode: matching.mode,
    })
  } catch (err) {
    console.error('[mobile/status] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch build status' },
      { status: 500 },
    )
  }
}
