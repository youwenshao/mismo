import { NextRequest, NextResponse } from 'next/server'
import { WorkflowDeployer, type DeploymentMode, type N8nWorkflow, type N8nCredential } from '@mismo/ai'

interface DeployRequestBody {
  mode: 'self-hosted' | 'managed' | 'standalone'
  workflow: N8nWorkflow
  credentials: N8nCredential[]
  projectName: string
  commissionId?: string
  managedN8nUrl?: string
  managedN8nApiKey?: string
  monitoringWebhook?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DeployRequestBody

    if (!body.mode || !body.workflow || !body.projectName) {
      return NextResponse.json(
        { error: 'Missing required fields: mode, workflow, projectName' },
        { status: 400 },
      )
    }

    const deployer = new WorkflowDeployer()
    const result = await deployer.deploy({
      mode: body.mode as DeploymentMode,
      workflow: body.workflow,
      credentials: body.credentials || [],
      projectName: body.projectName,
      commissionId: body.commissionId,
      managedN8nUrl: body.managedN8nUrl,
      managedN8nApiKey: body.managedN8nApiKey,
      monitoringWebhook: body.monitoringWebhook,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, mode: result.mode },
        { status: 502 },
      )
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Deployment failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Deployment failed' },
      { status: 500 },
    )
  }
}
