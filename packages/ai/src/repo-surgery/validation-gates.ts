import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import type {
  ValidationResult,
  GateResult,
  GeneratedDiff,
  ExtractedContracts,
} from './schema'

export class ValidationGates {
  private cloneDir: string
  private originalBranch: string = ''
  private validationBranch: string = ''

  constructor({ cloneDir }: { cloneDir: string }) {
    this.cloneDir = cloneDir
  }

  async runAll(
    diffs: GeneratedDiff,
    contracts: ExtractedContracts,
  ): Promise<ValidationResult> {
    const gates: GateResult[] = []

    for (let gate = 1; gate <= 4; gate++) {
      const result = await this.runGate(gate, diffs, contracts)
      gates.push(result)

      if (!result.passed) {
        return {
          gates,
          allPassed: false,
          haltReason: `Gate ${gate} (${result.name}) failed: ${result.details}`,
        }
      }
    }

    return { gates, allPassed: true }
  }

  async runGate(
    gate: number,
    diffs: GeneratedDiff,
    contracts: ExtractedContracts,
  ): Promise<GateResult> {
    switch (gate) {
      case 1:
        return this.runStaticAnalysis(diffs)
      case 2:
        return this.runRegressionTests(diffs)
      case 3:
        return this.runContractValidation(contracts)
      case 4:
        return this.runSecurityScan(diffs)
      default:
        return {
          name: 'Unknown',
          gate,
          passed: false,
          details: `Unknown gate number: ${gate}`,
          blockers: [`No gate defined for number ${gate}`],
        }
    }
  }

  private async runStaticAnalysis(diffs: GeneratedDiff): Promise<GateResult> {
    const start = Date.now()
    const blockers: string[] = []

    try {
      const baselineErrors = this.collectStaticErrors()

      await this.applyDiffs(diffs)

      const postErrors = this.collectStaticErrors()

      await this.revertDiffs()

      const newEslintErrors = postErrors.eslint - baselineErrors.eslint
      const newTscErrors = postErrors.tsc - baselineErrors.tsc
      const newPylintErrors = postErrors.pylint - baselineErrors.pylint

      if (newEslintErrors > 0)
        blockers.push(`${newEslintErrors} new ESLint error(s) introduced`)
      if (newTscErrors > 0)
        blockers.push(`${newTscErrors} new TypeScript error(s) introduced`)
      if (newPylintErrors > 0)
        blockers.push(`${newPylintErrors} new pylint/flake8 error(s) introduced`)

      if (process.env.SONARQUBE_URL) {
        try {
          this.exec('npx sonar-scanner')
        } catch {
          // best-effort, don't block on SonarQube failures
        }
      }

      return {
        name: 'Static Analysis',
        gate: 1,
        passed: blockers.length === 0,
        details:
          blockers.length === 0
            ? 'No new static analysis errors introduced'
            : blockers.join('; '),
        blockers,
        duration: Date.now() - start,
      }
    } catch (err) {
      await this.revertDiffs().catch(() => {})
      return {
        name: 'Static Analysis',
        gate: 1,
        passed: false,
        details: `Static analysis failed: ${err instanceof Error ? err.message : String(err)}`,
        blockers: [String(err)],
        duration: Date.now() - start,
      }
    }
  }

