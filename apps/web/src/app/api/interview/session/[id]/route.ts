import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@mismo/db'
import type { InterviewContext } from '@mismo/ai'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const session = await prisma.interviewSession.findUnique({
    where: { id },
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const context = session.state as unknown as InterviewContext

  return NextResponse.json({
    id: session.id,
    userId: session.userId,
    projectId: session.projectId,
    state: context,
    transcript: session.transcript,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    expiresAt: session.expiresAt,
  })
}
