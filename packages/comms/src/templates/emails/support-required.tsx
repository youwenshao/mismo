import { Text, Section } from '@react-email/components'
import * as React from 'react'
import { Layout } from '../components/Layout'
import { getStrings, type Locale } from '../../i18n/strings'
import type { SupportRequiredData } from '../registry'

interface Props {
  data: SupportRequiredData
  locale: Locale
}

const heading: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#d94f4f',
  marginBottom: '16px',
}

const body: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
}

const alertBox: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '16px 20px',
  borderLeft: '4px solid #d94f4f',
}

export function SupportRequiredEmail({ data, locale }: Props) {
  const s = getStrings(locale)

  return (
    <Layout preview={s.supportRequired.subject(data.projectName)} locale={locale}>
      <Text style={heading}>{s.supportRequired.heading}</Text>
      <Text style={body}>{s.greeting(data.clientName)}</Text>
      <Section style={alertBox}>
        <Text style={body}>
          {s.supportRequired.body(data.projectName, data.reason)}
        </Text>
      </Section>
      <Text style={{ ...body, color: '#8898aa', fontStyle: 'italic', marginTop: '16px' }}>
        {s.supportRequired.teamNotified}
      </Text>
    </Layout>
  )
}
