import * as fs from 'fs'
import * as path from 'path'
import { generateObject, type LanguageModel } from 'ai'
import { z } from 'zod'
import { getActiveModel } from '../providers'
import type { BoundaryMap, FileClassification, BoundaryZone, ASTData } from './schema'
import { boundaryMapSchema } from './schema'

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.venv', 'vendor'])

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.rb', '.vue', '.svelte',
])

const ZONE_PATTERNS: Record<BoundaryZone, RegExp[]> = {
  core: [
    /\bmigrations?\b/i,
    /\bauth\b/i,
    /\bcore\b/i,
    /\bdb\b/i,
    /\bdatabase\b/i,
    /\bprisma\b/i,
  ],
  shell: [
    /\bapi\b/i,
    /\broutes?\b/i,
    /\bwebhooks?\b/i,
    /\bhandlers?\b/i,
    /\bendpoints?\b/i,
    /\bcontrollers?\b/i,
  ],
  adapter: [
    /\bmiddleware\b/i,
    /\bdto\b/i,
    /\bmappers?\b/i,
    /\bserializers?\b/i,
    /\badapters?\b/i,
    /\btransformers?\b/i,
  ],
  safeToModify: [],
}

const DB_FILE_PATTERNS = [
  /database\.(ts|js|py|go)$/i,
  /db\.(ts|js|py|go)$/i,
  /connection\.(ts|js|py|go)$/i,
  /prisma\.ts$/i,
  /schema\.prisma$/i,
]

const EXTERNAL_CLIENT_PATTERNS = [
  /client\.(ts|js)$/i,
  /sdk\.(ts|js)$/i,
  /service\.(ts|js)$/i,
]

interface ImportGraph {
  dependents: Map<string, Set<string>>
  dependencies: Map<string, Set<string>>
}

