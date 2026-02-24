import { NextRequest, NextResponse } from 'next/server'
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

  const response = NextResponse.next()

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }

  if (!isApiRoute) return response

  const ip = getClientIp(request)

  if (!isHealthCheck) {
    const { allowed, remaining, resetAt } = await apiLimiter.check(ip)

    response.headers.set('X-RateLimit-Remaining', String(remaining))
    response.headers.set('X-RateLimit-Reset', String(resetAt))

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

  if (isApiRoute) {
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
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
