import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'

const VALID_GRANT_TYPES = ['UNLIMITED_7DAY', 'FREE_SOURCE', 'FREE_SOURCE_OR_DEPLOY'] as const

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  const grants = await prisma.userGrant.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, supabaseAuthId: true, role: true },
      },
      grantedByUser: {
        select: { id: true, supabaseAuthId: true, role: true },
      },
    },
  })

  return NextResponse.json(grants)
}

export async function POST(req: NextRequest) {
  let body: { userId?: string; grantType?: string; grantedById?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { userId, grantType, grantedById } = body

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }
  if (!grantType) {
    return NextResponse.json({ error: 'Missing grantType' }, { status: 400 })
  }
  if (!grantedById) {
    return NextResponse.json({ error: 'Missing grantedById' }, { status: 400 })
  }

  if (!VALID_GRANT_TYPES.includes(grantType as (typeof VALID_GRANT_TYPES)[number])) {
    return NextResponse.json(
      { error: `grantType must be one of: ${VALID_GRANT_TYPES.join(', ')}` },
      { status: 400 },
    )
  }

  const [user, granter] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.user.findUnique({ where: { id: grantedById } }),
  ])

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  if (!granter) {
    return NextResponse.json({ error: 'Granter user not found' }, { status: 404 })
  }

  let expiresAt: Date | undefined
  if (grantType === 'UNLIMITED_7DAY') {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
  }

  const grant = await prisma.userGrant.create({
    data: {
      userId,
      grantType: grantType as any,
      grantedBy: grantedById,
      expiresAt,
    },
    include: {
      user: {
        select: { id: true, supabaseAuthId: true, role: true },
      },
    },
  })

  return NextResponse.json(grant, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  let body: { grantId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { grantId } = body

  if (!grantId) {
    return NextResponse.json({ error: 'Missing grantId' }, { status: 400 })
  }

  const grant = await prisma.userGrant.findUnique({
    where: { id: grantId },
  })

  if (!grant) {
    return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
  }

  if (grant.usedAt) {
    return NextResponse.json(
      { error: 'Cannot cancel grant that has already been used' },
      { status: 400 },
    )
  }

  await prisma.userGrant.delete({
    where: { id: grantId },
  })

  return NextResponse.json({ deleted: true })
}
