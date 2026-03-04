'use client'

interface MetricGaugeProps {
  label: string
  value: number
  max?: number
  unit?: string
}

function getGradientColor(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct))
  let hue: number
  if (clamped <= 50) {
    hue = 142
  } else if (clamped <= 80) {
    const t = (clamped - 50) / 30
    hue = 142 - t * (142 - 38)
  } else {
    const t = (clamped - 80) / 20
    hue = 38 - t * 38
  }
  return `hsl(${Math.round(hue)}, 80%, 45%)`
}

const SIZE = 80
const STROKE = 7
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function MetricGauge({ label, value, max = 100, unit = '%' }: MetricGaugeProps) {
  const pct = Math.min((value / max) * 100, 100)
  const offset = CIRCUMFERENCE * (1 - pct / 100)
  const color = getGradientColor(pct)

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
          {Math.round(value)}
          {unit}
        </span>
      </div>
      <span className="text-[10px] text-gray-400 mt-1">{label}</span>
    </div>
  )
}
