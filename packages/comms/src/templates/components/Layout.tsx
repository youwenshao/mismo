import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
  Img,
  Preview,
} from '@react-email/components'
import * as React from 'react'
import type { Locale } from '../../i18n/strings'
import { getStrings } from '../../i18n/strings'

interface LayoutProps {
  preview: string
  locale: Locale
  children: React.ReactNode
}

const main: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
  borderRadius: '8px',
}

const header: React.CSSProperties = {
  padding: '24px 48px 0',
}

const content: React.CSSProperties = {
  padding: '0 48px',
}

const footer: React.CSSProperties = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 48px',
}

export function Layout({ preview, locale, children }: LayoutProps) {
  const strings = getStrings(locale)

  return (
    <Html lang={locale === 'zh' ? 'zh-CN' : 'en'}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e' }}>
              {strings.footer.company}
            </Text>
          </Section>
          <Section style={content}>
            {children}
          </Section>
          <Hr style={{ borderColor: '#e6ebf1', margin: '20px 48px' }} />
          <Section style={footer}>
            <Text>{strings.footer.company} &mdash; {strings.footer.unsubscribe}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
