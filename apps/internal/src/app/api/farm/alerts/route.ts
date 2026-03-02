import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const priority = searchParams.get('priority')
  const category = searchParams.get('category')
  const unresolved = searchParams.get('unresolved') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

  const where: Record<string, unknown> = {}
  if (priority) where.priority = priority
  if (category) where.category = category
  if (unresolved) where.resolvedAt = null

  const alerts = await prisma.monitoringAlert.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json({ alerts, count: alerts.length })
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { id: string; action: 'resolve' }

  if (body.action === 'resolve' && body.id) {
    const alert = await prisma.monitoringAlert.update({
      where: { id: body.id },
      data: { resolvedAt: new Date() },
    })
    return NextResponse.json({ alert })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
