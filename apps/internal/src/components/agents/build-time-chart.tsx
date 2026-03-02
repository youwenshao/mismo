'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface BuildTimeData {
  archetype: string
  avgMinutes: number
  count: number
}

interface BuildTimeChartProps {
  data: BuildTimeData[]
}

export function BuildTimeChart({ data }: BuildTimeChartProps) {
  if (data.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-5">
        <h3 className="text-sm font-semibold mb-4">Avg Build Time by Archetype</h3>
        <p className="text-xs text-gray-400">No build data available</p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-5">
      <h3 className="text-sm font-semibold mb-4">Avg Build Time by Archetype</h3>
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
            tickFormatter={(v) => `${v}m`}
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
              value != null ? `${value.toFixed(0)} min` : '—',
              'Avg Time',
            ]}
          />
          <Bar dataKey="avgMinutes" fill="#000" radius={[4, 4, 0, 0]} barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
