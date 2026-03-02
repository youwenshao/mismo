interface QualityScoreData {
  label: string
  passed: number
  total: number
}

interface QualityScoreCardProps {
  scores: QualityScoreData[]
}

export function QualityScoreCard({ scores }: QualityScoreCardProps) {
  if (scores.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-5">
        <h3 className="text-sm font-semibold mb-4">Quality Scores</h3>
        <p className="text-xs text-gray-400">No quality data available</p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-5">
      <h3 className="text-sm font-semibold mb-4">Quality Scores</h3>
      <div className="space-y-3">
        {scores.map((score) => {
          const pct = score.total > 0 ? (score.passed / score.total) * 100 : 0
          return (
            <div key={score.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600">{score.label}</span>
                <span className="font-mono">
                  {pct.toFixed(0)}%{' '}
                  <span className="text-gray-400">
                    ({score.passed}/{score.total})
                  </span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct >= 90
                      ? 'bg-green-500'
                      : pct >= 70
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
