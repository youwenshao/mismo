import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, clientEmail, tier } = body as {
      projectId: string
      clientEmail: string
      tier: string
    }

    if (!projectId || !clientEmail || !tier) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, clientEmail, and tier' },
        { status: 400 },
      )
    }

    // In production this would integrate with DocuSign or similar e-signature API
    const envelopeId = `mock_env_${crypto.randomUUID()}`

    return NextResponse.json({
      success: true,
      contract: {
        envelopeId,
        projectId,
        clientEmail,
        tier: tier.toUpperCase(),
        status: 'SENT',
        sentAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Contract send failed:', error)
    return NextResponse.json({ error: 'Failed to send contract' }, { status: 500 })
  }
}
