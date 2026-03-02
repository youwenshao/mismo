import { Section } from '@react-email/components'
import * as React from 'react'

interface ProgressBarProps {
  percent: number
}

const track: React.CSSProperties = {
  backgroundColor: '#e6ebf1',
  borderRadius: '4px',
  height: '8px',
  width: '100%',
  overflow: 'hidden',
}

export function ProgressBar({ percent }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent))

  return (
    <Section>
      <div style={track}>
        <div
          style={{
            backgroundColor: '#5469d4',
            borderRadius: '4px',
            height: '8px',
            width: `${clamped}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <p style={{ fontSize: '14px', color: '#5469d4', fontWeight: '600', marginTop: '4px' }}>
        {clamped}%
      </p>
    </Section>
  )
}
