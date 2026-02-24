import { NextRequest, NextResponse } from 'next/server'
import { generateDebtLedger, formatDebtReport } from '@mismo/ai'

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json(
      { error: 'Missing "projectId" query parameter' },
      { status: 400 },
    )
  }

  const ledger = generateDebtLedger(projectId)
  const report = formatDebtReport(ledger)

  return NextResponse.json({ ledger, report })
}
