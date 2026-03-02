import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = express()
app.use(express.json({ limit: '10mb' }))

interface ApiEndpointContract {
  path: string
  method: string
  description: string
  request?: { body?: string; query?: Record<string, string> }
  response: { status: number; body: string }
}

interface ApiContracts {
  endpoints: ApiEndpointContract[]
}

interface DbSchema {
  sqlSchema: string
  zodSchemas: string
  types: string
}

interface GenerateRequest {
  buildId: string
  dbSchema: DbSchema
  apiContracts: ApiContracts
}

interface RouteOutput {
  path: string
  method: string
  code: string
}

async function logError(buildId: string | undefined, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[backend-engineer] ${message}`)

  if (!buildId) return

  try {
    const build = await prisma.build.findUnique({ where: { id: buildId } })
    if (build) {
      const existing = Array.isArray(build.errorLogs) ? build.errorLogs : []
      await prisma.build.update({
        where: { id: buildId },
        data: {
          status: 'FAILED',
          failureCount: { increment: 1 },
          errorLogs: [
            ...(existing as any[]),
            { source: 'backend-engineer', error: message, timestamp: new Date().toISOString() },
          ],
        },
      })
    }
  } catch (dbErr) {
    console.error('[backend-engineer] Failed to log error to database:', dbErr)
  }
}

function methodToNextJsExport(method: string): string {
  return method.toUpperCase()
}

function generateRouteHandler(endpoint: ApiEndpointContract, zodSchemas: string): string {
  const method = endpoint.method.toUpperCase()
  const hasRequestBody = method === 'POST' || method === 'PUT' || method === 'PATCH'
  const responseType = endpoint.response.body
  const statusCode = endpoint.response.status

  const inputSchemaName = endpoint.request?.body
    ? `${endpoint.request.body}Schema`
    : null

  const lines: string[] = [
    `import { NextRequest, NextResponse } from 'next/server'`,
    `import { z } from 'zod'`,
    ``,
    `// Zod schemas from DB Architect`,
    zodSchemas,
    ``,
  ]

  if (hasRequestBody && inputSchemaName) {
    lines.push(
      `export async function ${methodToNextJsExport(method)}(request: NextRequest) {`,
      `  try {`,
      `    const body = await request.json()`,
      `    const parsed = ${inputSchemaName}.parse(body)`,
      ``,
      `    // TODO: implement ${endpoint.description}`,
      `    const result: ${responseType} = parsed as any`,
      ``,
      `    return NextResponse.json(result, { status: ${statusCode} })`,
      `  } catch (error) {`,
      `    if (error instanceof z.ZodError) {`,
      `      return NextResponse.json(`,
      `        { error: 'Validation failed', details: error.errors },`,
      `        { status: 400 }`,
      `      )`,
      `    }`,
      `    return NextResponse.json(`,
      `      { error: 'Internal server error' },`,
      `      { status: 500 }`,
      `    )`,
      `  }`,
      `}`,
    )
  } else {
    lines.push(
      `export async function ${methodToNextJsExport(method)}(request: NextRequest) {`,
      `  try {`,
      `    // TODO: implement ${endpoint.description}`,
      `    const result: ${responseType} = [] as any`,
      ``,
      `    return NextResponse.json(result, { status: ${statusCode} })`,
      `  } catch (error) {`,
      `    return NextResponse.json(`,
      `      { error: 'Internal server error' },`,
      `      { status: 500 }`,
      `    )`,
      `  }`,
      `}`,
    )
  }

  return lines.join('\n')
}

function generateOpenApiSpec(contracts: ApiContracts): object {
  const paths: Record<string, any> = {}

  for (const endpoint of contracts.endpoints) {
    const method = endpoint.method.toLowerCase()
    if (!paths[endpoint.path]) {
      paths[endpoint.path] = {}
    }

    const operation: any = {
      summary: endpoint.description,
      responses: {
        [String(endpoint.response.status)]: {
          description: endpoint.description,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${endpoint.response.body}` },
            },
          },
        },
      },
    }

    if (endpoint.request?.body) {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${endpoint.request.body}` },
          },
        },
      }
    }

    paths[endpoint.path][method] = operation
  }

  return {
    openapi: '3.0.3',
    info: { title: 'Generated API', version: '1.0.0' },
    paths,
    components: { schemas: {} },
  }
}

function generateTypeDefinitions(contracts: ApiContracts, dbTypes: string): string {
  const responseTypes = new Set<string>()
  const requestTypes = new Set<string>()

  for (const endpoint of contracts.endpoints) {
    responseTypes.add(endpoint.response.body)
    if (endpoint.request?.body) {
      requestTypes.add(endpoint.request.body)
    }
  }

  const lines: string[] = [
    `// Auto-generated type definitions from DB Architect + API contracts`,
    ``,
    dbTypes,
    ``,
    `// Request/Response type re-exports`,
  ]

  for (const t of requestTypes) {
    lines.push(`export type ${t}Request = ${t}`)
  }
  for (const t of responseTypes) {
    lines.push(`export type ${t}Response = ${t}`)
  }

  return lines.join('\n')
}

function validateContractCoverage(
  contracts: ApiContracts,
  routes: RouteOutput[],
): string[] {
  const errors: string[] = []

  for (const endpoint of contracts.endpoints) {
    const match = routes.find(
      (r) =>
        r.path === endpoint.path &&
        r.method.toUpperCase() === endpoint.method.toUpperCase(),
    )
    if (!match) {
      errors.push(
        `Missing route for ${endpoint.method.toUpperCase()} ${endpoint.path}`,
      )
      continue
    }

    const expectedStatus = String(endpoint.response.status)
    if (!match.code.includes(`status: ${expectedStatus}`)) {
      errors.push(
        `Route ${endpoint.method.toUpperCase()} ${endpoint.path} does not return status ${expectedStatus}`,
      )
    }
  }

  return errors
}

app.post('/generate', async (req: Request, res: Response) => {
  const { buildId, dbSchema, apiContracts } = req.body as GenerateRequest

  if (!dbSchema || !apiContracts?.endpoints) {
    return res
      .status(400)
      .json({ success: false, error: 'dbSchema and apiContracts.endpoints are required' })
  }

  try {
    const routes: RouteOutput[] = apiContracts.endpoints.map((endpoint) => ({
      path: endpoint.path,
      method: endpoint.method.toUpperCase(),
      code: generateRouteHandler(endpoint, dbSchema.zodSchemas || ''),
    }))

    const coverageErrors = validateContractCoverage(apiContracts, routes)
    if (coverageErrors.length > 0) {
      const err = new Error(`Contract coverage validation failed: ${coverageErrors.join('; ')}`)
      await logError(buildId, err)
      return res.status(400).json({ success: false, error: err.message, details: coverageErrors })
    }

    const openApiSpec = generateOpenApiSpec(apiContracts)
    const types = generateTypeDefinitions(apiContracts, dbSchema.types || '')

    return res.json({
      success: true,
      routes,
      openApiSpec,
      types,
    })
  } catch (error) {
    await logError(buildId, error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return res.status(400).json({ success: false, error: message })
  }
})

const PORT = process.env.PORT || 3002
app.listen(PORT, () => console.log(`Backend Engineer Agent listening on port ${PORT}`))
