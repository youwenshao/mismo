import { Text } from '@react-email/components'
import * as React from 'react'
import { Layout } from '../components/Layout'
import { ProgressBar } from '../components/ProgressBar'
import { getStrings, type Locale } from '../../i18n/strings'
import type { BuildProgressData } from '../registry'

interface Props {
  data: BuildProgressData
  locale: Locale
}

const heading: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1a1a2e',
  marginBottom: '16px',
}

const body: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
}

const detail: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#6b7280',
  backgroundColor: '#f9fafb',
  padding: '12px 16px',
  borderRadius: '6px',
  borderLeft: '3px solid #5469d4',
}

export function BuildProgressEmail({ data, locale }: Props) {
  const s = getStrings(locale)

  return (
    <Layout preview={s.buildProgress.subject(data.projectName, data.progressPercent)} locale={locale}>
      <Text style={heading}>{s.buildProgress.heading}</Text>
      <Text style={body}>{s.greeting(data.clientName)}</Text>
      <Text style={body}>
        {s.buildProgress.body(data.projectName, data.progressPercent, data.progressDetail)}
      </Text>
      <ProgressBar percent={data.progressPercent} />
      <Text style={detail}>{s.buildProgress.currentStep(data.nextStep)}</Text>
      {data.estimatedCompletion && (
        <Text style={{ ...body, fontStyle: 'italic', color: '#8898aa' }}>
          {s.buildProgress.estimated(data.estimatedCompletion)}
        </Text>
      )}
    </Layout>
  )
}
