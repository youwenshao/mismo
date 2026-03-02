interface CostAlert {
  buildId: string
  commissionEmail: string
  tokens: number
  estimate: number
  ratio: number
}

interface CostAlertCardProps {
  alerts: CostAlert[]
}

export function CostAlertCard({ alerts }: CostAlertCardProps) {
  if (alerts.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-5">
        <h3 className="text-sm font-semibold mb-2">Cost Alerts</h3>
        <p className="text-xs text-green-600">All builds within budget</p>
      </div>
    )
  }

  return (
    <div className="border border-red-200 rounded-lg bg-red-50 p-5">
      <h3 className="text-sm font-semibold text-red-800 mb-3">
        Cost Alerts ({alerts.length})
      </h3>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.buildId}
            className="flex items-center justify-between text-xs"
          >
            <div>
              <span className="font-mono text-red-700">{alert.buildId}</span>
              <span className="text-red-600 ml-2">{alert.commissionEmail}</span>
            </div>
            <span className="font-semibold text-red-800">
              {alert.ratio}x estimate
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
