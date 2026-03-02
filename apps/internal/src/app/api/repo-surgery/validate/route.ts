import { NextRequest, NextResponse } from 'next/server'
import { ValidationGates } from '@mismo/ai'

interface ValidateRequestBody {
  cloneDir: string
  diffs: object
  contracts: object
  gate?: number | 'all'
  surgeryId: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ValidateRequestBody

    if (!body.cloneDir || !body.surgeryId) {
      return NextResponse.json(
        { error: 'Missing required fields: cloneDir and surgeryId' },
        { status: 400 },
      )
    }

    const gates = new ValidationGates(body.cloneDir)

    if (typeof body.gate === 'number') {
      const result = await gates.runGate(body.gate, body.diffs, body.contracts)
      return NextResponse.json(result)
    }

    const result = await gates.runAll(body.diffs, body.contracts)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[repo-surgery/validate] Validation failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Validation failed' },
      { status: 500 },
    )
  }
}
