import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import { InterviewStateMachine, type InterviewContext } from '@mismo/ai'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { checkpointIndex } = (await req.json()) as { checkpointIndex: number }

  if (typeof checkpointIndex !== 'number') {
    return NextResponse.json(
      { error: 'Missing or invalid checkpointIndex' },
      { status: 400 },
    )
  }

  const session = await prisma.interviewSession.findUnique({
    where: { id },
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const savedContext = session.state as unknown as InterviewContext
  const machine = InterviewStateMachine.fromContext(savedContext)

  const success = machine.rewindToCheckpoint(checkpointIndex)
  if (!success) {
    return NextResponse.json(
      { error: 'Invalid checkpoint index' },
      { status: 400 },
    )
  }

  const updatedContext = machine.getContext()

  await prisma.interviewSession.update({
    where: { id },
    data: {
      state: JSON.parse(JSON.stringify(updatedContext)),
      transcript: JSON.parse(JSON.stringify(updatedContext.messages)),
    },
  })

  return NextResponse.json({
    state: updatedContext,
    messages: updatedContext.messages,
  })
}
