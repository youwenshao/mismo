import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  TransferAgent,
  type TransferExecutionInput,
  type DocGeneratorInput,
} from '@mismo/ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.buildId || !body.commissionId || !body.repoName || !body.workspaceDir) {
      return NextResponse.json(
        { error: 'Missing required fields: buildId, commissionId, repoName, workspaceDir' },
        { status: 400 },
      )
    }

    const deliveryId = body.deliveryId ?? crypto.randomUUID()
    const prdJson = body.prdJson ?? {}

    const docInput: DocGeneratorInput = {
      projectName: prdJson.name ?? body.repoName,
      prdJson: {
        archTemplate: prdJson.archTemplate,
        stack: prdJson.stack,
        description: prdJson.description,
        userStories: prdJson.userStories,
        dataBoundaries: prdJson.dataBoundaries,
        apiSpec: prdJson.apiSpec,
        constraints: prdJson.constraints,
      },
      buildMetadata: {
        buildId: body.buildId,
        studioAssignment: body.studioAssignment,
        githubUrl: body.githubUrl,
        vercelUrl: body.vercelUrl,
        completedAt: new Date().toISOString(),
      },
      devOpsOutput: body.devOpsOutput,
    }

    const executionInput: TransferExecutionInput = {
      deliveryId,
      buildId: body.buildId,
      commissionId: body.commissionId,
      repoName: body.repoName,
      clientGithubUsername: body.clientGithubUsername,
      clientGithubOrg: body.clientGithubOrg,
      workspaceDir: body.workspaceDir,
      buildStatus: body.buildStatus ?? 'SUCCESS',
      commissionStatus: body.commissionStatus ?? 'COMPLETED',
      templateOwner: body.templateOwner,
      templateRepo: body.templateRepo,
      docInput,
      apiContracts: body.apiContracts,
      implementedRoutes: body.implementedRoutes,
    }

    const agent = new TransferAgent({
      githubOrg: body.githubOrg,
    })

    const result = await agent.execute(executionInput)

    const status = result.success ? 200 : 500
    return NextResponse.json({ deliveryId, ...result }, { status })
  } catch (err) {
    console.error('[delivery/pipeline]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Pipeline failed' },
      { status: 500 },
    )
  }
}
