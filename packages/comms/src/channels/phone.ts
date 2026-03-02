import Twilio from 'twilio'

interface PhoneCallParams {
  to: string
  message: string
}

let client: ReturnType<typeof Twilio> | null = null

function getClient(): ReturnType<typeof Twilio> {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    if (!sid || !token) throw new Error('Twilio credentials not configured')
    client = Twilio(sid, token)
  }
  return client
}

export async function makePhoneCall(params: PhoneCallParams): Promise<{ sid: string }> {
  const from = process.env.TWILIO_FROM_NUMBER
  if (!from) throw new Error('TWILIO_FROM_NUMBER not configured')

  const twiml = `<Response><Say voice="alice" loop="2">${escapeXml(params.message)}</Say></Response>`

  const call = await getClient().calls.create({
    to: params.to,
    from,
    twiml,
  })
  return { sid: call.sid }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