const IMPORT_RE = /(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g

export class BoundaryMapper {
  private model: LanguageModel | undefined

  constructor(opts?: { model?: LanguageModel }) {
    this.model = opts?.model
  }

  async classifyDirectory(
    dir: string,
    astData: ASTData,
  ): Promise<{ boundaryMap: BoundaryMap; classifications: FileClassification[] }> {
    const files = this.walkCodeFiles(dir)
    const relativePaths = files.map((f) => path.relative(dir, f))

    const importGraph = this.buildImportGraph(dir, files)
    const heuristic = this.heuristicPass(relativePaths, importGraph)

    try {
      return await this.llmRefinementPass(heuristic, astData, relativePaths)
    } catch {
      return this.toBoundaryResult(heuristic)
    }
  }

  private heuristicPass(
    files: string[],
    graph: ImportGraph,
  ): FileClassification[] {
    return files.map((filePath) => {
      const dependentCount = graph.dependents.get(filePath)?.size ?? 0
      const dependencyCount = graph.dependencies.get(filePath)?.size ?? 0

      const zone = this.classifySingleFile(filePath, dependentCount)

      return {
        filePath,
        zone,
        reason: this.reasonForZone(zone, filePath, dependentCount),
        dependentCount,
        dependencyCount,
      }
    })
  }

  private classifySingleFile(filePath: string, dependentCount: number): BoundaryZone {
    const normalized = filePath.replace(/\\/g, '/')

    for (const pattern of ZONE_PATTERNS.core) {
      if (pattern.test(normalized)) return 'core'
    }
    if (DB_FILE_PATTERNS.some((p) => p.test(normalized))) return 'core'
    if (dependentCount > 10) return 'core'

    for (const pattern of ZONE_PATTERNS.shell) {
      if (pattern.test(normalized)) return 'shell'
    }
    if (EXTERNAL_CLIENT_PATTERNS.some((p) => p.test(normalized))) return 'shell'

    for (const pattern of ZONE_PATTERNS.adapter) {
      if (pattern.test(normalized)) return 'adapter'
    }

    return 'safeToModify'
  }

  private reasonForZone(zone: BoundaryZone, filePath: string, dependentCount: number): string {
    switch (zone) {
      case 'core':
        if (dependentCount > 10) return `high dependent count (${dependentCount})`
        if (DB_FILE_PATTERNS.some((p) => p.test(filePath))) return 'database connection file'
        return 'matches core path pattern'
      case 'shell':
        if (EXTERNAL_CLIENT_PATTERNS.some((p) => p.test(filePath))) return 'external service client'
        return 'matches shell path pattern'
      case 'adapter':
        return 'matches adapter path pattern'
      case 'safeToModify':
        return 'isolated or low-dependency file'
    }
  }

  private async llmRefinementPass(
    heuristic: FileClassification[],
    astData: ASTData,
    allFiles: string[],
  ): Promise<{ boundaryMap: BoundaryMap; classifications: FileClassification[] }> {
    const model = this.model ?? getActiveModel()

    const summary = heuristic.map((c) => `${c.filePath} -> ${c.zone} (${c.reason})`).join('\n')

    const routesSummary = astData.routes
      .slice(0, 50)
      .map((r) => `${r.method} ${r.path} (${r.filePath})`)
      .join('\n')

    const schemasSummary = astData.schemas
      .slice(0, 30)
      .map((s) => `${s.type} ${s.name} (${s.filePath})`)
      .join('\n')

    const { object } = await generateObject({
      model,
      schema: z.object({
        boundaryMap: boundaryMapSchema,
        overrides: z.array(
          z.object({
            filePath: z.string(),
            zone: z.enum(['core', 'shell', 'adapter', 'safeToModify']),
            reason: z.string(),
          }),
        ),
      }),
      system: [
        'You are a code architecture analyst specializing in BMAD boundary mapping.',
        '',
        'BMAD boundary zones:',
        '- core: Critical infrastructure that must not be casually modified. Database schemas, migrations, auth systems, shared models with many dependents.',
        '- shell: Entry/exit points of the application. API routes, webhook handlers, CLI commands, external service clients.',
        '- adapter: Translation layers between core and shell. Middleware, DTOs, mappers, serializers.',
        '- safeToModify: Isolated features, utilities with few dependents, UI components, tests. Can be freely changed.',
        '',
        'Review the heuristic classifications and correct any misplacements.',
        'Only override files where the heuristic is clearly wrong.',
      ].join('\n'),
      prompt: [
        `Total files: ${allFiles.length}`,
        '',
        'Heuristic classifications:',
        summary,
        '',
        'Known API routes:',
        routesSummary || '(none detected)',
        '',
        'Known data schemas:',
        schemasSummary || '(none detected)',
        '',
        'Produce the final boundaryMap and list any overrides from the heuristic.',
      ].join('\n'),
    })

    const overrideMap = new Map(object.overrides.map((o) => [o.filePath, o]))

    const refined = heuristic.map((c) => {
      const override = overrideMap.get(c.filePath)
      if (override) {
        return { ...c, zone: override.zone as BoundaryZone, reason: override.reason }
      }
      return c
    })

    return {
      boundaryMap: object.boundaryMap,
      classifications: refined,
    }
  }

  private buildImportGraph(dir: string, absolutePaths: string[]): ImportGraph {
    const dependents = new Map<string, Set<string>>()
    const dependencies = new Map<string, Set<string>>()

    const relPaths = absolutePaths.map((f) => path.relative(dir, f))
    const relSet = new Set(relPaths)

    for (const absFile of absolutePaths) {
      const rel = path.relative(dir, absFile)
      let content: string
      try {
        content = fs.readFileSync(absFile, 'utf-8')
      } catch {
        continue
      }

      const deps = new Set<string>()
      let match: RegExpExecArray | null

      IMPORT_RE.lastIndex = 0
      while ((match = IMPORT_RE.exec(content)) !== null) {
        const specifier = match[1] ?? match[2]
        if (!specifier.startsWith('.')) continue

        const fileDir = path.dirname(absFile)
        const resolved = this.resolveImport(fileDir, specifier, dir, relSet)
        if (resolved) {
          deps.add(resolved)

          if (!dependents.has(resolved)) dependents.set(resolved, new Set())
          dependents.get(resolved)!.add(rel)
        }
      }

      dependencies.set(rel, deps)
    }

    return { dependents, dependencies }
  }

  private resolveImport(
    fromDir: string,
    specifier: string,
    rootDir: string,
    knownFiles: Set<string>,
  ): string | null {
    const resolved = path.resolve(fromDir, specifier)
    const rel = path.relative(rootDir, resolved)

    if (knownFiles.has(rel)) return rel

    const extensions = ['.ts', '.tsx', '.js', '.jsx']
    for (const ext of extensions) {
      if (knownFiles.has(rel + ext)) return rel + ext
    }

    const indexVariants = extensions.map((ext) => path.join(rel, `index${ext}`))
    for (const idx of indexVariants) {
      if (knownFiles.has(idx)) return idx
    }

    return null
  }

  private walkCodeFiles(dir: string): string[] {
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

        if (!entry.isFile()) continue
        if (CODE_EXTENSIONS.has(path.extname(entry.name))) {
          result.push(path.join(current, entry.name))
        }
      }
    }

    walk(dir)
    return result
  }

  private toBoundaryResult(
    classifications: FileClassification[],
  ): { boundaryMap: BoundaryMap; classifications: FileClassification[] } {
    const boundaryMap: BoundaryMap = {
      core: [],
      shell: [],
      adapter: [],
      safeToModify: [],
    }

    for (const c of classifications) {
      boundaryMap[c.zone].push(c.filePath)
    }

    return { boundaryMap, classifications }
  }
}
