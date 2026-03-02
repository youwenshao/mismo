import { Text, Link, Section, Row, Column } from '@react-email/components'
import * as React from 'react'
import { Layout } from '../components/Layout'
import { getStrings, type Locale } from '../../i18n/strings'
import type { TransferReadyData } from '../registry'

interface Props {
  data: TransferReadyData
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

const card: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px 20px',
  marginBottom: '8px',
}

const label: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 4px 0',
}

const value: React.CSSProperties = {
  fontSize: '14px',
  color: '#5469d4',
  margin: '0',
}

export function TransferReadyEmail({ data, locale }: Props) {
  const s = getStrings(locale)

  const links = [
    { label: s.transferReady.repoLabel, url: data.githubUrl },
    data.hostingUrl ? { label: s.transferReady.hostingLabel, url: data.hostingUrl } : null,
    data.videoUrl ? { label: s.transferReady.videoLabel, url: data.videoUrl } : null,
  ].filter(Boolean) as Array<{ label: string; url: string }>

  return (
    <Layout preview={s.transferReady.subject(data.projectName)} locale={locale}>
      <Text style={heading}>{s.transferReady.heading}</Text>
      <Text style={body}>{s.greeting(data.clientName)}</Text>
      <Text style={body}>{s.transferReady.body(data.projectName)}</Text>

      {links.map((link) => (
        <Section key={link.label} style={card}>
          <p style={label}>{link.label}</p>
          <p style={value}>
            <Link href={link.url} style={{ color: '#5469d4' }}>{link.url}</Link>
          </p>
        </Section>
      ))}

      {(data.adrUrl || data.howToGuideUrl || data.apiDocsUrl) && (
        <Section style={{ ...card, marginTop: '16px' }}>
          <p style={label}>{s.transferReady.docsLabel}</p>
          {data.adrUrl && (
            <p style={value}>
              <Link href={data.adrUrl} style={{ color: '#5469d4' }}>Architecture Decision Record</Link>
            </p>
          )}
          {data.howToGuideUrl && (
            <p style={value}>
              <Link href={data.howToGuideUrl} style={{ color: '#5469d4' }}>How to Modify Guide</Link>
            </p>
          )}
          {data.apiDocsUrl && (
            <p style={value}>
              <Link href={data.apiDocsUrl} style={{ color: '#5469d4' }}>API Documentation</Link>
            </p>
          )}
        </Section>
      )}
    </Layout>
  )
}
