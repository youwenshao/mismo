import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CredentialPayload {
  commissionId: string
  credentials: Array<{
    service: string
    token: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as CredentialPayload

    if (!body.commissionId || !Array.isArray(body.credentials) || body.credentials.length === 0) {
      return NextResponse.json(
        { error: 'Missing commissionId or credentials array' },
        { status: 400 },
      )
    }

    const { data: commission } = await supabase
      .from('Commission')
      .select('id, userId')
      .eq('id', body.commissionId)
      .single()

    if (!commission || commission.userId !== user.id) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
    }

    const results = []
    for (const cred of body.credentials) {
      if (!cred.service || !cred.token) continue

      const { data, error } = await supabase
        .from('Credential')
        .upsert(
          {
            commissionId: body.commissionId,
            service: cred.service,
            encryptedTokens: cred.token,
          },
          { onConflict: 'commissionId,service' },
        )
        .select('id, service')
        .single()

      if (error) {
        results.push({ service: cred.service, saved: false, error: error.message })
      } else {
        results.push({ service: cred.service, saved: true, id: data.id })
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error('Credential save failed:', err)
    return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const commissionId = request.nextUrl.searchParams.get('commissionId')
    if (!commissionId) {
      return NextResponse.json(
        { error: 'Missing commissionId query parameter' },
        { status: 400 },
      )
    }

    const { data: credentials } = await supabase
      .from('Credential')
      .select('id, service, rotationDate')
      .eq('commissionId', commissionId)

    const status = (credentials || []).map((c) => ({
      id: c.id,
      service: c.service,
      configured: true,
      rotationDate: c.rotationDate,
    }))

    return NextResponse.json({ credentials: status })
  } catch (err) {
    console.error('Credential fetch failed:', err)
    return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 })
  }
}
