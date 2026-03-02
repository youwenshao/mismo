import express from 'express'
import { prisma } from '@mismo/db'

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3001

interface Field {
  name: string
  type: string
  primary?: boolean
  unique?: boolean
  required?: boolean
  default?: string
  references?: { entity: string; field: string }
}

interface Entity {
  name: string
  fields: Field[]
  relations?: Array<{ name: string; type: string; entity: string; field?: string }>
}

interface DataContracts {
  entities: Entity[]
}

interface DataBoundaries {
  required_entities?: string[]
  forbidden_fields?: string[]
  max_entities?: number
}

const SQL_TYPE_MAP: Record<string, string> = {
  uuid: 'UUID',
  string: 'VARCHAR(255)',
  number: 'INTEGER',
  integer: 'INTEGER',
  float: 'FLOAT',
  boolean: 'BOOLEAN',
  timestamp: 'TIMESTAMP',
  text: 'TEXT',
  json: 'JSONB',
}

const ZOD_TYPE_MAP: Record<string, string> = {
  uuid: 'z.string().uuid()',
  string: 'z.string()',
  number: 'z.number().int()',
  integer: 'z.number().int()',
  float: 'z.number()',
  boolean: 'z.boolean()',
  timestamp: 'z.string().datetime()',
  text: 'z.string()',
  json: 'z.unknown()',
}

const TS_TYPE_MAP: Record<string, string> = {
  uuid: 'string',
  string: 'string',
  number: 'number',
  integer: 'number',
  float: 'number',
  boolean: 'boolean',
  timestamp: 'string',
  text: 'string',
  json: 'unknown',
}

function toSnakeCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
}

function generateSqlSchema(entities: Entity[]): string {
  const statements: string[] = []

  for (const entity of entities) {
    const tableName = toSnakeCase(entity.name)
    const columns: string[] = []
    const constraints: string[] = []

    for (const field of entity.fields) {
      const colName = toSnakeCase(field.name)
      const sqlType = SQL_TYPE_MAP[field.type] || 'TEXT'
      const parts = [`  "${colName}" ${sqlType}`]

      if (field.primary) parts.push('PRIMARY KEY')
      if (field.type === 'uuid' && field.primary) parts[parts.length - 1] = 'PRIMARY KEY DEFAULT gen_random_uuid()'
      if (field.unique) parts.push('UNIQUE')
      if (field.required && !field.primary) parts.push('NOT NULL')
      if (field.default && !field.primary) parts.push(`DEFAULT ${field.default}`)

      columns.push(parts.join(' '))

      if (field.references) {
        const refTable = toSnakeCase(field.references.entity)
        const refCol = toSnakeCase(field.references.field)
        constraints.push(`  CONSTRAINT "fk_${tableName}_${colName}" FOREIGN KEY ("${colName}") REFERENCES "${refTable}" ("${refCol}")`)
      }
    }

    const allParts = [...columns, ...constraints]
    statements.push(`CREATE TABLE IF NOT EXISTS "${tableName}" (\n${allParts.join(',\n')}\n);`)
  }

  return statements.join('\n\n')
}

function generateZodSchemas(entities: Entity[]): string {
  const lines: string[] = ["import { z } from 'zod'", '']

  for (const entity of entities) {
    lines.push(`export const ${entity.name}Schema = z.object({`)
    for (const field of entity.fields) {
      let zodType = ZOD_TYPE_MAP[field.type] || 'z.unknown()'
      if (!field.required && !field.primary) {
        zodType += '.optional()'
      }
      lines.push(`  ${field.name}: ${zodType},`)
    }
    lines.push('})', '')
    lines.push(`export type ${entity.name} = z.infer<typeof ${entity.name}Schema>`, '')
  }

  return lines.join('\n')
}

function generateTypeDefinitions(entities: Entity[]): string {
  const lines: string[] = []

  for (const entity of entities) {
    lines.push(`export interface ${entity.name} {`)
    for (const field of entity.fields) {
      const tsType = TS_TYPE_MAP[field.type] || 'unknown'
      const optional = !field.required && !field.primary ? '?' : ''
      lines.push(`  ${field.name}${optional}: ${tsType}`)
    }
    lines.push('}', '')
  }

  return lines.join('\n')
}

function validateBoundaries(entities: Entity[], boundaries: DataBoundaries): string[] {
  const errors: string[] = []
  const entityNames = entities.map((e) => e.name)

  if (boundaries.max_entities && entities.length > boundaries.max_entities) {
    errors.push(`Entity count ${entities.length} exceeds max_entities limit of ${boundaries.max_entities}`)
  }

  if (boundaries.required_entities) {
    for (const required of boundaries.required_entities) {
      if (!entityNames.includes(required)) {
        errors.push(`Required entity "${required}" is missing from data contracts`)
      }
    }
  }

  if (boundaries.forbidden_fields && boundaries.forbidden_fields.length > 0) {
    for (const entity of entities) {
      for (const field of entity.fields) {
        if (boundaries.forbidden_fields.includes(field.name)) {
          errors.push(`Forbidden field "${field.name}" found in entity "${entity.name}"`)
        }
      }
    }
  }

  return errors
}

app.post('/generate', async (req, res) => {
  const { buildId, dataContracts, dataBoundaries } = req.body as {
    buildId: string
    dataContracts: DataContracts
    dataBoundaries: DataBoundaries
  }

  try {
    if (!dataContracts?.entities || !Array.isArray(dataContracts.entities)) {
      throw new Error('Invalid dataContracts: expected { entities: [...] }')
    }

    const boundaryErrors = validateBoundaries(dataContracts.entities, dataBoundaries || {})
    if (boundaryErrors.length > 0) {
      throw new Error(`Data boundary violations: ${boundaryErrors.join('; ')}`)
    }

    const sqlSchema = generateSqlSchema(dataContracts.entities)
    const zodSchemas = generateZodSchemas(dataContracts.entities)
    const types = generateTypeDefinitions(dataContracts.entities)

    res.json({ success: true, sqlSchema, zodSchemas, types })
  } catch (error: any) {
    console.error(`[db-architect] Error for build ${buildId}:`, error.message)

    if (buildId) {
      try {
        const build = await prisma.build.findUnique({ where: { id: buildId } })
        if (build) {
          const existing = Array.isArray(build.errorLogs) ? build.errorLogs : []
          await prisma.build.update({
            where: { id: buildId },
            data: {
              status: 'FAILED',
              failureCount: { increment: 1 },
              errorLogs: [...(existing as any[]), { source: 'db-architect', error: error.message, timestamp: new Date().toISOString() }],
            },
          })
        }
      } catch (dbErr: any) {
        console.error('[db-architect] Failed to log error to Supabase:', dbErr.message)
      }
    }

    res.status(400).json({ success: false, error: error.message })
  }
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'db-architect' })
})

app.listen(PORT, () => {
  console.log(`[db-architect] listening on port ${PORT}`)
})
