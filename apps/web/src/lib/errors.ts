export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterMs?: number) {
    const message = retryAfterMs
      ? `Rate limit exceeded. Retry after ${Math.ceil(retryAfterMs / 1000)}s`
      : 'Rate limit exceeded'
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
    this.name = 'RateLimitError'
  }
}

export function formatErrorResponse(error: AppError): {
  error: string
  code: string
  statusCode: number
} {
  return {
    error: error.message,
    code: error.code,
    statusCode: error.statusCode,
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof AppError) {
    const body = formatErrorResponse(error)
    return new Response(JSON.stringify(body), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error instanceof Error
        ? error.message
        : String(error)

  return new Response(
    JSON.stringify({
      error: message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } },
  )
}
