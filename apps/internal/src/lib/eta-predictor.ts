interface HistoricalBuild {
  createdAt: Date
  updatedAt: Date
  status: string
}

interface PredictionResult {
  estimatedCompletionAt: Date
  estimatedMinutesRemaining: number
  confidence: 'high' | 'medium' | 'low'
  basedOnSampleSize: number
}

export function predictEta(
  currentBuildStart: Date,
  historicalBuilds: HistoricalBuild[]
): PredictionResult | null {
  const completedBuilds = historicalBuilds.filter(
    (b) => b.status === 'SUCCESS'
  )

  if (completedBuilds.length === 0) return null

  const durations = completedBuilds.map(
    (b) => b.updatedAt.getTime() - b.createdAt.getTime()
  )

  durations.sort((a, b) => a - b)
  const median = durations[Math.floor(durations.length / 2)]
  const elapsed = Date.now() - currentBuildStart.getTime()
  const remaining = Math.max(median - elapsed, 0)

  const confidence: PredictionResult['confidence'] =
    completedBuilds.length >= 10
      ? 'high'
      : completedBuilds.length >= 3
        ? 'medium'
        : 'low'

  return {
    estimatedCompletionAt: new Date(Date.now() + remaining),
    estimatedMinutesRemaining: Math.ceil(remaining / 60000),
    confidence,
    basedOnSampleSize: completedBuilds.length,
  }
}
