import { prisma } from '@mismo/db'
import { evaluateAlerts } from '@/lib/alert-evaluator'
import { AlertsDashboard } from '@/components/alerts/alerts-dashboard'

export default async function AlertsPage() {
  const [builds, deliveries, monitoringAlerts, expiringCredentials] = await Promise.all([
    prisma.build.findMany({
      where: { status: { in: ['RUNNING', 'FAILED'] } },
      select: {
        id: true,
        commissionId: true,
        status: true,
        kimiqTokensUsed: true,
        executionIds: true,
        createdAt: true,
        updatedAt: true,
        commission: {
          select: { feasibilityScore: true, prdJson: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    prisma.delivery.findMany({
      where: { contractCheckPassed: false },
      select: { id: true, commissionId: true, contractCheckPassed: true },
    }),
    prisma.monitoringAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.credential.findMany({
      where: {
        rotationDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          not: null,
        },
      },
      select: {
        id: true,
        commissionId: true,
        service: true,
        rotationDate: true,
      },
    }),
  ])

  const buildAlerts = evaluateAlerts(builds, deliveries)

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Alerts</h1>
      <AlertsDashboard
        buildAlerts={buildAlerts}
        monitoringAlerts={JSON.parse(JSON.stringify(monitoringAlerts))}
        expiringCredentials={JSON.parse(JSON.stringify(expiringCredentials))}
      />
    </div>
  )
}
