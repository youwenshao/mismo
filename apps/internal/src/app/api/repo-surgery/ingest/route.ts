import { NextRequest, NextResponse } from 'next/server'
import { RepoIngestion } from '@mismo/ai'

interface IngestRequestBody {
  repoUrl: string
  branch?: string
  surgeryId: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as IngestRequestBody

    if (!body.repoUrl || !body.surgeryId) {
      return NextResponse.json(
        { error: 'Missing required fields: repoUrl and surgeryId' },
        { status: 400 },
      )
    }

    const ingestion = new RepoIngestion()
    const result = await ingestion.ingest(body.surgeryId, body.repoUrl, body.branch)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[repo-surgery/ingest] Ingestion failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ingestion failed' },
      { status: 500 },
    )
  }
}
