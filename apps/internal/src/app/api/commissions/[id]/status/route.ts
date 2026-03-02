import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

const VALID_STATUSES = [
  'DRAFT',
  'DISCOVERY',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'ESCALATED',
]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { status } = body

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const commission = await prisma.commission.findUnique({ where: { id } })
  if (!commission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const previousStatus = commission.status

  const updated = await prisma.commission.update({
    where: { id },
    data: { status },
  })

  await logAudit({
    userId: user.id,
    action: 'commission.status_changed',
    resource: 'commission',
    resourceId: id,
    metadata: { previousStatus, newStatus: status },
  })

  return NextResponse.json(updated)
}
