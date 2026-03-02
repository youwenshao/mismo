import { prisma } from '@mismo/db'
import { evaluateAlerts } from '@/lib/alert-evaluator'

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const severityStyles: Record<string, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
}

const severityDot: Record<string, string> = {
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
}

export default async function AlertsPage() {
  const [builds, deliveries] = await Promise.all([
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
          select: {
            feasibilityScore: true,
            prdJson: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    prisma.delivery.findMany({
      where: { contractCheckPassed: false },
      select: {
        id: true,
        commissionId: true,
        contractCheckPassed: true,
      },
    }),
  ])

  const alerts = evaluateAlerts(builds, deliveries)

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Alerts</h1>

      {alerts.length === 0 ? (
        <div className="border border-green-200 rounded-lg bg-green-50 p-6 text-center">
          <p className="text-sm text-green-700">All systems nominal — no active alerts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 px-4 py-3 border rounded-lg ${severityStyles[alert.severity]}`}
            >
              <span
                className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityDot[alert.severity]}`}
              />
              <div className="flex-1">
                <p className="text-sm">{alert.message}</p>
                <p className="text-[10px] opacity-60 mt-1">
                  {formatTimestamp(alert.timestamp)}
                </p>
              </div>
              <span className="text-[10px] uppercase font-semibold opacity-60">
                {alert.severity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
