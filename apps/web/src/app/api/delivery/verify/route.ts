import { NextRequest, NextResponse } from 'next/server'
import { runVerificationChecklist } from '@mismo/ai'

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { projectId?: string }

  if (!body.projectId || typeof body.projectId !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid "projectId" in request body' },
      { status: 400 },
    )
  }

  const result = await runVerificationChecklist(body.projectId)

  return NextResponse.json(result)
}
