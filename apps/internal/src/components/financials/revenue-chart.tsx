'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number }>
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-5">
        <h3 className="text-sm font-semibold mb-4">Monthly Revenue</h3>
        <p className="text-xs text-gray-400">No revenue data available</p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-5">
      <h3 className="text-sm font-semibold mb-4">Monthly Revenue</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={50}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              boxShadow: 'none',
            }}
            formatter={(value: number | undefined) => [
              value != null ? `$${value.toLocaleString()}` : '—',
              'Revenue',
            ]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#000"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
