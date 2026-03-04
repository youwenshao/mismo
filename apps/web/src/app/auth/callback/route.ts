import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@mismo/db'
import { hashEmail, isWhitelistedAdminWithDb } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const internalUrl = process.env.INTERNAL_APP_URL ?? 'http://localhost:3001'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=missing_code`)
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth?error=auth_failed`)
  }

  const email = data.user.email
  const emailHash = email ? await hashEmail(email) : null
  const isAdmin = emailHash ? await isWhitelistedAdminWithDb(emailHash) : false

  let dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: data.user.id },
  })

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        supabaseAuthId: data.user.id,
        role: isAdmin ? 'ADMIN' : 'CLIENT',
        hasCompletedOnboarding: false,
      },
    })
  } else if (isAdmin && dbUser.role === 'CLIENT') {
    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { role: 'ADMIN' },
    })
  }

  let redirectUrl: string

  if (next) {
    redirectUrl = next
  } else if (dbUser.role === 'ADMIN' || dbUser.role === 'ENGINEER') {
    redirectUrl = internalUrl
  } else if (!dbUser.hasCompletedOnboarding) {
    redirectUrl = `${origin}/chat`
  } else {
    redirectUrl = `${origin}/dashboard`
  }

  const redirectResponse = NextResponse.redirect(redirectUrl)

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value)
  })

  return redirectResponse
}
