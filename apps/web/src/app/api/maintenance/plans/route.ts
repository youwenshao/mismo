import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { action?: string }

    if (body.action === 'list-active') {
      const plans = await prisma.maintenancePlan.findMany({
        where: {
          commission: {
            clientPreference: {
              maintenanceOptIn: true,
            },
          },
        },
        include: {
          commission: {
            select: {
              clientEmail: true,
              clientPreference: true,
            },
          },
        },
      })

      return NextResponse.json({
        plans: plans.map((p) => ({
          commissionId: p.commissionId,
          githubUrl: p.githubUrl,
          branch: 'main',
          lastCheckAt: p.lastCheckAt,
        })),
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[maintenance/plans] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
