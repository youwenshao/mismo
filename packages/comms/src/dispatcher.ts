type NotificationEvent =
  | 'BUILD_STARTED'
  | 'BUILD_PROGRESS'
  | 'BUILD_COMPLETE'
  | 'TRANSFER_READY'
  | 'SUPPORT_REQUIRED'
  | 'FEEDBACK_REQUEST'
  | 'MAINTENANCE_REPORT'
  | 'FARM_ALERT'

type NotificationChannel = 'EMAIL' | 'SLACK' | 'SMS' | 'PHONE'
import { sendEmail } from './channels/resend'
import { sendSlackNotification } from './channels/slack'
import { sendSms } from './channels/sms'
import { makePhoneCall } from './channels/phone'
import { getStrings, type Locale } from './i18n/strings'
import type { AnyEventData, EventDataMap } from './templates/registry'
import { renderTemplate } from './templates/render'

export interface DispatchResult {
  event: NotificationEvent
  channels: Array<{
    channel: NotificationChannel
    success: boolean
    messageId?: string
    error?: string
  }>
}

export interface DispatchOptions {
  event: NotificationEvent
  data: AnyEventData
  slackWebhookUrl?: string | null
}

export async function dispatch(options: DispatchOptions): Promise<DispatchResult> {
  const { event, data, slackWebhookUrl } = options
  const locale = data.locale ?? 'en'
  const strings = getStrings(locale)
  const channels: DispatchResult['channels'] = []

  const { subject, html } = await renderTemplate(event, data, locale)

  try {
    const result = await sendEmail({
      to: data.clientEmail,
      subject,
      html,
    })
    channels.push({ channel: 'EMAIL', success: true, messageId: result.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    channels.push({ channel: 'EMAIL', success: false, error: message })
  }

  if (slackWebhookUrl) {
    try {
      await sendSlackNotification({
        webhookUrl: slackWebhookUrl,
        title: subject,
        body: buildSlackBody(event, data, strings),
      })
      channels.push({ channel: 'SLACK', success: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      channels.push({ channel: 'SLACK', success: false, error: message })
    }
  }

  return { event, channels }
}

export interface FarmAlertOptions {
  priority: 'P0' | 'P1' | 'P2'
  title: string
  body: string
  slackWebhookUrl?: string
  alertEmail?: string
  alertPhone?: string
}

export async function dispatchFarmAlert(options: FarmAlertOptions): Promise<DispatchResult> {
  const { priority, title, body, slackWebhookUrl, alertEmail, alertPhone } = options
  const channels: DispatchResult['channels'] = []

  console.log(`[FARM_ALERT][${priority}] ${title}: ${body}`)

  if (priority === 'P2') {
    return { event: 'FARM_ALERT', channels }
  }

  if (slackWebhookUrl) {
    try {
      await sendSlackNotification({
        webhookUrl: slackWebhookUrl,
        title: `[${priority}] ${title}`,
        body,
      })
      channels.push({ channel: 'SLACK', success: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      channels.push({ channel: 'SLACK', success: false, error: message })
    }
  }

  if (alertEmail) {
    try {
      const result = await sendEmail({
        to: alertEmail,
        subject: `[${priority}] Farm Alert: ${title}`,
        html: `<h2>${title}</h2><p>${body}</p>`,
      })
      channels.push({ channel: 'EMAIL', success: true, messageId: result.id })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      channels.push({ channel: 'EMAIL', success: false, error: message })
    }
  }

  if (priority === 'P0') {
    if (alertPhone) {
      try {
        const smsResult = await sendSms({ to: alertPhone, body: `[${priority}] ${title}: ${body}` })
        channels.push({ channel: 'SMS', success: true, messageId: smsResult.sid })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        channels.push({ channel: 'SMS', success: false, error: message })
      }

      try {
        const callResult = await makePhoneCall({ to: alertPhone, message: `Priority zero farm alert: ${title}. ${body}` })
        channels.push({ channel: 'PHONE', success: true, messageId: callResult.sid })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        channels.push({ channel: 'PHONE', success: false, error: message })
      }
    }
  }

  return { event: 'FARM_ALERT', channels }
}

function buildSlackBody(
  event: NotificationEvent,
  data: AnyEventData,
  strings: ReturnType<typeof getStrings>,
): string {
  switch (event) {
    case 'BUILD_STARTED': {
      const d = data as EventDataMap['BUILD_STARTED']
      return strings.buildStarted.body(d.projectName, d.stage)
    }
    case 'BUILD_PROGRESS': {
      const d = data as EventDataMap['BUILD_PROGRESS']
      return `${strings.buildProgress.body(d.projectName, d.progressPercent, d.progressDetail)}\n${strings.buildProgress.currentStep(d.nextStep)}`
    }
    case 'BUILD_COMPLETE': {
      const d = data as EventDataMap['BUILD_COMPLETE']
      return strings.buildComplete.body(d.projectName)
    }
    case 'TRANSFER_READY': {
      const d = data as EventDataMap['TRANSFER_READY']
      return strings.transferReady.body(d.projectName)
    }
    case 'SUPPORT_REQUIRED': {
      const d = data as EventDataMap['SUPPORT_REQUIRED']
      return strings.supportRequired.body(d.projectName, d.reason)
    }
    case 'FEEDBACK_REQUEST': {
      const d = data as EventDataMap['FEEDBACK_REQUEST']
      return `${strings.feedbackRequest.body(d.projectName)}\n<${d.feedbackUrl}|${strings.feedbackRequest.ratePrompt}>`
    }
    default:
      return data.projectName
  }
}
