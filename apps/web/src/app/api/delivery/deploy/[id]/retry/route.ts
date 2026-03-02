import { NextRequest, NextResponse } from 'next/server'
import { HostingTransferOrchestrator } from '@mismo/ai'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const orchestrator = new HostingTransferOrchestrator()
    const result = await orchestrator.retry(id)

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[retry] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
