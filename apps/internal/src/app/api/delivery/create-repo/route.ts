import { NextRequest, NextResponse } from 'next/server'
import { GitHubClient } from '@mismo/ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.repoName || typeof body.repoName !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "repoName"' }, { status: 400 })
    }
    if (!body.workspaceDir || typeof body.workspaceDir !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "workspaceDir"' }, { status: 400 })
    }

    const github = new GitHubClient()
    const org = body.githubOrg
      || process.env.GITHUB_DELIVERY_ORG
      || process.env.GITHUB_ORG
      || 'mismo-agency'

    let repoInfo
    if (body.templateOwner && body.templateRepo) {
      repoInfo = await github.createFromTemplate(
        body.templateOwner,
        body.templateRepo,
        org,
        body.repoName,
      )
    } else {
      repoInfo = await github.createRepo(org, body.repoName, {
        private: true,
        autoInit: true,
        licenseTemplate: 'mit',
        gitignoreTemplate: 'Node',
      })
    }

    const [owner, repo] = repoInfo.fullName.split('/')

    return NextResponse.json({
      success: true,
      repoUrl: repoInfo.htmlUrl,
      repoOwner: owner,
      repoName: repo,
      fullName: repoInfo.fullName,
    })
  } catch (err) {
    console.error('[delivery/create-repo]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Repo creation failed', success: false },
      { status: 500 },
    )
  }
}
