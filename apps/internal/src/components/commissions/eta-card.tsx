'use client'

import { useEffect, useState } from 'react'

interface Prediction {
  estimatedCompletionAt: string
  estimatedMinutesRemaining: number
  confidence: 'high' | 'medium' | 'low'
  basedOnSampleSize: number
}

interface EtaCardProps {
  commissionId: string
}

const confidenceStyles: Record<string, string> = {
  high: 'text-green-600',
  medium: 'text-amber-600',
  low: 'text-gray-400',
}

export function EtaCard({ commissionId }: EtaCardProps) {
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/predictions/${commissionId}`)
      .then((res) => res.json())
      .then((data) => setPrediction(data.prediction))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [commissionId])

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-white animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-32 mb-2" />
        <div className="h-6 bg-gray-50 rounded w-48" />
      </div>
    )
  }

  if (!prediction) return null

  const eta = new Date(prediction.estimatedCompletionAt)
  const isPast = eta.getTime() < Date.now()

  return (
    <div
      className={`border rounded-lg p-4 bg-white ${isPast ? 'border-red-200' : 'border-gray-200'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Estimated Delivery
        </h4>
        <span className={`text-[10px] ${confidenceStyles[prediction.confidence]}`}>
          {prediction.confidence} confidence ({prediction.basedOnSampleSize} samples)
        </span>
      </div>

      <p className={`text-lg font-semibold ${isPast ? 'text-red-600' : 'text-black'}`}>
        {prediction.estimatedMinutesRemaining > 0
          ? `${prediction.estimatedMinutesRemaining} min remaining`
          : 'Overdue'}
      </p>

      <p className="text-xs text-gray-400 mt-1">
        ETA: {eta.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </p>

      {isPast && (
        <p className="text-xs text-red-500 mt-2">
          Build is behind schedule — consider investigating
        </p>
      )}
    </div>
  )
}
