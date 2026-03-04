import { NextRequest, NextResponse } from 'next/server'
import { BoundaryMapper, ContractExtractor, ASTParser } from '@mismo/ai'

interface AnalyzeRequestBody {
  cloneDir: string
  astData: object
  surgeryId: string
  operation: 'boundary' | 'contracts' | 'both'
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AnalyzeRequestBody

    if (!body.cloneDir || !body.surgeryId || !body.operation) {
      return NextResponse.json(
        { error: 'Missing required fields: cloneDir, surgeryId, and operation' },
        { status: 400 },
      )
    }

    const parser = new ASTParser()
    const boundaryMapper = new BoundaryMapper()
    const contractExtractor = new ContractExtractor()

    const astData = await parser.parseDirectory(body.cloneDir)

    if (body.operation === 'boundary') {
      const boundaryMap = await boundaryMapper.classifyDirectory(body.cloneDir, astData)
      return NextResponse.json({ boundaryMap })
    }

    if (body.operation === 'contracts') {
      const contracts = await contractExtractor.extract(body.cloneDir, astData)
      return NextResponse.json({ contracts })
    }

    const [boundaryMap, contracts] = await Promise.all([
      boundaryMapper.classifyDirectory(body.cloneDir, astData),
      contractExtractor.extract(body.cloneDir, astData),
    ])

    return NextResponse.json({ boundaryMap, contracts })
  } catch (err) {
    console.error('[repo-surgery/analyze] Analysis failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 },
    )
  }
}
