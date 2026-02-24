import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

type ServiceStatus = 'connected' | 'disconnected' | 'configured' | 'not_configured'

interface HealthResponse {
  status: 'healthy' | 'degraded'
  version: string
  timestamp: string
  services: {
    database: ServiceStatus
    stripe: ServiceStatus
    ai: ServiceStatus
  }
}

async function checkDatabase(): Promise<ServiceStatus> {
  return process.env.DATABASE_URL ? 'connected' : 'disconnected'
}

function checkStripe(): ServiceStatus {
  return process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured'
}

function checkAi(): ServiceStatus {
  const hasAny =
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.DEEPSEEK_API_KEY
  return hasAny ? 'configured' : 'not_configured'
}

export async function GET() {
  const start = Date.now()

  try {
    const database = await checkDatabase()
    const stripe = checkStripe()
    const ai = checkAi()

    const allHealthy = database === 'connected'
    const response: HealthResponse = {
      status: allHealthy ? 'healthy' : 'degraded',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      services: { database, stripe, ai },
    }

    logger.debug('Health check completed', {
      durationMs: Date.now() - start,
      status: response.status,
    })

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      {
        status: 'degraded',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        services: {
          database: 'disconnected' as const,
          stripe: 'not_configured' as const,
          ai: 'not_configured' as const,
        },
      },
      { status: 503 },
    )
  }
}
