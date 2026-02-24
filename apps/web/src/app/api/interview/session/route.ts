import { NextRequest, NextResponse } from 'next/server'

const sessions = new Map<string, unknown>()

export function setSession(id: string, data: unknown) {
  sessions.set(id, data)
}

export function getSession(id: string) {
  return sessions.get(id)
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('id')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session id' }, { status: 400 })
  }

  const session = getSession(sessionId)

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json(session)
}
