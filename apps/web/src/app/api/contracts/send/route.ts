import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import { getSessionUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

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

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (project.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.contract.findFirst({
      where: { projectId, type: tier.toUpperCase(), status: { not: 'VOIDED' } },
    })
    if (existing) {
      return NextResponse.json({
        success: true,
        contract: {
          id: existing.id,
          envelopeId: existing.envelopeId,
          projectId: existing.projectId,
          clientEmail,
          tier: tier.toUpperCase(),
          status: existing.status,
          createdAt: existing.createdAt.toISOString(),
        },
        message: 'Contract already exists for this project and tier',
      })
    }

    const contract = await prisma.contract.create({
      data: {
        projectId,
        type: tier.toUpperCase(),
        status: 'SENT',
      },
    })

    return NextResponse.json({
      success: true,
      contract: {
        id: contract.id,
        envelopeId: contract.envelopeId,
        projectId: contract.projectId,
        clientEmail,
        tier: tier.toUpperCase(),
        status: contract.status,
        createdAt: contract.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Contract send failed:', error)
    return NextResponse.json({ error: 'Failed to send contract' }, { status: 500 })
  }
}
