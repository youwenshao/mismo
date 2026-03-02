import { NextRequest, NextResponse } from 'next/server'

interface AlertPayload {
  event: string
  workflow: string
  error: string
  timestamp: string
  executionId?: string
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as AlertPayload

    console.error(
      `[n8n-alert] Workflow "${payload.workflow}" failed: ${payload.error} at ${payload.timestamp}`,
    )

    const slackWebhookUrl = process.env.SLACK_ALERT_WEBHOOK_URL
    if (slackWebhookUrl) {
      await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `*n8n Automation Alert*\nWorkflow: ${payload.workflow}\nError: ${payload.error}\nTime: ${payload.timestamp}`,
        }),
      }).catch((err) =>
        console.error('Failed to forward alert to Slack:', err),
      )
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Alert webhook processing failed:', err)
    return NextResponse.json({ received: false }, { status: 500 })
  }
}
