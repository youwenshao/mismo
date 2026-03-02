import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('id')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session id' }, { status: 400 })
  }

  return NextResponse.redirect(new URL(`/api/interview/session/${sessionId}`, req.url))
}
