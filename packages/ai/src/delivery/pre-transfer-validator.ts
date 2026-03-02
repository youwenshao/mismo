import * as fs from 'fs'
import * as path from 'path'

import { scanForSecrets, type SecretMatch } from '../code-review/secret-scanner'

export interface ValidationGateResult {
  gate: string
  passed: boolean
  details: string
  blockers: string[]
}

export interface PreTransferValidationResult {
  secretScanPassed: boolean
  bmadChecksPassed: boolean
  contractCheckPassed: boolean
  envScanPassed: boolean
  allPassed: boolean
  gates: ValidationGateResult[]
  blockers: string[]
}

export interface PreTransferValidationInput {
  workspaceDir: string
  buildStatus: string
  commissionStatus: string
  apiContracts?: {
    endpoints: Array<{
      path: string
      method: string
      response: { status: number; body: unknown }
    }>
  }
  implementedRoutes?: Array<{
    path: string
    method: string
    code: string
  }>
  contractCheckerUrl?: string
}

const ENV_FILE_PATTERNS = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.staging',
  '.env.development',
  '.env.test',
]

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.turbo',
  '__pycache__', '.venv', 'vendor', '.cache',
])

function collectFiles(
  dir: string,
  basePath = '',
): Array<{ path: string; content: string }> {
  const results: Array<{ path: string; content: string }> = []

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      results.push(...collectFiles(fullPath, relativePath))
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      const textExts = new Set([
        '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yaml', '.yml',
        '.toml', '.env', '.sh', '.py', '.go', '.rs', '.sql', '.html',
        '.css', '.scss', '.prisma', '.graphql', '.txt', '.cfg', '.ini',
        '.xml', '.csv',
      ])
      const isTextFile = textExts.has(ext) || entry.name.startsWith('.')
      if (!isTextFile) continue

      try {
        const stat = fs.statSync(fullPath)
        if (stat.size > 1_000_000) continue
        const content = fs.readFileSync(fullPath, 'utf-8')
        results.push({ path: relativePath, content })
      } catch {
        // skip unreadable files
      }
    }
  }

  return results
}

function runSecretScan(workspaceDir: string): ValidationGateResult {
  const files = collectFiles(workspaceDir)
  const matches: SecretMatch[] = scanForSecrets(files)
  const criticalOrHigh = matches.filter(
    (m) => m.severity === 'critical' || m.severity === 'high',
  )

  if (criticalOrHigh.length === 0) {
    return {
      gate: 'secret_scan',
      passed: true,
      details: `Scanned ${files.length} files. No critical/high secrets detected.`,
      blockers: [],
    }
  }

  return {
    gate: 'secret_scan',
    passed: false,
    details: `Found ${criticalOrHigh.length} critical/high secret(s) in ${files.length} files.`,
    blockers: criticalOrHigh.map(
      (m) => `${m.pattern} in ${m.file}:${m.line}`,
    ),
  }
}

function runEnvFileScan(workspaceDir: string): ValidationGateResult {
  const found: string[] = []

  for (const pattern of ENV_FILE_PATTERNS) {
    const envPath = path.join(workspaceDir, pattern)
    if (fs.existsSync(envPath)) {
      found.push(pattern)
    }
  }

  if (found.length === 0) {
    return {
      gate: 'env_file_scan',
      passed: true,
      details: 'No .env files found in workspace root.',
      blockers: [],
    }
  }

  return {
    gate: 'env_file_scan',
    passed: false,
    details: `Found ${found.length} .env file(s) that must not be committed.`,
    blockers: found.map((f) => `Remove ${f} before delivery (use GitHub Secrets instead)`),
  }
}

function runBmadAcceptanceCheck(
  buildStatus: string,
  commissionStatus: string,
): ValidationGateResult {
  const blockers: string[] = []

  if (buildStatus !== 'SUCCESS') {
    blockers.push(`Build status is "${buildStatus}", expected "SUCCESS"`)
  }
  if (commissionStatus !== 'COMPLETED') {
    blockers.push(`Commission status is "${commissionStatus}", expected "COMPLETED"`)
  }

  return {
    gate: 'bmad_acceptance',
    passed: blockers.length === 0,
    details: blockers.length === 0
      ? 'Build succeeded and commission is completed.'
      : `${blockers.length} BMAD acceptance check(s) failed.`,
    blockers,
  }
}

async function runContractDiffCheck(
  input: PreTransferValidationInput,
): Promise<ValidationGateResult> {
  if (!input.apiContracts || !input.implementedRoutes) {
    return {
      gate: 'contract_diff',
      passed: true,
      details: 'No API contracts provided — skipping contract diff check.',
      blockers: [],
    }
  }

  const checkerUrl = input.contractCheckerUrl
    ?? process.env.CONTRACT_CHECKER_URL
    ?? 'http://localhost:3012'

  try {
    const response = await fetch(`${checkerUrl}/check-api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiContracts: input.apiContracts,
        implementedRoutes: input.implementedRoutes,
      }),
    })

    const data = (await response.json()) as {
      valid: boolean
      mismatches?: Array<{ endpoint: string; expected: string; actual: string }>
    }

    if (data.valid) {
      return {
        gate: 'contract_diff',
        passed: true,
        details: 'All API contracts match implementation.',
        blockers: [],
      }
    }

    return {
      gate: 'contract_diff',
      passed: false,
      details: `${data.mismatches?.length ?? 0} contract mismatch(es) found.`,
      blockers: (data.mismatches ?? []).map(
        (m) => `${m.endpoint}: expected ${m.expected}, got ${m.actual}`,
      ),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      gate: 'contract_diff',
      passed: false,
      details: `Contract checker unreachable: ${message}`,
      blockers: [`Contract checker service error: ${message}`],
    }
  }
}

export async function validatePreTransfer(
  input: PreTransferValidationInput,
): Promise<PreTransferValidationResult> {
  const secretGate = runSecretScan(input.workspaceDir)
  const envGate = runEnvFileScan(input.workspaceDir)
  const bmadGate = runBmadAcceptanceCheck(input.buildStatus, input.commissionStatus)
  const contractGate = await runContractDiffCheck(input)

  const gates = [secretGate, envGate, bmadGate, contractGate]
  const allBlockers = gates.flatMap((g) => g.blockers)

  return {
    secretScanPassed: secretGate.passed,
    bmadChecksPassed: bmadGate.passed,
    contractCheckPassed: contractGate.passed,
    envScanPassed: envGate.passed,
    allPassed: gates.every((g) => g.passed),
    gates,
    blockers: allBlockers,
  }
}
