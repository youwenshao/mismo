import { NextRequest, NextResponse } from 'next/server'
import {
  N8nPipeline,
  workflowRequestSchema,
  type DeploymentMode,
  type WorkflowRequest,
} from '@mismo/ai'

interface PipelineRequestBody {
  workflowRequest: WorkflowRequest
  deploymentMode: DeploymentMode
  sandboxHost?: string
  sandboxPort?: number
  managedN8nUrl?: string
  managedN8nApiKey?: string
  monitoringWebhook?: string
  skipSandbox?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PipelineRequestBody

    const parsed = workflowRequestSchema.safeParse(body.workflowRequest)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid workflowRequest', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    if (!body.deploymentMode) {
      return NextResponse.json(
        { error: 'Missing deploymentMode' },
        { status: 400 },
      )
    }

    const pipeline = new N8nPipeline({
      deploymentMode: body.deploymentMode,
      sandboxConfig: body.sandboxHost
        ? { studioHost: body.sandboxHost, studioPort: body.sandboxPort }
        : undefined,
      skipSandbox: body.skipSandbox ?? !body.sandboxHost,
      managedN8nUrl: body.managedN8nUrl,
      managedN8nApiKey: body.managedN8nApiKey,
      monitoringWebhook: body.monitoringWebhook,
    })

    const result = await pipeline.run(parsed.data, {
      deploymentMode: body.deploymentMode,
      managedN8nUrl: body.managedN8nUrl,
      managedN8nApiKey: body.managedN8nApiKey,
      monitoringWebhook: body.monitoringWebhook,
    })

    return NextResponse.json({
      success: result.deployment.success,
      mode: result.deployment.mode,
      sandboxPassed: result.sandboxResult?.success ?? null,
      deliverableCount: Object.keys(result.deliverables).length,
      deliverables: Object.keys(result.deliverables),
      artifacts: result.deliverables,
    })
  } catch (err) {
    console.error('Pipeline execution failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Pipeline failed' },
      { status: 500 },
    )
  }
}
