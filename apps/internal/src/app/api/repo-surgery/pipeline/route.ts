import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { RepoSurgeryPipeline, repoSurgeryRequestSchema } from '@mismo/ai'
import { ZodError } from 'zod'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = repoSurgeryRequestSchema.parse(body)
    const surgeryId = crypto.randomUUID()

    const pipeline = new RepoSurgeryPipeline()
    const result = await pipeline.run(surgeryId, parsed)

    return NextResponse.json({ surgeryId, ...result })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: err.flatten() },
        { status: 400 },
      )
    }

    console.error('[repo-surgery/pipeline] Pipeline failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Pipeline failed' },
      { status: 500 },
    )
  }
}