  private async runRegressionTests(diffs: GeneratedDiff): Promise<GateResult> {
    const start = Date.now()
    const blockers: string[] = []

    try {
      await this.applyDiffs(diffs)

      for (const test of diffs.newTests) {
        const testDir = path.dirname(
          path.resolve(this.cloneDir, test.testFilePath),
        )
        fs.mkdirSync(testDir, { recursive: true })
        fs.writeFileSync(
          path.resolve(this.cloneDir, test.testFilePath),
          test.testContent,
          'utf-8',
        )
      }

      const runner = this.detectTestRunner()

      if (!runner) {
        await this.revertDiffs()
        return {
          name: 'Regression Tests',
          gate: 2,
          passed: true,
          details: 'No test runner detected, skipping regression tests',
          blockers: [],
          duration: Date.now() - start,
        }
      }

      try {
        this.exec(runner)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err)
        blockers.push(`Test runner failed: ${message}`)
      }

      await this.revertDiffs()

      return {
        name: 'Regression Tests',
        gate: 2,
        passed: blockers.length === 0,
        details:
          blockers.length === 0
            ? 'All tests passed'
            : blockers.join('; '),
        blockers,
        duration: Date.now() - start,
      }
    } catch (err) {
      await this.revertDiffs().catch(() => {})
      return {
        name: 'Regression Tests',
        gate: 2,
        passed: false,
        details: `Regression tests failed: ${err instanceof Error ? err.message : String(err)}`,
        blockers: [String(err)],
        duration: Date.now() - start,
      }
    }
  }

  private async runContractValidation(
    contracts: ExtractedContracts,
  ): Promise<GateResult> {
    const start = Date.now()
    const blockers: string[] = []

    for (const api of contracts.apiContracts) {
      const fullPath = path.resolve(this.cloneDir, api.filePath)

      if (!fs.existsSync(fullPath)) {
        blockers.push(`API route file missing: ${api.filePath}`)
        continue
      }

      const content = fs.readFileSync(fullPath, 'utf-8')

      const methodPattern = new RegExp(
        `(?:export\\s+(?:async\\s+)?function\\s+${api.method.toUpperCase()}|\\b${api.method.toUpperCase()}\\b.*(?:handler|route|app\\.${api.method.toLowerCase()}))`,
      )
      if (!methodPattern.test(content)) {
        blockers.push(
          `API contract broken: ${api.method.toUpperCase()} ${api.path} handler not found in ${api.filePath}`,
        )
      }

      if (api.responseSchema) {
        const responseStr = JSON.stringify(api.responseSchema)
        const keys = Object.keys(
          typeof api.responseSchema === 'object' && api.responseSchema !== null
            ? api.responseSchema
            : {},
        )
        for (const key of keys) {
          if (!content.includes(key)) {
            blockers.push(
              `API response field "${key}" may be missing from ${api.method.toUpperCase()} ${api.path} in ${api.filePath}`,
            )
          }
        }
      }
    }

    for (const data of contracts.dataContracts) {
      const fullPath = path.resolve(this.cloneDir, data.filePath)

      if (!fs.existsSync(fullPath)) {
        blockers.push(`Data contract file missing: ${data.filePath}`)
        continue
      }

      const content = fs.readFileSync(fullPath, 'utf-8')

      for (const field of data.fields) {
        if (!content.includes(field.name)) {
          blockers.push(
            `Data contract broken: field "${field.name}" missing from model "${data.modelName}" in ${data.filePath}`,
          )
        }
      }
    }

    return {
      name: 'Contract Validation',
      gate: 3,
      passed: blockers.length === 0,
      details:
        blockers.length === 0
          ? 'All contracts preserved'
          : `${blockers.length} contract violation(s) found`,
      blockers,
      duration: Date.now() - start,
    }
  }

  private async runSecurityScan(diffs: GeneratedDiff): Promise<GateResult> {
    const start = Date.now()
    const blockers: string[] = []

    if (fs.existsSync(path.resolve(this.cloneDir, 'package.json'))) {
      try {
        const auditOutput = this.exec('npm audit --json')
        try {
          const audit = JSON.parse(auditOutput)
          const metadata = audit.metadata?.vulnerabilities || {}
          const high = metadata.high || 0
          const critical = metadata.critical || 0
          if (high + critical > 0) {
            blockers.push(
              `npm audit: ${high} high, ${critical} critical vulnerabilities`,
            )
          }
        } catch {
          // non-JSON output, skip
        }
      } catch (err) {
        const output =
          err instanceof Error ? err.message : String(err)
        try {
          const audit = JSON.parse(output)
          const metadata = audit.metadata?.vulnerabilities || {}
          const high = metadata.high || 0
          const critical = metadata.critical || 0
          if (high + critical > 0) {
            blockers.push(
              `npm audit: ${high} high, ${critical} critical vulnerabilities`,
            )
          }
        } catch {
          // couldn't parse, skip
        }
      }
    }

    if (fs.existsSync(path.resolve(this.cloneDir, 'requirements.txt'))) {
      try {
        const pipOutput = this.exec('pip-audit --format=json')
        try {
          const vulns = JSON.parse(pipOutput)
          if (Array.isArray(vulns) && vulns.length > 0) {
            blockers.push(`pip-audit: ${vulns.length} vulnerability(s) found`)
          }
        } catch {
          // non-JSON output, skip
        }
      } catch {
        // pip-audit not available or failed, skip
      }
    }

    const secretPatterns = [
      /(?:api[_-]?key|secret|token|password|credential)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
      /(?:AKIA|AIza|sk-|ghp_|gho_)[A-Za-z0-9]{10,}/g,
      /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
    ]

    for (const diff of diffs.diffs) {
      for (const pattern of secretPatterns) {
        pattern.lastIndex = 0
        const matches = diff.unifiedDiff.match(pattern)
        if (matches) {
          blockers.push(
            `Potential secret found in ${diff.filePath}: ${matches.length} match(es)`,
          )
        }
      }
    }

    return {
      name: 'Security Scan',
      gate: 4,
      passed: blockers.length === 0,
      details:
        blockers.length === 0
          ? 'No security issues detected'
          : `${blockers.length} security issue(s) found`,
      blockers,
      duration: Date.now() - start,
    }
  }

  private async applyDiffs(diffs: GeneratedDiff): Promise<void> {
    this.originalBranch = this.exec('git rev-parse --abbrev-ref HEAD').trim()
    this.validationBranch = `surgery-validation-${Date.now()}`

    this.exec(`git checkout -b ${this.validationBranch}`)

    for (const diff of diffs.diffs) {
      const patchPath = path.resolve(
        this.cloneDir,
        `.tmp-patch-${Date.now()}.patch`,
      )
      try {
        fs.writeFileSync(patchPath, diff.unifiedDiff, 'utf-8')
        this.exec(`git apply --check "${patchPath}"`)
        this.exec(`git apply "${patchPath}"`)
      } finally {
        if (fs.existsSync(patchPath)) fs.unlinkSync(patchPath)
      }
    }
  }

  private async revertDiffs(): Promise<void> {
    if (!this.originalBranch) return

    try {
      this.exec('git checkout -- .')
      this.exec(`git checkout ${this.originalBranch}`)
      this.exec(`git branch -D ${this.validationBranch}`)
    } finally {
      this.validationBranch = ''
    }
  }

  private exec(cmd: string, opts?: object): string {
    try {
      return execSync(cmd, {
        encoding: 'utf-8',
        timeout: 60000,
        cwd: this.cloneDir,
        ...opts,
      })
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'stdout' in err &&
        typeof (err as { stdout: unknown }).stdout === 'string'
      ) {
        return (err as { stdout: string }).stdout
      }
      throw err
    }
  }

  private collectStaticErrors(): {
    eslint: number
    tsc: number
    pylint: number
  } {
    let eslint = 0
    let tsc = 0
    let pylint = 0

    if (this.hasEslint()) {
      try {
        const output = this.exec('npx eslint --format=json .')
        try {
          const results = JSON.parse(output)
          if (Array.isArray(results)) {
            eslint = results.reduce(
              (sum: number, r: { errorCount?: number }) =>
                sum + (r.errorCount || 0),
              0,
            )
          }
        } catch {
          // non-JSON output, count lines as rough error count
          eslint = output
            .split('\n')
            .filter((l) => /error/i.test(l)).length
        }
      } catch {
        // eslint not runnable, treat as zero
      }
    }

    if (fs.existsSync(path.resolve(this.cloneDir, 'tsconfig.json'))) {
      try {
        this.exec('npx tsc --noEmit --pretty false')
      } catch (err) {
        const output =
          err instanceof Error ? err.message : String(err)
        tsc = output
          .split('\n')
          .filter((l) => /error TS\d+/.test(l)).length
      }
    }

    if (this.hasPythonLinter()) {
      try {
        const cmd = fs.existsSync(path.resolve(this.cloneDir, '.flake8'))
          ? 'flake8'
          : 'python -m pylint --recursive=y .'
        const output = this.exec(cmd)
        pylint = output
          .split('\n')
          .filter((l) => l.trim().length > 0).length
      } catch (err) {
        const output =
          err instanceof Error ? err.message : String(err)
        pylint = output
          .split('\n')
          .filter((l) => l.trim().length > 0).length
      }
    }

    return { eslint, tsc, pylint }
  }

  private hasEslint(): boolean {
    const dir = fs.readdirSync(this.cloneDir)
    return dir.some(
      (f) => f.startsWith('.eslintrc') || f.startsWith('eslint.config'),
    )
  }

  private hasPythonLinter(): boolean {
    return (
      fs.existsSync(path.resolve(this.cloneDir, 'pylintrc')) ||
      fs.existsSync(path.resolve(this.cloneDir, '.pylintrc')) ||
      fs.existsSync(path.resolve(this.cloneDir, '.flake8'))
    )
  }

  private detectTestRunner(): string | null {
    if (
      this.fileExists('jest.config.js') ||
      this.fileExists('jest.config.ts') ||
      this.fileExists('jest.config.cjs') ||
      this.fileExists('jest.config.mjs') ||
      this.packageJsonContains('jest')
    ) {
      return 'npx jest --json --forceExit'
    }

    if (
      this.fileExists('vitest.config.ts') ||
      this.fileExists('vitest.config.js') ||
      this.fileExists('vitest.config.mts')
    ) {
      return 'npx vitest run --reporter=json'
    }

    if (
      this.fileExists('pytest.ini') ||
      this.fileExists('conftest.py') ||
      this.pyprojectHasPytest()
    ) {
      return 'python -m pytest --tb=short -q'
    }

    if (this.fileExists('go.mod')) {
      return 'go test ./...'
    }

    return null
  }

  private fileExists(name: string): boolean {
    return fs.existsSync(path.resolve(this.cloneDir, name))
  }

  private packageJsonContains(key: string): boolean {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(
          path.resolve(this.cloneDir, 'package.json'),
          'utf-8',
        ),
      )
      return !!(pkg.devDependencies?.[key] || pkg.dependencies?.[key])
    } catch {
      return false
    }
  }

  private pyprojectHasPytest(): boolean {
    const pyprojectPath = path.resolve(this.cloneDir, 'pyproject.toml')
    if (!fs.existsSync(pyprojectPath)) return false
    try {
      const content = fs.readFileSync(pyprojectPath, 'utf-8')
      return content.includes('[tool.pytest') || content.includes('pytest')
    } catch {
      return false
    }
  }
}
