import { IncomingWebhook } from '@slack/webhook'

interface SlackNotification {
  webhookUrl: string
  title: string
  body: string
  color?: string
  fields?: Array<{ title: string; value: string; short?: boolean }>
  actionUrl?: string
  actionText?: string
}

const webhookCache = new Map<string, IncomingWebhook>()

function getWebhook(url: string): IncomingWebhook {
  let hook = webhookCache.get(url)
  if (!hook) {
    hook = new IncomingWebhook(url)
    webhookCache.set(url, hook)
  }
  return hook
}

export async function sendSlackNotification(params: SlackNotification): Promise<void> {
  const webhook = getWebhook(params.webhookUrl)

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: params.title, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: params.body },
    },
  ]

  if (params.fields?.length) {
    blocks.push({
      type: 'section',
      fields: params.fields.map((f) => ({
        type: 'mrkdwn',
        text: `*${f.title}*\n${f.value}`,
      })),
    })
  }

  if (params.actionUrl && params.actionText) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: params.actionText },
          url: params.actionUrl,
          style: 'primary',
        },
      ],
    })
  }

  await webhook.send({
    text: `${params.title}: ${params.body}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blocks: blocks as any,
  })
}
