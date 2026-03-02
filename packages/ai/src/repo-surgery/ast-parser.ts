import * as fs from 'fs'
import * as path from 'path'
import type { ASTData, FunctionSignature, APIRoute, DatabaseSchemaEntry } from './schema'

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'vendor',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.venv',
])

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const PY_EXTENSIONS = new Set(['.py'])
const SCHEMA_FILES = new Set(['schema.prisma'])
const SCHEMA_EXTENSIONS = new Set(['.sql', '.prisma'])

export class ASTParser {
  async parseDirectory(dir: string): Promise<ASTData> {
    const functions: FunctionSignature[] = []
    const routes: APIRoute[] = []
    const schemas: DatabaseSchemaEntry[] = []

    const walk = async (currentDir: string) => {
      let entries: fs.Dirent[]
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true })
      } catch {
        return
      }

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (SKIP_DIRS.has(entry.name)) continue
          await walk(path.join(currentDir, entry.name))
          continue
        }

        if (!entry.isFile()) continue

        const filePath = path.join(currentDir, entry.name)
        const ext = path.extname(entry.name)
        const relativePath = path.relative(dir, filePath)
        let content: string

        try {
          content = fs.readFileSync(filePath, 'utf-8')
        } catch {
          continue
        }

        if (TS_EXTENSIONS.has(ext)) {
          const result = this.parseTypeScript(relativePath, content)
          functions.push(...result.functions)
          routes.push(...result.routes)
        } else if (PY_EXTENSIONS.has(ext)) {
          const result = this.parsePython(relativePath, content)
          functions.push(...result.functions)
          routes.push(...result.routes)
        }

        if (
          SCHEMA_EXTENSIONS.has(ext) ||
          SCHEMA_FILES.has(entry.name) ||
          content.includes('new Schema(')
        ) {
          schemas.push(...this.parseSchemas(relativePath, content))
        }
      }
    }

    await walk(dir)
    return { functions, routes, schemas }
  }

  parseTypeScript(
    filePath: string,
    content: string,
  ): { functions: FunctionSignature[]; routes: APIRoute[] } {
    const functions: FunctionSignature[] = []
    const routes: APIRoute[] = []
    const lines = content.split('\n')

    const exportedFnRe =
      /^export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^\s{]+))?/
    const classMethodRe =
      /^\s+(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^\s{]+))?\s*\{/
    const classDeclarationRe = /^(?:export\s+)?class\s+(\w+)/
    const arrowExportRe =
      /^export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)(?:\s*:\s*([^\s=]+))?\s*=>/

    let currentClass: string | undefined

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNum = i + 1

      const classMatch = line.match(classDeclarationRe)
      if (classMatch) {
        currentClass = classMatch[1]
      }

      if (line.trim() === '}' && currentClass && !line.startsWith(' ')) {
        currentClass = undefined
      }

      const fnMatch = line.match(exportedFnRe)
      if (fnMatch) {
        functions.push({
          name: fnMatch[1],
          filePath,
          line: lineNum,
          params: this.parseParamList(fnMatch[2]),
          returnType: fnMatch[3],
          exported: true,
        })
      }

      const arrowMatch = line.match(arrowExportRe)
      if (arrowMatch && !fnMatch) {
        functions.push({
          name: arrowMatch[1],
          filePath,
          line: lineNum,
          params: this.parseParamList(arrowMatch[2]),
          returnType: arrowMatch[3],
          exported: true,
        })
      }

      if (currentClass) {
        const methodMatch = line.match(classMethodRe)
        if (methodMatch && methodMatch[1] !== 'constructor') {
          functions.push({
            name: methodMatch[1],
            filePath,
            line: lineNum,
            params: this.parseParamList(methodMatch[2]),
            returnType: methodMatch[3],
            exported: false,
            className: currentClass,
          })
        }
      }
    }

    const isAppRouterFile = /app\/api\/.*route\.(ts|js)$/.test(filePath)
    if (isAppRouterFile) {
      const routePath = this.inferNextjsRoutePath(filePath)
      const httpMethodRe =
        /^export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*\(/gm
      let match
      while ((match = httpMethodRe.exec(content)) !== null) {
        const line =
          content.substring(0, match.index).split('\n').length
        routes.push({
          method: match[1],
          path: routePath,
          filePath,
          line,
          handler: match[1],
          params: [],
        })
      }
    }

    const expressRouteRe =
      /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g
    let expressMatch
    while ((expressMatch = expressRouteRe.exec(content)) !== null) {
      const line =
        content.substring(0, expressMatch.index).split('\n').length
      routes.push({
        method: expressMatch[1].toUpperCase(),
        path: expressMatch[2],
        filePath,
        line,
        params: this.extractRouteParams(expressMatch[2]),
      })
    }

    return { functions, routes }
  }

  parsePython(
    filePath: string,
    content: string,
  ): { functions: FunctionSignature[]; routes: APIRoute[] } {
    const functions: FunctionSignature[] = []
    const routes: APIRoute[] = []
    const lines = content.split('\n')

    const defRe = /^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(\S+))?\s*:/
    const classDefRe = /^class\s+(\w+)/
    const flaskRouteRe =
      /@app\.route\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*methods\s*=\s*\[([^\]]+)\])?\s*\)/
    const fastapiRouteRe =
      /@(?:router|app)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]\s*\)/

    let currentClass: string | undefined

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNum = i + 1

      const classMatch = line.match(classDefRe)
      if (classMatch) {
        currentClass = classMatch[1]
      }

      if (
        currentClass &&
        i > 0 &&
        line.length > 0 &&
        !line.startsWith(' ') &&
        !line.startsWith('\t') &&
        !line.startsWith('#') &&
        !line.startsWith('@')
      ) {
        currentClass = undefined
      }

      const flaskMatch = line.match(flaskRouteRe)
      if (flaskMatch) {
        const methods = flaskMatch[2]
          ? flaskMatch[2]
              .replace(/['"]/g, '')
              .split(',')
              .map((m) => m.trim().toUpperCase())
          : ['GET']
        for (const method of methods) {
          routes.push({
            method,
            path: flaskMatch[1],
            filePath,
            line: lineNum,
            params: this.extractRouteParams(flaskMatch[1]),
          })
        }
      }

      const fastapiMatch = line.match(fastapiRouteRe)
      if (fastapiMatch) {
        routes.push({
          method: fastapiMatch[1].toUpperCase(),
          path: fastapiMatch[2],
          filePath,
          line: lineNum,
          params: this.extractRouteParams(fastapiMatch[2]),
        })
      }

      const defMatch = line.match(defRe)
      if (defMatch) {
        const params = defMatch[2]
          .split(',')
          .map((p) => p.trim().split(':')[0].trim())
          .filter((p) => p && p !== 'self' && p !== 'cls')

        functions.push({
          name: defMatch[1],
          filePath,
          line: lineNum,
          params,
          returnType: defMatch[3],
          exported: !defMatch[1].startsWith('_'),
          className: currentClass,
        })
      }
    }

    return { functions, routes }
  }

  parseSchemas(filePath: string, content: string): DatabaseSchemaEntry[] {
    const schemas: DatabaseSchemaEntry[] = []

    const prismaModelRe = /model\s+(\w+)\s*\{([^}]+)\}/g
    let prismaMatch
    while ((prismaMatch = prismaModelRe.exec(content)) !== null) {
      const fields = this.parsePrismaFields(prismaMatch[2])
      schemas.push({
        name: prismaMatch[1],
        type: 'model',
        filePath,
        fields,
      })
    }

    const sqlTableRe =
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([^;]+?)\)\s*;/gi
    let sqlMatch
    while ((sqlMatch = sqlTableRe.exec(content)) !== null) {
      const fields = this.parseSQLFields(sqlMatch[2])
      schemas.push({
        name: sqlMatch[1],
        type: 'table',
        filePath,
        fields,
      })
    }

    const mongooseRe =
      /new\s+(?:mongoose\.)?Schema\s*\(\s*\{([\s\S]*?)\}\s*[,)]/g
    let mongooseMatch
    while ((mongooseMatch = mongooseRe.exec(content)) !== null) {
      const modelNameMatch = content
        .substring(0, mongooseMatch.index)
        .match(/(?:const|let|var)\s+(\w+)Schema\s*=/)
      const name = modelNameMatch ? modelNameMatch[1] : 'Unknown'
      const fields = this.parseMongooseFields(mongooseMatch[1])
      schemas.push({
        name,
        type: 'collection',
        filePath,
        fields,
      })
    }

    return schemas
  }

  private parseParamList(raw: string): string[] {
    if (!raw.trim()) return []
    return raw
      .split(',')
      .map((p) => p.trim().split(':')[0].split('=')[0].trim())
      .filter(Boolean)
  }

  private inferNextjsRoutePath(filePath: string): string {
    const match = filePath.match(/app\/api\/(.+)\/route\.(ts|js)$/)
    if (!match) return '/api'
    const segments = match[1].split('/').map((seg) => {
      if (seg.startsWith('[') && seg.endsWith(']')) {
        return `:${seg.slice(1, -1)}`
      }
      return seg
    })
    return `/api/${segments.join('/')}`
  }

  private extractRouteParams(routePath: string): string[] {
    const params: string[] = []
    const colonParams = routePath.match(/:(\w+)/g)
    if (colonParams) {
      params.push(...colonParams.map((p) => p.slice(1)))
    }
    const braceParams = routePath.match(/\{(\w+)\}/g)
    if (braceParams) {
      params.push(...braceParams.map((p) => p.slice(1, -1)))
    }
    const bracketParams = routePath.match(/<(\w+)(?::[^>]+)?>/g)
    if (bracketParams) {
      params.push(...bracketParams.map((p) => p.replace(/<|(?::[^>]+)?>/g, '')))
    }
    return params
  }

  private parsePrismaFields(
    block: string,
  ): DatabaseSchemaEntry['fields'] {
    return block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//') && !line.startsWith('@@'))
      .map((line) => {
        const parts = line.split(/\s+/)
        if (parts.length < 2) return null
        const name = parts[0]
        const rawType = parts[1]
        const nullable = rawType.endsWith('?')
        const type = rawType.replace('?', '').replace('[]', '')
        const rest = line.toLowerCase()
        return {
          name,
          type,
          nullable,
          isPrimary: rest.includes('@id'),
          isRelation: rest.includes('@relation'),
        }
      })
      .filter((f): f is NonNullable<typeof f> => f !== null)
  }

  private parseSQLFields(
    block: string,
  ): DatabaseSchemaEntry['fields'] {
    return block
      .split(',')
      .map((line) => line.trim())
      .filter(
        (line) =>
          line &&
          !line.toUpperCase().startsWith('PRIMARY KEY') &&
          !line.toUpperCase().startsWith('FOREIGN KEY') &&
          !line.toUpperCase().startsWith('CONSTRAINT') &&
          !line.toUpperCase().startsWith('INDEX') &&
          !line.toUpperCase().startsWith('UNIQUE'),
      )
      .map((line) => {
        const parts = line.split(/\s+/)
        if (parts.length < 2) return null
        const name = parts[0].replace(/["`]/g, '')
        const type = parts[1].replace(/["`]/g, '')
        const rest = line.toUpperCase()
        return {
          name,
          type,
          nullable: !rest.includes('NOT NULL'),
          isPrimary: rest.includes('PRIMARY KEY'),
          isRelation: rest.includes('REFERENCES'),
        }
      })
      .filter((f): f is NonNullable<typeof f> => f !== null)
  }

  private parseMongooseFields(
    block: string,
  ): DatabaseSchemaEntry['fields'] {
    const fields: DatabaseSchemaEntry['fields'] = []
    const fieldRe = /(\w+)\s*:\s*(?:\{[^}]*type\s*:\s*(\w+)[^}]*\}|(\w+))/g
    let match
    while ((match = fieldRe.exec(block)) !== null) {
      const name = match[1]
      const type = match[2] || match[3]
      const fieldBlock = match[0].toLowerCase()
      fields.push({
        name,
        type: type || 'Mixed',
        nullable: !fieldBlock.includes('required: true') && !fieldBlock.includes('required:true'),
        isPrimary: name === '_id',
        isRelation: fieldBlock.includes('ref:') || fieldBlock.includes('ref :'),
      })
    }
    return fields
  }
}
