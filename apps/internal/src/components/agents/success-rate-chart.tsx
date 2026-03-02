'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface SuccessRateData {
  agentType: string
  successRate: number
  total: number
  succeeded: number
}

interface SuccessRateChartProps {
  data: SuccessRateData[]
}

function getBarColor(rate: number): string {
  if (rate >= 90) return '#22c55e'
  if (rate >= 70) return '#f59e0b'
  return '#ef4444'
}

export function SuccessRateChart({ data }: SuccessRateChartProps) {
  if (data.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-5">
        <h3 className="text-sm font-semibold mb-4">Success Rate by Agent Type</h3>
        <p className="text-xs text-gray-400">No build data available</p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-5">
      <h3 className="text-sm font-semibold mb-4">Success Rate by Agent Type</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical">
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="agentType"
            tick={{ fontSize: 11, fill: '#374151' }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              boxShadow: 'none',
            }}
            formatter={(value: number | undefined) => [
              value != null ? `${value.toFixed(1)}%` : '—',
              'Success Rate',
            ]}
          />
          <Bar dataKey="successRate" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.successRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
