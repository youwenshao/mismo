import { NextResponse } from 'next/server'
import { InterviewStateMachine } from '@mismo/ai'
import { INTERVIEW_TIME_LIMIT_MS } from '@mismo/shared'

export async function POST() {
  const expiresAt = new Date(Date.now() + INTERVIEW_TIME_LIMIT_MS)
  const machine = new InterviewStateMachine(expiresAt)
  const context = machine.getContext()

  const sessionId = crypto.randomUUID()

  return NextResponse.json({
    sessionId,
    state: context,
    greeting: machine.getSystemPrompt(),
  })
}
