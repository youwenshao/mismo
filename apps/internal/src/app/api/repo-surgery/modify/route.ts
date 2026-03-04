import { NextRequest, NextResponse } from 'next/server'
import { ImpactAnalysisAgent, DiffGenerationAgent } from '@mismo/ai'

interface ImpactRequestBody {
  operation: 'impact'
  changeRequest: string
  boundaryMap: object
  contracts: object
  collectionName: string
  forbiddenFiles?: string[]
  surgeryId: string
}

interface DiffRequestBody {
  operation: 'diff'
  impactReport: object
  contracts: object
  changeRequest: string
  cloneDir: string
  surgeryId: string
}

type ModifyRequestBody = ImpactRequestBody | DiffRequestBody

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ModifyRequestBody

    if (!body.operation || !body.surgeryId) {
      return NextResponse.json(
        { error: 'Missing required fields: operation and surgeryId' },
        { status: 400 },
      )
    }

    if (body.operation === 'impact') {
      const agent = new ImpactAnalysisAgent({
        collectionName: body.collectionName,
        forbiddenFiles: body.forbiddenFiles,
      })
      const report = await agent.analyze(
        body.changeRequest,
        body.boundaryMap as any,
        body.contracts as any,
      )
      return NextResponse.json({ impactReport: report })
    }

    if (body.operation === 'diff') {
      const agent = new DiffGenerationAgent({
        cloneDir: body.cloneDir,
      })
      const diffs = await agent.generate(
        body.impactReport as any,
        body.contracts as any,
        body.changeRequest,
      )
      return NextResponse.json({ diffs })
    }

    return NextResponse.json(
      { error: `Unknown operation: ${(body as { operation: string }).operation}` },
      { status: 400 },
    )
  } catch (err) {
    console.error('[repo-surgery/modify] Modification failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Modification failed' },
      { status: 500 },
    )
  }
}
