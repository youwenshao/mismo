'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'

interface MetricGaugeProps {
  label: string
  value: number
  max?: number
  unit?: string
}

function getColor(pct: number): string {
  if (pct >= 90) return '#dc2626'
  if (pct >= 70) return '#f59e0b'
  return '#22c55e'
}

export function MetricGauge({ label, value, max = 100, unit = '%' }: MetricGaugeProps) {
  const pct = Math.min((value / max) * 100, 100)
  const data = [{ name: label, value: pct, fill: getColor(pct) }]

  return (
    <div className="flex flex-col items-center">
      <div className="w-20 h-20 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            startAngle={180}
            endAngle={0}
            data={data}
            barSize={8}
          >
            <RadialBar
              dataKey="value"
              background={{ fill: '#f3f4f6' }}
              cornerRadius={4}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold pt-2">
          {Math.round(value)}{unit}
        </span>
      </div>
      <span className="text-[10px] text-gray-400 mt-1">{label}</span>
    </div>
  )
}
