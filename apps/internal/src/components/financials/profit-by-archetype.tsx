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

interface ProfitByArchetypeProps {
  data: Array<{
    archetype: string
    revenue: number
    cost: number
    profit: number
    margin: number
    count: number
  }>
}

export function ProfitByArchetype({ data }: ProfitByArchetypeProps) {
  if (data.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-5">
        <h3 className="text-sm font-semibold mb-4">Profit by Archetype</h3>
        <p className="text-xs text-gray-400">No data available</p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-5">
      <h3 className="text-sm font-semibold mb-4">Profit Margin by Archetype</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis
            dataKey="archetype"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              boxShadow: 'none',
            }}
            formatter={(value: number | undefined) => [
              value != null ? `${value}%` : '—',
              'Margin',
            ]}
          />
          <Bar dataKey="margin" radius={[4, 4, 0, 0]} barSize={40}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.margin >= 50 ? '#22c55e' : entry.margin >= 20 ? '#000' : '#ef4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
