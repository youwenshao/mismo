import { NextResponse } from 'next/server'
import { InterviewStateMachine } from '@mismo/ai'
import { prisma } from '@mismo/db'
import { INTERVIEW_TIME_LIMIT_MS } from '@mismo/shared'
import { getSessionUser } from '@/lib/auth'

export async function POST() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const expiresAt = new Date(Date.now() + INTERVIEW_TIME_LIMIT_MS)
  const machine = new InterviewStateMachine(expiresAt)
  const context = machine.getContext()

  const session = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      state: JSON.parse(JSON.stringify(context)),
      transcript: JSON.parse(JSON.stringify(context.messages)),
      expiresAt,
    },
  })

  return NextResponse.json({
    sessionId: session.id,
    state: context,
    greeting: machine.getSystemPrompt(),
  })
}
