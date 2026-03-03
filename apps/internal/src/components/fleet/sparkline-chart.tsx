'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface SparklineChartProps {
  data: number[]
  label: string
  color?: string
}

export function SparklineChart({ data, label, color = '#000' }: SparklineChartProps) {
  const chartData = data.map((v, i) => ({ i, v }))

  return (
    <div className="flex-1 min-w-0">
      <span className="text-[9px] text-gray-400">{label}</span>
      <div className="h-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
