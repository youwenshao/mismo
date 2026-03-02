'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface CostBreakdownProps {
  data: Array<{
    buildId: string
    tokenCost: number
    infraCost: number
    totalCost: number
    archetype: string
  }>
}

export function CostBreakdown({ data }: CostBreakdownProps) {
  if (data.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-5">
        <h3 className="text-sm font-semibold mb-4">Cost Breakdown per Build</h3>
        <p className="text-xs text-gray-400">No cost data available</p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-5">
      <h3 className="text-sm font-semibold mb-4">Cost Breakdown per Build</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data.slice(0, 15)}>
          <XAxis
            dataKey="buildId"
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
            width={40}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              boxShadow: 'none',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar
            dataKey="tokenCost"
            stackId="cost"
            fill="#000"
            name="Kimi API"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="infraCost"
            stackId="cost"
            fill="#9ca3af"
            name="Infrastructure"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
