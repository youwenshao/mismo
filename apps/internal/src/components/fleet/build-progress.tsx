interface BuildProgressProps {
  build: {
    id: string
    commissionId: string
    status: string
    createdAt: string
  }
}

export function BuildProgress({ build }: BuildProgressProps) {
  const elapsed = Date.now() - new Date(build.createdAt).getTime()
  const minutes = Math.floor(elapsed / 60000)
  const estimatedTotal = 30 // assume 30 min average build
  const pct = Math.min((minutes / estimatedTotal) * 100, 95)

  return (
    <div className="text-xs">
      <div className="flex justify-between text-gray-500 mb-1">
        <span className="font-mono truncate max-w-[120px]">{build.commissionId.slice(0, 8)}</span>
        <span>{minutes}m</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-black rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
