import { NextRequest, NextResponse } from 'next/server'
import { planTransfer, type TransferConfig } from '@mismo/ai'

const VALID_AGE_TIERS = ['MINOR', 'ADULT'] as const
const VALID_TIERS = ['VIBE', 'VERIFIED', 'FOUNDRY'] as const

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<TransferConfig>

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

  const result = planTransfer(body as TransferConfig)

  return NextResponse.json(result)
}
