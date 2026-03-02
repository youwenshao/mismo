import { NextRequest, NextResponse } from 'next/server'
import { checkDependencies, createMaintenancePR } from '@mismo/comms'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      githubUrl?: string
      branch?: string
      autoCreatePrs?: boolean
      commissionId?: string
    }

    if (!body.githubUrl || typeof body.githubUrl !== 'string') {
      return NextResponse.json({ error: 'Missing githubUrl' }, { status: 400 })
    }

    const result = await checkDependencies(body.githubUrl, body.branch ?? 'main')

    const prsCreated: Array<{ type: string; prUrl: string; prNumber: number }> = []

    if (body.autoCreatePrs) {
      for (const rec of result.recommendations) {
        if (rec.action === 'client-approval') continue

        try {
          const pr = await createMaintenancePR({
            githubUrl: body.githubUrl,
            branch: body.branch ?? 'main',
            packages: rec.packages,
            type: rec.action === 'auto-pr' ? 'security-patch' : 'minor-update',
          })
          prsCreated.push({ type: rec.action, ...pr })
        } catch (err) {
          console.error(`[maintenance] Failed to create PR for ${rec.action}:`, err)
        }
      }
    }

    return NextResponse.json({ ...result, prsCreated })
  } catch (err) {
    console.error('[maintenance/check] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
