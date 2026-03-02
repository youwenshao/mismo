import { NextRequest, NextResponse } from 'next/server'
import { verifyPostTransfer } from '@mismo/ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.clientGithubUsername || !body.repoOwner || !body.repoName) {
      return NextResponse.json(
        { error: 'Missing required fields: clientGithubUsername, repoOwner, repoName' },
        { status: 400 },
      )
    }

    const result = await verifyPostTransfer({
      deliveryId: body.deliveryId ?? '',
      transferredRepoUrl: body.transferredRepoUrl ?? '',
      clientGithubUsername: body.clientGithubUsername,
      repoOwner: body.repoOwner,
      repoName: body.repoName,
      requiredEnvVars: body.requiredEnvVars,
      deployedUrl: body.deployedUrl,
    })

    const status = result.allPassed ? 200 : 422
    return NextResponse.json(result, { status })
  } catch (err) {
    console.error('[delivery/verify]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verification failed' },
      { status: 500 },
    )
  }
}
