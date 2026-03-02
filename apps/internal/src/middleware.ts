import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const WEB_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  if (!user) {
    return NextResponse.redirect(`${WEB_APP_URL}/auth`)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
