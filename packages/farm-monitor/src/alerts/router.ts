import { createClient, SupabaseClient } from '@supabase/supabase-js'

type AlertPriority = 'P0' | 'P1' | 'P2'

interface AlertConfig {
  slackWebhookUrl: string
  alertEmail: string
  alertPhone: string
}

interface SupabaseConfig {
  url: string
  serviceRoleKey: string
}

export class AlertRouter {
  private supabase: SupabaseClient | null = null
  private commsAvailable = false

  constructor(
    private alertConfig: AlertConfig,
    private supabaseConfig: SupabaseConfig,
  ) {
    this.commsAvailable = !!alertConfig.slackWebhookUrl || !!alertConfig.alertEmail || !!alertConfig.alertPhone
  }

  private getClient(): SupabaseClient {
    if (!this.supabase) {
      this.supabase = createClient(this.supabaseConfig.url, this.supabaseConfig.serviceRoleKey)
    }
    return this.supabase
  }

  async send(
    priority: AlertPriority,
    category: string,
    title: string,
    details: string,
    studio?: string,
  ): Promise<void> {
    const timestamp = new Date().toISOString()
    console.log(`[ALERT][${priority}][${category}] ${title}: ${details}`)

    await this.writeToDashboard(priority, category, title, details, studio)

    if (priority === 'P2') return

    if (this.alertConfig.slackWebhookUrl) {
      await this.sendSlack(priority, title, details, category, studio, timestamp)
    }
    if (this.alertConfig.alertEmail) {
      await this.sendEmail(priority, title, details, category)
    }

    if (priority === 'P0' && this.alertConfig.alertPhone) {
      await this.sendSms(title, details)
      await this.sendPhoneCall(title, details)
    }
  }

  private async writeToDashboard(
    priority: AlertPriority,
    category: string,
    title: string,
    details: string,
    studio?: string,
  ): Promise<void> {
    try {
      await this.getClient().from('MonitoringAlert').insert({
        priority,
        category,
        title,
        details: { message: details },
        studio: studio || null,
      })
    } catch (err) {
      console.error('[alert-router] Failed to write alert to dashboard:', err)
    }
  }

  private async sendSlack(
    priority: AlertPriority,
    title: string,
    details: string,
    category: string,
    studio: string | undefined,
    timestamp: string,
  ): Promise<void> {
    try {
      const emoji = priority === 'P0' ? ':rotating_light:' : ':warning:'
      const color = priority === 'P0' ? '#FF0000' : '#FFA500'
      const payload = {
        attachments: [{
          color,
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: `${emoji} [${priority}] ${title}` },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Category:*\n${category}` },
                { type: 'mrkdwn', text: `*Studio:*\n${studio || 'N/A'}` },
                { type: 'mrkdwn', text: `*Time:*\n${timestamp}` },
              ],
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: details },
            },
          ],
        }],
      }
      await fetch(this.alertConfig.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.error('[alert-router] Slack notification failed:', err)
    }
  }

  private async sendEmail(
    priority: AlertPriority,
    title: string,
    details: string,
    category: string,
  ): Promise<void> {
    try {
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) return

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'alerts@mismo.dev',
          to: this.alertConfig.alertEmail,
          subject: `[${priority}] Farm Alert: ${title}`,
          html: `<h2>[${priority}] ${title}</h2><p><strong>Category:</strong> ${category}</p><p>${details}</p><p><em>Sent by farm-monitor at ${new Date().toISOString()}</em></p>`,
        }),
      })
    } catch (err) {
      console.error('[alert-router] Email notification failed:', err)
    }
  }

  private async sendSms(title: string, details: string): Promise<void> {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID
      const token = process.env.TWILIO_AUTH_TOKEN
      const from = process.env.TWILIO_FROM_NUMBER
      if (!sid || !token || !from) return

      const body = `[P0] ${title}: ${details}`.slice(0, 1600)
      const params = new URLSearchParams({ To: this.alertConfig.alertPhone, From: from, Body: body })

      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })
    } catch (err) {
      console.error('[alert-router] SMS notification failed:', err)
    }
  }

  private async sendPhoneCall(title: string, details: string): Promise<void> {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID
      const token = process.env.TWILIO_AUTH_TOKEN
      const from = process.env.TWILIO_FROM_NUMBER
      if (!sid || !token || !from) return

      const message = `Priority zero farm alert: ${title}. ${details}`.replace(/[<>&"']/g, '')
      const twiml = `<Response><Say voice="alice" loop="2">${message}</Say></Response>`
      const params = new URLSearchParams({ To: this.alertConfig.alertPhone, From: from, Twiml: twiml })

      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })
    } catch (err) {
      console.error('[alert-router] Phone call notification failed:', err)
    }
  }
}
