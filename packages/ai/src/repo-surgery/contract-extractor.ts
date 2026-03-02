import * as fs from 'fs'
import * as path from 'path'
import type {
  ExtractedContracts,
  ApiContract,
  DataContract,
  InterfaceContract,
  ASTData,
} from './schema'

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.venv', 'vendor'])

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])

const STATUS_CODE_RE = /\.status\(\s*(\d{3})\s*\)/g
const NEXT_RESPONSE_STATUS_RE = /NextResponse\.json\s*\([^)]*,\s*\{\s*status:\s*(\d{3})\s*\}/g
const ZOD_SCHEMA_RE = /(?:const|let)\s+(\w+)\s*=\s*z\s*\.\s*object\s*\(/g
const TYPE_ASSERTION_RE = /as\s+(\w+(?:<[^>]+>)?)/g
const RES_JSON_RE = /res\s*\.\s*(?:status\(\s*\d+\s*\)\s*\.\s*)?json\s*\(/g
const NEXT_RESPONSE_RE = /NextResponse\s*\.\s*json\s*\(/g

const FETCH_RE = /fetch\s*\(\s*[`'"](https?:\/\/[^`'"]+)[`'"]/g
const FETCH_TEMPLATE_RE = /fetch\s*\(\s*`([^`]+)`/g
const AXIOS_RE = /axios\s*\.\s*(get|post|put|patch|delete)\s*\(\s*[`'"](https?:\/\/[^`'"]+)[`'"]/g
const AXIOS_INSTANCE_RE = /axios\s*\.\s*(get|post|put|patch|delete)\s*\(\s*[`'"](\/[^`'"]+)[`'"]/g
const SDK_CLIENT_RE = /(?:client|sdk|api)\s*\.\s*(\w+)\s*\(/gi

export class ContractExtractor {
  async extract(dir: string, astData: ASTData): Promise<ExtractedContracts> {
    const [apiContracts, dataContracts, interfaceContracts] = await Promise.all([
      this.extractApiContracts(dir, astData),
      this.extractDataContracts(dir, astData),
      this.extractInterfaceContracts(dir),
    ])

    return { apiContracts, dataContracts, interfaceContracts }
  }

  async extractApiContracts(dir: string, astData: ASTData): Promise<ApiContract[]> {
    const contracts: ApiContract[] = []

    for (const route of astData.routes) {
      const absPath = path.isAbsolute(route.filePath)
        ? route.filePath
        : path.join(dir, route.filePath)

      let content: string
      try {
        content = fs.readFileSync(absPath, 'utf-8')
      } catch {
        contracts.push({
          method: route.method,
          path: route.path,
          statusCodes: [200],
          filePath: route.filePath,
        })
        continue
      }

      const statusCodes = this.extractStatusCodes(content)
      const requestSchema = this.extractRequestSchema(content)
      const responseSchema = this.detectResponseFormat(content)

      contracts.push({
        method: route.method,
        path: route.path,
        requestSchema: requestSchema ?? undefined,
        responseSchema: responseSchema ?? undefined,
        statusCodes: statusCodes.length > 0 ? statusCodes : [200],
        filePath: route.filePath,
      })
    }

    return contracts
  }

  async extractDataContracts(dir: string, astData: ASTData): Promise<DataContract[]> {
    const contracts: DataContract[] = []

    for (const schema of astData.schemas) {
      contracts.push({
        modelName: schema.name,
        tableName: schema.type === 'table' ? schema.name : undefined,
        fields: schema.fields.map((f) => ({
          name: f.name,
          type: f.type,
          required: !f.nullable,
        })),
        filePath: schema.filePath,
      })
    }

    const prismaFiles = this.findFiles(dir, (name) => name === 'schema.prisma')
    for (const prismaPath of prismaFiles) {
      const parsed = this.parsePrismaModels(prismaPath)
      for (const model of parsed) {
        const alreadyCaptured = contracts.some(
          (c) => c.modelName === model.modelName && c.filePath === model.filePath,
        )
        if (!alreadyCaptured) {
          contracts.push(model)
        }
      }
    }

    const sqlFiles = this.findFiles(dir, (name) => name.endsWith('.sql'))
    for (const sqlPath of sqlFiles) {
      const parsed = this.parseSqlMigrations(sqlPath, dir)
      for (const table of parsed) {
        const alreadyCaptured = contracts.some(
          (c) => c.modelName === table.modelName,
        )
        if (!alreadyCaptured) {
          contracts.push(table)
        }
      }
    }

    return contracts
  }

  async extractInterfaceContracts(dir: string): Promise<InterfaceContract[]> {
    const contracts: InterfaceContract[] = []
    const codeFiles = this.findFiles(dir, (name) => CODE_EXTENSIONS.has(path.extname(name)))

    for (const filePath of codeFiles) {
      let content: string
      try {
        content = fs.readFileSync(filePath, 'utf-8')
      } catch {
        continue
      }

      const relPath = path.relative(dir, filePath)
      this.extractFetchCalls(content, relPath, contracts)
      this.extractAxiosCalls(content, relPath, contracts)
      this.extractSdkCalls(content, relPath, contracts)
    }

    return contracts
  }

  private extractStatusCodes(content: string): number[] {
    const codes = new Set<number>()

    for (const re of [STATUS_CODE_RE, NEXT_RESPONSE_STATUS_RE]) {
      re.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = re.exec(content)) !== null) {
        const code = parseInt(match[1], 10)
        if (code >= 100 && code < 600) codes.add(code)
      }
    }

    return Array.from(codes).sort((a, b) => a - b)
  }

  private extractRequestSchema(content: string): string | null {
    ZOD_SCHEMA_RE.lastIndex = 0
    const zodMatch = ZOD_SCHEMA_RE.exec(content)
    if (zodMatch) return `zod:${zodMatch[1]}`

    TYPE_ASSERTION_RE.lastIndex = 0
    const assertMatch = TYPE_ASSERTION_RE.exec(content)
    if (assertMatch) return `type:${assertMatch[1]}`

    return null
  }

  private detectResponseFormat(content: string): string | null {
    RES_JSON_RE.lastIndex = 0
    if (RES_JSON_RE.test(content)) return 'json'

    NEXT_RESPONSE_RE.lastIndex = 0
    if (NEXT_RESPONSE_RE.test(content)) return 'json'

    if (/return\s+Response\s*\.\s*json\s*\(/g.test(content)) return 'json'
    if (/return\s+new\s+Response\s*\(/g.test(content)) return 'raw'

    return null
  }

  private parsePrismaModels(filePath: string): DataContract[] {
    let content: string
    try {
      content = fs.readFileSync(filePath, 'utf-8')
    } catch {
      return []
    }

    const models: DataContract[] = []
    const modelRe = /model\s+(\w+)\s*\{([^}]+)\}/g
    let match: RegExpExecArray | null

    while ((match = modelRe.exec(content)) !== null) {
      const modelName = match[1]
      const body = match[2]
      const fields: DataContract['fields'] = []

      for (const line of body.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue

        const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?)?/)
        if (fieldMatch) {
          fields.push({
            name: fieldMatch[1],
            type: fieldMatch[2],
            required: !fieldMatch[3],
          })
        }
      }

      models.push({
        modelName,
        tableName: modelName,
        fields,
        filePath,
      })
    }

    return models
  }

  private parseSqlMigrations(filePath: string, rootDir: string): DataContract[] {
    let content: string
    try {
      content = fs.readFileSync(filePath, 'utf-8')
    } catch {
      return []
    }

    const tables: DataContract[] = []
    const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?\s*\(([^;]+)\)/gi
    let match: RegExpExecArray | null

    while ((match = createRe.exec(content)) !== null) {
      const tableName = match[1]
      const body = match[2]
      const fields: DataContract['fields'] = []

      for (const line of body.split(',')) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (/^(PRIMARY|FOREIGN|UNIQUE|INDEX|CONSTRAINT|CHECK)\s/i.test(trimmed)) continue

        const colMatch = trimmed.match(/^["'`]?(\w+)["'`]?\s+(\w+)/)
        if (colMatch) {
          fields.push({
            name: colMatch[1],
            type: colMatch[2],
            required: /NOT\s+NULL/i.test(trimmed),
          })
        }
      }

      tables.push({
        modelName: tableName,
        tableName,
        fields,
        filePath: path.relative(rootDir, filePath),
      })
    }

    return tables
  }

  private extractFetchCalls(
    content: string,
    filePath: string,
    contracts: InterfaceContract[],
  ): void {
    FETCH_RE.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = FETCH_RE.exec(content)) !== null) {
      const url = match[1]
      const method = this.inferFetchMethod(content, match.index)
      contracts.push({
        service: this.inferServiceName(url),
        method,
        url,
        filePath,
      })
    }

    FETCH_TEMPLATE_RE.lastIndex = 0
    while ((match = FETCH_TEMPLATE_RE.exec(content)) !== null) {
      const url = match[1]
      if (!url.startsWith('http')) continue
      const method = this.inferFetchMethod(content, match.index)
      const existing = contracts.some((c) => c.url === url && c.filePath === filePath)
      if (!existing) {
        contracts.push({
          service: this.inferServiceName(url),
          method,
          url,
          filePath,
        })
      }
    }
  }

  private extractAxiosCalls(
    content: string,
    filePath: string,
    contracts: InterfaceContract[],
  ): void {
    for (const re of [AXIOS_RE, AXIOS_INSTANCE_RE]) {
      re.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = re.exec(content)) !== null) {
        const method = match[1].toUpperCase()
        const url = match[2]
        contracts.push({
          service: this.inferServiceName(url),
          method,
          url,
          filePath,
        })
      }
    }
  }

  private extractSdkCalls(
    content: string,
    filePath: string,
    contracts: InterfaceContract[],
  ): void {
    const sdkPatterns = [
      { re: /stripe\.\s*(\w+)\.\s*(\w+)\s*\(/g, service: 'stripe' },
      { re: /supabase\.\s*(?:from\(['"](\w+)['"]\)\.)?(\w+)\s*\(/g, service: 'supabase' },
      { re: /s3(?:Client)?\.\s*(\w+)\s*\(/g, service: 'aws-s3' },
      { re: /ses(?:Client)?\.\s*(\w+)\s*\(/g, service: 'aws-ses' },
      { re: /twilio\.\s*(\w+)\.\s*(\w+)\s*\(/g, service: 'twilio' },
      { re: /sendgrid\.\s*(\w+)\s*\(/g, service: 'sendgrid' },
    ]

    for (const { re, service } of sdkPatterns) {
      re.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = re.exec(content)) !== null) {
        const methodParts = Array.from(match).slice(1).filter(Boolean)
        contracts.push({
          service,
          method: methodParts.join('.'),
          filePath,
        })
      }
    }
  }

  private inferFetchMethod(content: string, matchIndex: number): string {
    const surroundingStart = Math.max(0, matchIndex - 200)
    const surrounding = content.slice(surroundingStart, matchIndex + 300)

    const methodMatch = surrounding.match(/method\s*:\s*['"](\w+)['"]/i)
    if (methodMatch) return methodMatch[1].toUpperCase()

    return 'GET'
  }

  private inferServiceName(url: string): string {
    try {
      const parsed = new URL(url.replace(/\$\{[^}]+\}/g, 'placeholder'))
      const host = parsed.hostname
      const parts = host.split('.')
      if (parts.length >= 2) {
        return parts[parts.length - 2]
      }
      return host
    } catch {
      const match = url.match(/https?:\/\/([^/]+)/)
      return match ? match[1] : 'unknown'
    }
  }

  private findFiles(dir: string, predicate: (name: string) => boolean): string[] {
    const result: string[] = []

    const walk = (current: string) => {
      let entries: fs.Dirent[]
      try {
        entries = fs.readdirSync(current, { withFileTypes: true })
      } catch {
        return
      }

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (SKIP_DIRS.has(entry.name)) continue
          walk(path.join(current, entry.name))
          continue
        }

        if (entry.isFile() && predicate(entry.name)) {
          result.push(path.join(current, entry.name))
        }
      }
    }

    walk(dir)
    return result
  }
}
