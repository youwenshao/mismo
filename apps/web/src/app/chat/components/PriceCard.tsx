'use client'

import type { PriceEstimate } from '@mismo/shared'

interface PriceCardProps {
  estimate: PriceEstimate
}

function DifficultyDots({ score }: { score: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${i <= score ? 'bg-gray-900' : 'bg-gray-200'}`}
        />
      ))}
    </div>
  )
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('zh-HK', {
    style: 'currency',
    currency: 'HKD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function PriceCard({ estimate }: PriceCardProps) {
  return (
    <div className="mt-4 p-5 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Project Estimate</h3>
        <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
          {estimate.tierRecommendation}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-500">Investment</span>
          <span className="text-lg font-semibold text-gray-900">
            {formatPrice(estimate.priceRange.min)} &ndash; {formatPrice(estimate.priceRange.max)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Timeline</span>
          <span className="text-sm font-medium text-gray-700">
            {estimate.estimatedTimeline.min}&ndash;
            {estimate.estimatedTimeline.max} weeks
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Complexity</span>
          <DifficultyDots score={estimate.difficultyScore} />
        </div>

        {estimate.breakdown.hostingMonthly.min > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">Monthly hosting</span>
            <span className="text-xs text-gray-500">
              {formatPrice(estimate.breakdown.hostingMonthly.min)}&ndash;
              {formatPrice(estimate.breakdown.hostingMonthly.max)}/mo
            </span>
          </div>
        )}
      </div>

      {estimate.feasibilityNotes.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Notes</p>
          <ul className="space-y-1">
            {estimate.feasibilityNotes.map((note, i) => (
              <li key={i} className="text-xs text-gray-500">
                &bull; {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
