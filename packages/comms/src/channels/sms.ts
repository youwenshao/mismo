import Twilio from 'twilio'

interface SmsParams {
  to: string
  body: string
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

export async function sendSms(params: SmsParams): Promise<{ sid: string }> {
  const from = process.env.TWILIO_FROM_NUMBER
  if (!from) throw new Error('TWILIO_FROM_NUMBER not configured')

  const message = await getClient().messages.create({
    to: params.to,
    from,
    body: params.body,
  })
  return { sid: message.sid }
}
