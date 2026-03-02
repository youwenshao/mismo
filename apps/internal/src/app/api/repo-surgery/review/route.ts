import { NextRequest, NextResponse } from 'next/server'
import { ReviewGenerator } from '@mismo/ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      diffs,
      validationResults,
      impactReport,
      boundaryMap,
      changeRequest,
      repoUrl,
      surgeryId,
    } = body

    if (!surgeryId || !repoUrl || !changeRequest) {
      return NextResponse.json(
        { error: 'Missing required fields: surgeryId, repoUrl, changeRequest' },
        { status: 400 },
      )
    }

    const reviewer = new ReviewGenerator({
      cloneDir: body.cloneDir || `${process.env.REPO_SURGERY_WORKSPACE || '/tmp/mismo-surgery'}/${surgeryId}`,
      repoUrl,
    })

    const result = await reviewer.generate(
      surgeryId,
      changeRequest,
      diffs,
      validationResults,
      impactReport,
      boundaryMap,
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error('[repo-surgery/review] Review generation failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Review generation failed' },
      { status: 500 },
    )
  }
}
