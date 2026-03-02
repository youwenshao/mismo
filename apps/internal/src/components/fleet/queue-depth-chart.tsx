'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface QueueDataPoint {
  time: string
  studio1: number
  studio2: number
  studio3: number
}

interface QueueDepthChartProps {
  data: QueueDataPoint[]
}

export function QueueDepthChart({ data }: QueueDepthChartProps) {
  if (data.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-5">
        <h3 className="text-sm font-semibold mb-4">Queue Depth Over Time</h3>
        <p className="text-xs text-gray-400">No queue data available</p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-5">
      <h3 className="text-sm font-semibold mb-4">Queue Depth Over Time</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              boxShadow: 'none',
            }}
          />
          <Area
            type="monotone"
            dataKey="studio1"
            stackId="1"
            stroke="#000"
            fill="#000"
            fillOpacity={0.1}
            name="Studio 1"
          />
          <Area
            type="monotone"
            dataKey="studio2"
            stackId="1"
            stroke="#6b7280"
            fill="#6b7280"
            fillOpacity={0.1}
            name="Studio 2"
          />
          <Area
            type="monotone"
            dataKey="studio3"
            stackId="1"
            stroke="#d1d5db"
            fill="#d1d5db"
            fillOpacity={0.1}
            name="Studio 3"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
