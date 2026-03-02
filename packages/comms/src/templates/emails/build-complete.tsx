import { Text, Button, Section } from '@react-email/components'
import * as React from 'react'
import { Layout } from '../components/Layout'
import { getStrings, type Locale } from '../../i18n/strings'
import type { BuildCompleteData } from '../registry'

interface Props {
  data: BuildCompleteData
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

const btnStyle: React.CSSProperties = {
  backgroundColor: '#5469d4',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 24px',
}

export function BuildCompleteEmail({ data, locale }: Props) {
  const s = getStrings(locale)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <Layout preview={s.buildComplete.subject(data.projectName)} locale={locale}>
      <Text style={heading}>{s.buildComplete.heading}</Text>
      <Text style={body}>{s.greeting(data.clientName)}</Text>
      <Text style={body}>{s.buildComplete.body(data.projectName)}</Text>
      {data.githubUrl && (
        <Text style={{ ...body, fontSize: '14px' }}>
          GitHub: <a href={data.githubUrl} style={{ color: '#5469d4' }}>{data.githubUrl}</a>
        </Text>
      )}
      {data.vercelUrl && (
        <Text style={{ ...body, fontSize: '14px' }}>
          Live: <a href={data.vercelUrl} style={{ color: '#5469d4' }}>{data.vercelUrl}</a>
        </Text>
      )}
      <Section style={{ textAlign: 'center', marginTop: '24px' }}>
        <Button
          style={btnStyle}
          href={`${appUrl}/delivery/${data.buildId}`}
        >
          {s.buildComplete.viewDelivery}
        </Button>
      </Section>
    </Layout>
  )
}
