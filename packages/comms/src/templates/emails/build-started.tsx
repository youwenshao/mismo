import { Text } from '@react-email/components'
import * as React from 'react'
import { Layout } from '../components/Layout'
import { getStrings, type Locale } from '../../i18n/strings'
import type { BuildStartedData } from '../registry'

interface Props {
  data: BuildStartedData
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

export function BuildStartedEmail({ data, locale }: Props) {
  const s = getStrings(locale)

  return (
    <Layout preview={s.buildStarted.subject(data.projectName)} locale={locale}>
      <Text style={heading}>{s.buildStarted.heading}</Text>
      <Text style={body}>{s.greeting(data.clientName)}</Text>
      <Text style={body}>{s.buildStarted.body(data.projectName, data.stage)}</Text>
      <Text style={{ ...body, color: '#8898aa', fontStyle: 'italic' }}>
        {s.buildStarted.expectUpdate}
      </Text>
    </Layout>
  )
}
