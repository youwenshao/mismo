import { render } from '@react-email/components'
import type { Locale } from '../i18n/strings'
import type { NotificationEvent } from './registry'
import { getStrings } from '../i18n/strings'
import type { AnyEventData, EventDataMap } from './registry'

import { BuildStartedEmail } from './emails/build-started'
import { BuildProgressEmail } from './emails/build-progress'
import { BuildCompleteEmail } from './emails/build-complete'
import { TransferReadyEmail } from './emails/transfer-ready'
import { SupportRequiredEmail } from './emails/support-required'
import { FeedbackRequestEmail } from './emails/feedback-request'

interface RenderResult {
  subject: string
  html: string
}

export async function renderTemplate(
  event: NotificationEvent,
  data: AnyEventData,
  locale: Locale,
): Promise<RenderResult> {
  const strings = getStrings(locale)

  switch (event) {
    case 'BUILD_STARTED': {
      const d = data as EventDataMap['BUILD_STARTED']
      return {
        subject: strings.buildStarted.subject(d.projectName),
        html: await render(BuildStartedEmail({ data: d, locale })),
      }
    }
    case 'BUILD_PROGRESS': {
      const d = data as EventDataMap['BUILD_PROGRESS']
      return {
        subject: strings.buildProgress.subject(d.projectName, d.progressPercent),
        html: await render(BuildProgressEmail({ data: d, locale })),
      }
    }
    case 'BUILD_COMPLETE': {
      const d = data as EventDataMap['BUILD_COMPLETE']
      return {
        subject: strings.buildComplete.subject(d.projectName),
        html: await render(BuildCompleteEmail({ data: d, locale })),
      }
    }
    case 'TRANSFER_READY': {
      const d = data as EventDataMap['TRANSFER_READY']
      return {
        subject: strings.transferReady.subject(d.projectName),
        html: await render(TransferReadyEmail({ data: d, locale })),
      }
    }
    case 'SUPPORT_REQUIRED': {
      const d = data as EventDataMap['SUPPORT_REQUIRED']
      return {
        subject: strings.supportRequired.subject(d.projectName),
        html: await render(SupportRequiredEmail({ data: d, locale })),
      }
    }
    case 'FEEDBACK_REQUEST': {
      const d = data as EventDataMap['FEEDBACK_REQUEST']
      return {
        subject: strings.feedbackRequest.subject(d.projectName),
        html: await render(FeedbackRequestEmail({ data: d, locale })),
      }
    }
    case 'MAINTENANCE_REPORT': {
      return {
        subject: `Maintenance report for ${data.projectName}`,
        html: await render(BuildCompleteEmail({ data: { ...data, buildId: '', githubUrl: '', vercelUrl: undefined } as EventDataMap['BUILD_COMPLETE'], locale })),
      }
    }
    default: {
      throw new Error(`Unknown notification event: ${String(event)}`)
    }
  }
}
