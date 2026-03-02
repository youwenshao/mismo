import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import type { IngestionResult, ClocStats, DependencyInfo, RecentActivity } from './schema'
import { ASTParser } from './ast-parser'

const EXEC_OPTIONS = { encoding: 'utf-8' as const, timeout: 120_000 }

export class RepoIngestion {
  private workspaceDir: string
  private astParser: ASTParser
  private shallowClone: boolean

  constructor(opts?: { workspaceDir?: string; shallowClone?: boolean }) {
    this.workspaceDir = opts?.workspaceDir ?? '/tmp/mismo-surgery'
    this.shallowClone = opts?.shallowClone ?? true
    this.astParser = new ASTParser()
  }

  async clone(repoUrl: string, branch: string, workspaceDir: string): Promise<string> {
    const targetDir = path.join(workspaceDir, path.basename(repoUrl, '.git'))
    fs.mkdirSync(workspaceDir, { recursive: true })

    const depth = this.shallowClone ? 1 : 100
    try {
      execSync(
        `git clone --branch ${branch} --depth=${depth} ${repoUrl} ${targetDir}`,
        { ...EXEC_OPTIONS, stdio: 'pipe' },
      )
    } catch (err) {
      throw new Error(
        `Failed to clone ${repoUrl} (branch: ${branch}): ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    return targetDir
  }

  async analyzeComplexity(dir: string): Promise<ClocStats> {
    try {
      const output = execSync(`cloc --json ${dir}`, { ...EXEC_OPTIONS, stdio: 'pipe' })
      const parsed = JSON.parse(output)

      const languages: ClocStats['languages'] = {}
      let totalFiles = 0
      let totalLines = 0

      for (const [lang, data] of Object.entries(parsed)) {
        if (lang === 'header' || lang === 'SUM') continue
        const d = data as { nFiles: number; blank: number; comment: number; code: number }
        languages[lang] = {
          files: d.nFiles,
          blank: d.blank,
          comment: d.comment,
          code: d.code,
        }
        totalFiles += d.nFiles
        totalLines += d.code + d.blank + d.comment
      }

      return { totalFiles, totalLines, languages }
    } catch {
      return this.fallbackFileCount(dir)
    }
  }

  async analyzeDependencies(dir: string): Promise<DependencyInfo[]> {
    const deps: DependencyInfo[] = []

    const pkgJsonPath = path.join(dir, 'package.json')
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))

        for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
          deps.push({ name, current: String(version), outdated: false, type: 'production' })
        }
        for (const [name, version] of Object.entries(pkg.devDependencies ?? {})) {
          deps.push({ name, current: String(version), outdated: false, type: 'development' })
        }

        try {
          const outdatedRaw = execSync('npm outdated --json', {
            ...EXEC_OPTIONS,
            cwd: dir,
            stdio: 'pipe',
          })
          const outdated = JSON.parse(outdatedRaw)
          for (const dep of deps) {
            if (outdated[dep.name]) {
              dep.latest = outdated[dep.name].latest
              dep.outdated = true
            }
          }
        } catch {
          // npm outdated exits with code 1 when packages are outdated; ignore
        }
      } catch {
        // Malformed package.json
      }
    }

    const reqPath = path.join(dir, 'requirements.txt')
    if (fs.existsSync(reqPath)) {
      try {
        const content = fs.readFileSync(reqPath, 'utf-8')
        for (const line of content.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*(?:[=<>!~]+\s*(.+))?$/)
          if (match) {
            deps.push({
              name: match[1],
              current: match[2] ?? 'unknown',
              outdated: false,
              type: 'production',
            })
          }
        }
      } catch {
        // Unreadable requirements.txt
      }
    }

    return deps
  }

  async analyzeActivity(dir: string): Promise<RecentActivity> {
    try {
      const logOutput = execSync(
        `git log --format='%H|%an|%ae|%aI' -50`,
        { ...EXEC_OPTIONS, cwd: dir, stdio: 'pipe' },
      )

      const filesOutput = execSync(
        `git log --format='' --name-only -50`,
        { ...EXEC_OPTIONS, cwd: dir, stdio: 'pipe' },
      )

      const commits = logOutput
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, name, email, date] = line.split('|')
          return { hash, name, email, date }
        })

      const contributorMap = new Map<string, { name: string; email: string; commitCount: number }>()
      for (const commit of commits) {
        const existing = contributorMap.get(commit.email)
        if (existing) {
          existing.commitCount++
        } else {
          contributorMap.set(commit.email, {
            name: commit.name,
            email: commit.email,
            commitCount: 1,
          })
        }
      }

      const fileChanges = new Map<string, number>()
      for (const line of filesOutput.split('\n')) {
        const f = line.trim()
        if (f) {
          fileChanges.set(f, (fileChanges.get(f) ?? 0) + 1)
        }
      }

      const hotFiles = Array.from(fileChanges.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([filePath, changeCount]) => ({
          filePath,
          changeCount,
          lastModified: commits[0]?.date ?? new Date().toISOString(),
        }))

      return {
        totalCommits: commits.length,
        contributors: Array.from(contributorMap.values()).sort(
          (a, b) => b.commitCount - a.commitCount,
        ),
        hotFiles,
        lastCommitDate: commits[0]?.date ?? new Date().toISOString(),
      }
    } catch {
      return {
        totalCommits: 0,
        contributors: [],
        hotFiles: [],
        lastCommitDate: new Date().toISOString(),
      }
    }
  }

  async ingest(
    surgeryId: string,
    repoUrl: string,
    branch: string,
  ): Promise<IngestionResult> {
    const surgeryWorkspace = path.join(this.workspaceDir, surgeryId)
    const cloneDir = await this.clone(repoUrl, branch, surgeryWorkspace)

    const [clocStats, dependencies, recentActivity, astData] = await Promise.all([
      this.analyzeComplexity(cloneDir),
      this.analyzeDependencies(cloneDir),
      this.analyzeActivity(cloneDir),
      this.astParser.parseDirectory(cloneDir),
    ])

    return {
      surgeryId,
      cloneDir,
      clocStats,
      dependencies,
      recentActivity,
      astData,
    }
  }

  private fallbackFileCount(dir: string): ClocStats {
    const languages: ClocStats['languages'] = {}
    let totalFiles = 0
    let totalLines = 0

    const extMap: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.py': 'Python',
      '.go': 'Go',
      '.rs': 'Rust',
      '.java': 'Java',
      '.rb': 'Ruby',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.html': 'HTML',
      '.json': 'JSON',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.md': 'Markdown',
      '.sql': 'SQL',
    }

    const walk = (currentDir: string) => {
      let entries: fs.Dirent[]
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true })
      } catch {
        return
      }

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skip = new Set([
            'node_modules', '.git', 'vendor', 'dist', 'build', '.next', '__pycache__', '.venv',
          ])
          if (skip.has(entry.name)) continue
          walk(path.join(currentDir, entry.name))
          continue
        }

        if (!entry.isFile()) continue

        const ext = path.extname(entry.name)
        const lang = extMap[ext]
        if (!lang) continue

        totalFiles++
        try {
          const content = fs.readFileSync(path.join(currentDir, entry.name), 'utf-8')
          const lineCount = content.split('\n').length
          totalLines += lineCount

          if (!languages[lang]) {
            languages[lang] = { files: 0, blank: 0, comment: 0, code: 0 }
          }
          languages[lang].files++
          languages[lang].code += lineCount
        } catch {
          // Unreadable file
        }
      }
    }

    walk(dir)
    return { totalFiles, totalLines, languages }
  }
}
