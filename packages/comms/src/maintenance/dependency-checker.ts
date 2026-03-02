import { execSync } from 'child_process'
import { mkdirSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

export interface OutdatedPackage {
  name: string
  current: string
  wanted: string
  latest: string
  type: 'patch' | 'minor' | 'major'
  isSecurityPatch: boolean
}

export interface DependencyCheckResult {
  repoUrl: string
  branch: string
  outdated: OutdatedPackage[]
  securityIssues: OutdatedPackage[]
  recommendations: Array<{
    action: 'auto-pr' | 'needs-review' | 'client-approval'
    packages: OutdatedPackage[]
  }>
  checkedAt: string
}

export async function checkDependencies(
  githubUrl: string,
  branch: string = 'main',
): Promise<DependencyCheckResult> {
  const workDir = join('/tmp/mismo-maintenance', randomUUID())
  mkdirSync(workDir, { recursive: true })

  try {
    execSync(`git clone --depth 1 --branch ${branch} ${githubUrl} ${workDir}`, {
      stdio: 'pipe',
      timeout: 60000,
    })

    let outdatedJson: Record<string, { current: string; wanted: string; latest: string }> = {}
    try {
      const output = execSync('npm outdated --json', { cwd: workDir, stdio: 'pipe' }).toString()
      outdatedJson = JSON.parse(output)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'stdout' in err) {
        const stdout = (err as { stdout: Buffer }).stdout.toString()
        if (stdout.trim()) {
          outdatedJson = JSON.parse(stdout)
        }
      }
    }

    let auditVulnerabilities = new Set<string>()
    try {
      const auditOutput = execSync('npm audit --json 2>/dev/null || true', {
        cwd: workDir,
        stdio: 'pipe',
      }).toString()
      const audit = JSON.parse(auditOutput)
      if (audit.vulnerabilities) {
        auditVulnerabilities = new Set(Object.keys(audit.vulnerabilities))
      }
    } catch {
      // audit may not be available
    }

    const outdated: OutdatedPackage[] = Object.entries(outdatedJson).map(([name, info]) => {
      const type = classifyUpdate(info.current, info.latest)
      return {
        name,
        current: info.current,
        wanted: info.wanted,
        latest: info.latest,
        type,
        isSecurityPatch: auditVulnerabilities.has(name),
      }
    })

    const securityIssues = outdated.filter((p) => p.isSecurityPatch)

    const recommendations = [
      {
        action: 'auto-pr' as const,
        packages: outdated.filter((p) => p.isSecurityPatch || p.type === 'patch'),
      },
      {
        action: 'needs-review' as const,
        packages: outdated.filter((p) => p.type === 'minor' && !p.isSecurityPatch),
      },
      {
        action: 'client-approval' as const,
        packages: outdated.filter((p) => p.type === 'major' && !p.isSecurityPatch),
      },
    ].filter((r) => r.packages.length > 0)

    return {
      repoUrl: githubUrl,
      branch,
      outdated,
      securityIssues,
      recommendations,
      checkedAt: new Date().toISOString(),
    }
  } finally {
    if (existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true })
    }
  }
}

function classifyUpdate(current: string, latest: string): 'patch' | 'minor' | 'major' {
  const [curMajor, curMinor] = current.replace(/^[^0-9]*/, '').split('.').map(Number)
  const [latMajor, latMinor] = latest.replace(/^[^0-9]*/, '').split('.').map(Number)

  if (curMajor !== latMajor) return 'major'
  if (curMinor !== latMinor) return 'minor'
  return 'patch'
}
