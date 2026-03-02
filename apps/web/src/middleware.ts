import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { rateLimit } from '@/lib/rate-limit'

const apiLimiter = rateLimit({
  maxRequests: Number(process.env.RATE_LIMIT_MAX ?? 100),
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
})

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

const PUBLIC_ROUTES = ['/', '/auth', '/auth/callback']

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')
  const isHealthCheck = pathname === '/api/health'
  const start = Date.now()

  let { supabaseResponse, user } = await updateSession(request)

  // Development mode: bypass auth if flag is set
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' &&
    !user
  ) {
    user = {
      id: '9b7acb0c-5947-4451-bd31-2f44284623f2',
      email: 'dev@mismo.test',
    } as any
  }

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    supabaseResponse.headers.set(key, value)
  }

  if (!isApiRoute) {
    const isPublic = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/auth')

    if (!isPublic && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth'
      return NextResponse.redirect(url)
    }

    if (pathname === '/auth' && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    supabaseResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    supabaseResponse.headers.set('Pragma', 'no-cache')
    supabaseResponse.headers.set('Expires', '0')
    return supabaseResponse
  }

  const ip = getClientIp(request)

  if (!isHealthCheck) {
    const { allowed, remaining, resetAt } = await apiLimiter.check(ip)

    supabaseResponse.headers.set('X-RateLimit-Remaining', String(remaining))
    supabaseResponse.headers.set('X-RateLimit-Reset', String(resetAt))

    if (!allowed) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          statusCode: 429,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            ...SECURITY_HEADERS,
          },
        },
      )
    }
  }

  const durationMs = Date.now() - start
  const log = {
    level: 'info',
    message: 'API request',
    timestamp: new Date().toISOString(),
    context: {
      method: request.method,
      path: pathname,
      ip,
      durationMs,
      userAgent: request.headers.get('user-agent') ?? undefined,
    },
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(log))

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
