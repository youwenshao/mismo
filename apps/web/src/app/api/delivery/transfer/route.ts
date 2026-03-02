import { NextRequest, NextResponse } from 'next/server'
import {
  planTransfer,
  executeTransfer,
  type TransferConfig,
} from '@mismo/ai'

const VALID_AGE_TIERS = ['MINOR', 'ADULT'] as const
const VALID_TIERS = ['VIBE', 'VERIFIED', 'FOUNDRY'] as const

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<TransferConfig> & {
    execute?: boolean
    buildId?: string
    commissionId?: string
    workspaceDir?: string
    githubOrg?: string
  }

  if (!body.projectId || typeof body.projectId !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid "projectId"' }, { status: 400 })
  }
  if (!body.clientGithubUsername || typeof body.clientGithubUsername !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid "clientGithubUsername"' },
      { status: 400 },
    )
  }
  if (!body.repoName || typeof body.repoName !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid "repoName"' }, { status: 400 })
  }
  if (!body.ageTier || !VALID_AGE_TIERS.includes(body.ageTier)) {
    return NextResponse.json({ error: '"ageTier" must be "MINOR" or "ADULT"' }, { status: 400 })
  }
  if (!body.tier || !VALID_TIERS.includes(body.tier)) {
    return NextResponse.json(
      { error: '"tier" must be "VIBE", "VERIFIED", or "FOUNDRY"' },
      { status: 400 },
    )
  }

  const config = body as TransferConfig

  if (body.execute) {
    if (!body.buildId || !body.commissionId || !body.workspaceDir) {
      return NextResponse.json(
        { error: 'Execute mode requires "buildId", "commissionId", and "workspaceDir"' },
        { status: 400 },
      )
    }

    try {
      const result = await executeTransfer({
        config,
        buildId: body.buildId,
        commissionId: body.commissionId,
        workspaceDir: body.workspaceDir,
        githubOrg: body.githubOrg,
        docInput: {
          projectName: body.repoName,
          prdJson: {},
          buildMetadata: {
            buildId: body.buildId,
            completedAt: new Date().toISOString(),
          },
        },
      })

      return NextResponse.json({ mode: 'execute', ...result })
    } catch (err) {
      console.error('[delivery/transfer] Execute failed:', err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Transfer execution failed' },
        { status: 500 },
      )
    }
  }

  const result = planTransfer(config)
  return NextResponse.json({ mode: 'plan', ...result })
}
