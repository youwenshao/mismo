interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function StatCard({ label, value, sublabel, trend }: StatCardProps) {
  const trendColor =
    trend === 'up'
      ? 'text-green-600'
      : trend === 'down'
        ? 'text-red-600'
        : 'text-gray-400'

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {sublabel && (
        <p className={`text-xs mt-1 ${trendColor}`}>{sublabel}</p>
      )}
    </div>
  )
}
