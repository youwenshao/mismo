import { NextRequest, NextResponse } from 'next/server'
import { vectorizeRepo } from '@mismo/ai'

interface VectorizeRequestBody {
  cloneDir: string
  surgeryId: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VectorizeRequestBody

    if (!body.cloneDir || !body.surgeryId) {
      return NextResponse.json(
        { error: 'Missing required fields: cloneDir and surgeryId' },
        { status: 400 },
      )
    }

    const result = await vectorizeRepo(body.surgeryId, body.cloneDir)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[repo-surgery/vectorize] Vectorization failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Vectorization failed' },
      { status: 500 },
    )
  }
}
