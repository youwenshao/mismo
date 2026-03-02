import { Resend } from 'resend'
import nodemailer from 'nodemailer'

interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: string
}

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

function getSmtpTransport() {
  if (!process.env.SMTP_HOST) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendEmail(params: SendEmailParams): Promise<{ id: string; provider: 'resend' | 'smtp' }> {
  const from = params.from ?? process.env.RESEND_FROM_EMAIL ?? 'updates@mismo.dev'

  const client = getResendClient()
  if (client) {
    try {
      const result = await client.emails.send({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      })

      if (result.error) {
        throw new Error(result.error.message)
      }

      return { id: result.data?.id ?? 'unknown', provider: 'resend' }
    } catch (err) {
      console.warn('[comms] Resend failed, trying SMTP fallback:', err)
    }
  }

  const transport = getSmtpTransport()
  if (!transport) {
    throw new Error('No email provider configured: set RESEND_API_KEY or SMTP_HOST')
  }

  const info = await transport.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  })

  return { id: info.messageId, provider: 'smtp' }
}
