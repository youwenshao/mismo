import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = express()
app.use(express.json())

interface ContractEndpoint {
  path: string
  method: string
  response: { status: number; body: unknown }
}

interface ImplementedRoute {
  path: string
  method: string
  code: string
}

interface ApiMismatch {
  endpoint: string
  expected: string
  actual: string
  type: 'missing_route' | 'status_code_mismatch'
}

interface TypeViolation {
  file: string
  line: number
  violation: string
  severity: 'error' | 'warning'
}

async function logFailureToBuild(buildId: string | undefined, source: string, errors: unknown[]) {
  if (!buildId) return
  const build = await prisma.build.findUnique({ where: { id: buildId } })
  if (!build) return

  const existingLogs = Array.isArray(build.errorLogs) ? build.errorLogs : []
  await prisma.build.update({
    where: { id: buildId },
    data: {
      status: 'FAILED',
      failureCount: { increment: 1 },
      errorLogs: [...existingLogs, { source, errors, timestamp: new Date().toISOString() }],
    },
  })
}

function normalizePath(p: string): string {
  return p.replace(/\/+$/, '').toLowerCase()
}

function checkApiContracts(
  apiContracts: { endpoints: ContractEndpoint[] },
  implementedRoutes: ImplementedRoute[],
): { valid: boolean; mismatches: ApiMismatch[] } {
  const mismatches: ApiMismatch[] = []

  for (const endpoint of apiContracts.endpoints) {
    const normalizedPath = normalizePath(endpoint.path)
    const normalizedMethod = endpoint.method.toUpperCase()

    const match = implementedRoutes.find(
      (r) => normalizePath(r.path) === normalizedPath && r.method.toUpperCase() === normalizedMethod,
    )

    if (!match) {
      mismatches.push({
        endpoint: `${normalizedMethod} ${endpoint.path}`,
        expected: `Route implemented for ${normalizedMethod} ${endpoint.path}`,
        actual: 'Route not found',
        type: 'missing_route',
      })
      continue
    }

    const expectedStatus = endpoint.response.status
    const statusPatterns = [
      String(expectedStatus),
      `.status(${expectedStatus})`,
      `.sendStatus(${expectedStatus})`,
    ]
    const hasStatus = statusPatterns.some((pattern) => match.code.includes(pattern))

    if (!hasStatus) {
      mismatches.push({
        endpoint: `${normalizedMethod} ${endpoint.path}`,
        expected: `Status code ${expectedStatus}`,
        actual: 'Status code not found in implementation',
        type: 'status_code_mismatch',
      })
    }
  }

  return { valid: mismatches.length === 0, mismatches }
}

function checkTypeSafety(
  frontendCode: Array<{ name: string; code: string }>,
  zodSchemas: string,
): { valid: boolean; violations: TypeViolation[] } {
  const violations: TypeViolation[] = []

  const anyPatterns = [
    { regex: /:\s*any\b/g, label: '`any` type annotation' },
    { regex: /\bas\s+any\b/g, label: '`as any` type assertion' },
    { regex: /<any>/g, label: '`<any>` generic parameter' },
  ]

  for (const file of frontendCode) {
    const lines = file.code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const pattern of anyPatterns) {
        pattern.regex.lastIndex = 0
        if (pattern.regex.test(line)) {
          violations.push({
            file: file.name,
            line: i + 1,
            violation: `Unsafe type: ${pattern.label}`,
            severity: 'error',
          })
        }
      }

      if (/\bfetch\s*\(/.test(line)) {
        const surroundingLines = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5)).join('\n')
        const hasValidation = /\.parse\(|\.safeParse\(|z\.\w+|Schema\b/.test(surroundingLines)
        if (!hasValidation) {
          violations.push({
            file: file.name,
            line: i + 1,
            violation: 'Raw fetch() call without Zod/schema validation on response',
            severity: 'warning',
          })
        }
      }
    }

    const schemaNames = zodSchemas.match(/export\s+(?:const|type|interface)\s+(\w+)/g)
    if (schemaNames && schemaNames.length > 0) {
      const identifiers = schemaNames.map((m) => {
        const parts = m.split(/\s+/)
        return parts[parts.length - 1]
      })

      const referencesSchema = identifiers.some(
        (id) => file.code.includes(id) || file.code.includes(`from`) && file.code.includes(id),
      )

      if (!referencesSchema) {
        violations.push({
          file: file.name,
          line: 1,
          violation: 'File does not reference any Zod schemas — data may be unvalidated',
          severity: 'warning',
        })
      }
    }
  }

  return { valid: violations.filter((v) => v.severity === 'error').length === 0, violations }
}

app.post('/check-api', async (req: Request, res: Response) => {
  const { buildId, apiContracts, implementedRoutes } = req.body

  try {
    if (!apiContracts?.endpoints || !Array.isArray(implementedRoutes)) {
      return res.status(400).json({
        success: false,
        valid: false,
        mismatches: [],
        error: 'Missing required fields: apiContracts.endpoints and implementedRoutes',
      })
    }

    const result = checkApiContracts(apiContracts, implementedRoutes)

    if (!result.valid) {
      await logFailureToBuild(buildId, 'contract-checker:api', result.mismatches)
    }

    const status = result.valid ? 200 : 400
    return res.status(status).json({ success: true, ...result })
  } catch (error) {
    console.error('[check-api]', error)
    return res.status(500).json({ success: false, valid: false, mismatches: [], error: 'Internal Server Error' })
  }
})

app.post('/check-types', async (req: Request, res: Response) => {
  const { buildId, frontendCode, zodSchemas } = req.body

  try {
    if (!Array.isArray(frontendCode) || typeof zodSchemas !== 'string') {
      return res.status(400).json({
        success: false,
        valid: false,
        violations: [],
        error: 'Missing required fields: frontendCode (array) and zodSchemas (string)',
      })
    }

    const result = checkTypeSafety(frontendCode, zodSchemas)

    if (!result.valid) {
      await logFailureToBuild(buildId, 'contract-checker:types', result.violations)
    }

    const status = result.valid ? 200 : 400
    return res.status(status).json({ success: true, ...result })
  } catch (error) {
    console.error('[check-types]', error)
    return res.status(500).json({ success: false, valid: false, violations: [], error: 'Internal Server Error' })
  }
})

app.post('/check', async (req: Request, res: Response) => {
  const { buildId, astData, apiContracts, implementedRoutes } = req.body

  if (apiContracts && implementedRoutes) {
    try {
      if (!apiContracts?.endpoints || !Array.isArray(implementedRoutes)) {
        return res.status(400).json({ success: false, valid: false, mismatches: [], error: 'Invalid apiContracts or implementedRoutes' })
      }
      const result = checkApiContracts(apiContracts, implementedRoutes)
      if (!result.valid) {
        await logFailureToBuild(buildId, 'contract-checker:api', result.mismatches)
      }
      return res.status(result.valid ? 200 : 400).json({ success: true, ...result })
    } catch (error) {
      console.error('[check -> check-api]', error)
      return res.status(500).json({ success: false, error: 'Internal Server Error' })
    }
  }

  try {
    const isValid = astData && astData.interfacesMatch === true

    if (!isValid) {
      await logFailureToBuild(buildId, 'contract-checker', [{ error: 'Interface mismatch' }])
      return res.status(400).json({ success: false, error: 'Interface mismatch' })
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('[check]', error)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Contract Checker listening on port ${PORT}`))
