import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@mismo/db'

interface CredentialPayload {
  commissionId: string
  credentials: Array<{
    service: string
    token: string
  }>
}

async function resolveUserId(supabaseAuthId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { supabaseAuthId },
    select: { id: true },
  })
  return user?.id ?? null
}

async function verifyCommissionOwnership(
  commissionId: string,
  userId: string,
): Promise<boolean> {
  const commission = await prisma.commission.findFirst({
    where: { id: commissionId, userId },
    select: { id: true },
  })
  return commission !== null
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

    const prismaUserId = await resolveUserId(user.id)
    if (!prismaUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as CredentialPayload

    if (!body.commissionId || !Array.isArray(body.credentials) || body.credentials.length === 0) {
      return NextResponse.json(
        { error: 'Missing commissionId or credentials array' },
        { status: 400 },
      )
    }

    const isOwner = await verifyCommissionOwnership(body.commissionId, prismaUserId)
    if (!isOwner) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
    }

    const results = []
    for (const cred of body.credentials) {
      if (!cred.service || !cred.token) continue

      try {
        const saved = await prisma.credential.upsert({
          where: {
            commissionId_service: {
              commissionId: body.commissionId,
              service: cred.service,
            },
          },
          update: { encryptedTokens: cred.token },
          create: {
            commissionId: body.commissionId,
            service: cred.service,
            encryptedTokens: cred.token,
          },
          select: { id: true, service: true },
        })
        results.push({ service: cred.service, saved: true, id: saved.id })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        results.push({ service: cred.service, saved: false, error: message })
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

    const prismaUserId = await resolveUserId(user.id)
    if (!prismaUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const commissionId = request.nextUrl.searchParams.get('commissionId')
    if (!commissionId) {
      return NextResponse.json(
        { error: 'Missing commissionId query parameter' },
        { status: 400 },
      )
    }

    const isOwner = await verifyCommissionOwnership(commissionId, prismaUserId)
    if (!isOwner) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
    }

    const credentials = await prisma.credential.findMany({
      where: { commissionId },
      select: { id: true, service: true, rotationDate: true },
    })

    const status = credentials.map((c) => ({
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
