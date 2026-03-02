import { NextRequest, NextResponse } from 'next/server'

interface MobileBuildRequest {
  buildId: string
  prdJson: {
    projectName: string
    bundleId: string
    mobileConfig?: Record<string, unknown>
    screens: Array<{ name: string; path: string; type?: string }>
    designDna?: Record<string, unknown>
    componentLibrary?: string
    [key: string]: unknown
  }
  credentials?: {
    appleTeamId?: string
    appleApiKeyId?: string
    appleApiIssuerId?: string
    googleServiceAccountKeyPath?: string
    expoToken?: string
  }
  projectPath?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MobileBuildRequest

    if (!body.buildId || !body.prdJson) {
      return NextResponse.json(
        { error: 'Missing required fields: buildId and prdJson' },
        { status: 400 },
      )
    }

    if (!body.prdJson.projectName || !body.prdJson.bundleId) {
      return NextResponse.json(
        { error: 'prdJson must include projectName and bundleId' },
        { status: 400 },
      )
    }

    const n8nWebhookUrl =
      process.env.N8N_MOBILE_PIPELINE_WEBHOOK_URL ||
      'http://localhost:5678/webhook/mobile-build-pipeline'

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buildId: body.buildId,
        prdJson: body.prdJson,
        credentials: body.credentials || {},
        projectPath: body.projectPath || `/tmp/mobile-builds/${body.buildId}`,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return NextResponse.json(
        { error: `Pipeline trigger failed: ${response.status}`, details: errorBody },
        { status: 502 },
      )
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      buildId: body.buildId,
      pipelineStatus: result.status || 'TRIGGERED',
      message: result.message || 'Mobile build pipeline triggered',
      feasibilityScore: result.score,
    })
  } catch (err) {
    console.error('[mobile/build] Pipeline trigger failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to trigger mobile build pipeline' },
      { status: 500 },
    )
  }
}
