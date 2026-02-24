import { NextRequest, NextResponse } from 'next/server'
import { runAutomatedReview } from '@mismo/ai'

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    files?: { path: string; content: string }[]
  }

  if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json(
      { error: 'Missing or empty "files" array in request body' },
      { status: 400 },
    )
  }

  for (const file of body.files) {
    if (typeof file.path !== 'string' || typeof file.content !== 'string') {
      return NextResponse.json(
        { error: 'Each file must have a "path" (string) and "content" (string)' },
        { status: 400 },
      )
    }
  }

  const result = runAutomatedReview(body.files)

  return NextResponse.json(result)
}
