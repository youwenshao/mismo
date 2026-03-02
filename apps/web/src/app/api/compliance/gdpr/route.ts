import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@mismo/db'
import { checkGDPRCompliance } from '@mismo/ai'

export async function GET() {
  const status = checkGDPRCompliance({
    dataExportEndpoint: true,
    dataDeletionEndpoint: true,
    privacyPolicy: true,
    cookieConsent: true,
    dataProcessingAgreement: true,
  })

  const compliantCount = Object.values(status).filter(Boolean).length
  const totalChecks = Object.keys(status).length

  return NextResponse.json({
    status,
    summary: {
      compliant: compliantCount,
      total: totalChecks,
      percentage: Math.round((compliantCount / totalChecks) * 100),
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseAuthId: authUser.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = (await req.json()) as { type: 'export' | 'deletion' }

    if (!body.type) {
      return NextResponse.json({ error: 'Missing type in request body' }, { status: 400 })
    }

    if (body.type === 'export') {
      const [commissions, projects, interviewSessions] = await Promise.all([
        prisma.commission.findMany({
          where: { userId: dbUser.id },
          include: {
            builds: { select: { id: true, status: true, createdAt: true } },
            deliveries: { select: { id: true, status: true, repoUrl: true, createdAt: true } },
            feedbacks: true,
          },
        }),
        prisma.project.findMany({
          where: { userId: dbUser.id },
          include: {
            prd: { select: { id: true, content: true, createdAt: true } },
          },
        }),
        prisma.interviewSession.findMany({
          where: { userId: dbUser.id },
          select: { id: true, transcript: true, startedAt: true, completedAt: true },
        }),
      ])

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          id: dbUser.id,
          role: dbUser.role,
          createdAt: dbUser.createdAt,
        },
        commissions,
        projects,
        interviewSessions,
      }

      await prisma.auditLog.create({
        data: {
          userId: dbUser.id,
          action: 'GDPR_DATA_EXPORT',
          resource: 'User',
          resourceId: dbUser.id,
          metadata: { requestedAt: new Date().toISOString() },
        },
      })

      return NextResponse.json({
        message: 'Data export completed',
        data: exportData,
      })
    }

    if (body.type === 'deletion') {
      await prisma.$transaction(async (tx) => {
        await tx.feedback.deleteMany({ where: { commission: { userId: dbUser.id } } })
        await tx.notification.deleteMany({ where: { commission: { userId: dbUser.id } } })
        await tx.clientPreference.deleteMany({ where: { commission: { userId: dbUser.id } } })
        await tx.credential.deleteMany({ where: { commission: { userId: dbUser.id } } })
        await tx.delivery.deleteMany({ where: { commission: { userId: dbUser.id } } })
        await tx.hostingTransfer.deleteMany({ where: { commission: { userId: dbUser.id } } })
        await tx.maintenancePlan.deleteMany({ where: { commission: { userId: dbUser.id } } })
        await tx.build.deleteMany({ where: { commission: { userId: dbUser.id } } })
        await tx.repoSurgery.deleteMany({ where: { commission: { userId: dbUser.id } } })
        await tx.commission.deleteMany({ where: { userId: dbUser.id } })

        await tx.pRDComment.deleteMany({ where: { userId: dbUser.id } })
        await tx.interviewSession.deleteMany({ where: { userId: dbUser.id } })
        await tx.buildLog.deleteMany({ where: { project: { userId: dbUser.id } } })
        await tx.tokenUsage.deleteMany({ where: { project: { userId: dbUser.id } } })
        await tx.contract.deleteMany({ where: { project: { userId: dbUser.id } } })
        await tx.reviewTask.deleteMany({ where: { project: { userId: dbUser.id } } })
        await tx.project.deleteMany({ where: { userId: dbUser.id } })

        await tx.auditLog.create({
          data: {
            userId: dbUser.id,
            action: 'GDPR_DATA_DELETION',
            resource: 'User',
            resourceId: dbUser.id,
            metadata: {
              requestedAt: new Date().toISOString(),
              status: 'completed',
            },
          },
        })

        await tx.user.delete({ where: { id: dbUser.id } })
      })

      return NextResponse.json({
        message: 'Data deletion completed. Your account and all associated data have been permanently removed.',
        deletedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json(
      { error: 'Invalid type - must be "export" or "deletion"' },
      { status: 400 },
    )
  } catch (err) {
    console.error('GDPR request failed:', err)
    return NextResponse.json({ error: 'Failed to process GDPR request' }, { status: 500 })
  }
}
