import { NextRequest, NextResponse } from 'next/server'
import { GitHubClient } from '@mismo/ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.clientGithubUsername || typeof body.clientGithubUsername !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "clientGithubUsername"' },
        { status: 400 },
      )
    }
    if (!body.repoOwner || !body.repoName) {
      return NextResponse.json(
        { error: 'Missing "repoOwner" or "repoName"' },
        { status: 400 },
      )
    }

    const github = new GitHubClient()
    const transferTarget = body.clientGithubOrg ?? body.clientGithubUsername

    const invite = await github.inviteCollaborator(
      body.repoOwner,
      body.repoName,
      body.clientGithubUsername,
      'admin',
    )

    const transferResult = await github.transferRepo(
      body.repoOwner,
      body.repoName,
      transferTarget,
    )

    if (!transferResult.success) {
      return NextResponse.json({
        success: false,
        transferStatus: 'failed',
        error: transferResult.newUrl,
        invitationId: invite.invitationId,
      }, { status: 500 })
    }

    let adminVerified = false
    try {
      const perm = await github.verifyAdminAccess(
        transferTarget,
        body.repoName,
        body.clientGithubUsername,
      )
      adminVerified = perm.permission === 'admin'
    } catch {
      // verification is best-effort immediately after transfer
    }

    return NextResponse.json({
      success: true,
      transferStatus: 'completed',
      transferredUrl: transferResult.newUrl,
      adminVerified,
      invitationId: invite.invitationId,
    })
  } catch (err) {
    console.error('[delivery/transfer]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Transfer failed', success: false },
      { status: 500 },
    )
  }
}
