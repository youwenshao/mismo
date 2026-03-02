import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, resource, resourceId, metadata } = body

  if (!action || !resource || !resourceId) {
    return NextResponse.json(
      { error: 'action, resource, and resourceId are required' },
      { status: 400 }
    )
  }

  const log = await prisma.auditLog.create({
    data: {
      userId: user.id,
      action,
      resource,
      resourceId,
      metadata: metadata ?? undefined,
    },
  })

  return NextResponse.json(log, { status: 201 })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const resource = searchParams.get('resource')
  const resourceId = searchParams.get('resourceId')
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)

  const where: Record<string, unknown> = {}
  if (resource) where.resource = resource
  if (resourceId) where.resourceId = resourceId

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
  })

  return NextResponse.json(logs)
}
