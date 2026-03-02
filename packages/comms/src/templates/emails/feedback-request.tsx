import { Text, Button, Section, Link } from '@react-email/components'
import * as React from 'react'
import { Layout } from '../components/Layout'
import { getStrings, type Locale } from '../../i18n/strings'
import type { FeedbackRequestData } from '../registry'

interface Props {
  data: FeedbackRequestData
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

const ratingContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const ratingBtn = (n: number): React.CSSProperties => ({
  display: 'inline-block',
  width: '40px',
  height: '40px',
  lineHeight: '40px',
  textAlign: 'center' as const,
  borderRadius: '8px',
  backgroundColor: n <= 3 ? '#fef2f2' : n <= 6 ? '#fffbeb' : '#f0fdf4',
  color: n <= 3 ? '#d94f4f' : n <= 6 ? '#d97706' : '#16a34a',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  margin: '0 3px',
})

export function FeedbackRequestEmail({ data, locale }: Props) {
  const s = getStrings(locale)
  const ratings = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  return (
    <Layout preview={s.feedbackRequest.subject(data.projectName)} locale={locale}>
      <Text style={heading}>{s.feedbackRequest.heading}</Text>
      <Text style={body}>{s.greeting(data.clientName)}</Text>
      <Text style={body}>{s.feedbackRequest.body(data.projectName)}</Text>

      <Text style={{ ...body, fontWeight: '600', textAlign: 'center' }}>
        {s.feedbackRequest.ratePrompt}
      </Text>

      <Section style={ratingContainer}>
        {ratings.map((n) => (
          <Link
            key={n}
            href={`${data.feedbackUrl}?rating=${n}`}
            style={ratingBtn(n)}
          >
            {String(n)}
          </Link>
        ))}
      </Section>

      <Section style={{ textAlign: 'center', marginTop: '16px' }}>
        <Link
          href={`${data.feedbackUrl}?tab=bug`}
          style={{ color: '#5469d4', fontSize: '14px' }}
        >
          {s.feedbackRequest.bugReport}
        </Link>
      </Section>
    </Layout>
  )
}
