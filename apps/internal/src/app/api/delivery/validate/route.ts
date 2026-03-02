import { NextRequest, NextResponse } from 'next/server'
import { validatePreTransfer } from '@mismo/ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.workspaceDir || typeof body.workspaceDir !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "workspaceDir"' },
        { status: 400 },
      )
    }

    const result = await validatePreTransfer({
      workspaceDir: body.workspaceDir,
      buildStatus: body.buildStatus ?? 'SUCCESS',
      commissionStatus: body.commissionStatus ?? 'COMPLETED',
      apiContracts: body.apiContracts,
      implementedRoutes: body.implementedRoutes,
      contractCheckerUrl: body.contractCheckerUrl,
    })

    const status = result.allPassed ? 200 : 422
    return NextResponse.json(result, { status })
  } catch (err) {
    console.error('[delivery/validate]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Validation failed' },
      { status: 500 },
    )
  }
}
