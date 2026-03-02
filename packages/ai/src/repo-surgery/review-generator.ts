import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

import type {
  ReviewOutput,
  GeneratedDiff,
  ValidationResult,
  ImpactReport,
  BoundaryMap,
} from './schema'

interface ReviewGeneratorConfig {
  cloneDir: string
  repoUrl: string
  githubToken?: string
}

export class ReviewGenerator {
  private cloneDir: string
  private repoUrl: string
  private githubToken: string | undefined

  constructor(config: ReviewGeneratorConfig) {
    this.cloneDir = config.cloneDir
    this.repoUrl = config.repoUrl
    this.githubToken = config.githubToken ?? process.env.GITHUB_TOKEN
  }

  async generate(
    surgeryId: string,
    changeRequest: string,
    diffs: GeneratedDiff,
    validation: ValidationResult,
    impactReport: ImpactReport,
    boundaryMap: BoundaryMap,
  ): Promise<ReviewOutput> {
    const originalBranch = this.exec('git rev-parse --abbrev-ref HEAD').trim()
    const branchName = `surgery/${surgeryId}/${this.slugify(changeRequest)}`
      .slice(0, 60)

    this.exec(`git checkout -b ${branchName}`)

    for (const diff of diffs.diffs) {
      const patchPath = path.join(this.cloneDir, `.surgery-${Date.now()}.patch`)
      fs.writeFileSync(patchPath, diff.unifiedDiff, 'utf-8')
      try {
        this.exec(`git apply ${patchPath}`)
      } finally {
        fs.unlinkSync(patchPath)
      }
    }

    for (const test of diffs.newTests) {
      const testFullPath = path.join(this.cloneDir, test.testFilePath)
      fs.mkdirSync(path.dirname(testFullPath), { recursive: true })
      fs.writeFileSync(testFullPath, test.testContent, 'utf-8')
    }

    this.exec('git add -A')
    this.exec(`git commit -m "[Repo Surgery] ${changeRequest.replace(/"/g, '\\"')}"`)
    this.exec(`git push origin ${branchName}`)

    const confidenceResult = this.calculateConfidence(
      validation,
      impactReport,
      boundaryMap,
    )
    const { additions, deletions } = this.countDiffStats(diffs)
    const riskLabel = confidenceResult.label

    const prBody = this.generatePRBody(
      changeRequest,
      confidenceResult.score,
      riskLabel,
      impactReport,
      boundaryMap,
      validation,
      diffs,
      originalBranch,
    )

    let prUrl = ''
    let prNumber = 0

    if (this.githubToken) {
      try {
        const pr = await this.createPullRequest(
          branchName,
          originalBranch,
          changeRequest,
          prBody,
          riskLabel,
        )
        prUrl = pr.url
        prNumber = pr.number
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`Failed to create GitHub PR: ${message}`)
      }
    }

    return {
      prUrl,
      prNumber,
      confidenceScore: confidenceResult.score,
      confidenceLabel: riskLabel,
      riskSummary: impactReport.reasoning,
      surgeryBranch: branchName,
      rollbackBranch: originalBranch,
      filesChanged: diffs.totalFilesModified + diffs.totalFilesCreated,
      additions,
      deletions,
    }
  }

  private calculateConfidence(
    validation: ValidationResult,
    impactReport: ImpactReport,
    _boundaryMap: BoundaryMap,
  ): { score: number; label: ReviewOutput['confidenceLabel'] } {
    let score = 0

    const allGatesPassed = validation.gates.length === 4
      && validation.gates.every((g) => g.passed)
    if (allGatesPassed) score += 40

    const touchedZones = new Set(
      impactReport.filesToTouch
        .filter((f) => f.action !== 'avoid')
        .map((f) => f.zone),
    )
    const onlySafeZones = [...touchedZones].every(
      (z) => z === 'safeToModify' || z === 'adapter',
    )
    if (onlySafeZones) score += 25

    const hasCoreInBlast = impactReport.filesToTouch.some(
      (f) => f.zone === 'core',
    )
    if (!hasCoreInBlast) score += 15

    const regressionGate = validation.gates.find((g) => g.gate === 2)
    if (regressionGate?.passed) score += 10

    const changedFiles = impactReport.filesToTouch.filter(
      (f) => f.action !== 'avoid',
    )
    if (changedFiles.length > 0) {
      const totalDeps = changedFiles.reduce((sum, _f) => {
        const matching = impactReport.filesToTouch.find(
          (ft) => ft.filePath === _f.filePath,
        )
        return sum + (matching ? 1 : 0)
      }, 0)
      const avgDeps = totalDeps / changedFiles.length
      if (avgDeps < 5) score += 10
    } else {
      score += 10
    }

    let label: ReviewOutput['confidenceLabel']
    if (score >= 85) label = 'safe-to-merge'
    else if (score >= 60) label = 'review-recommended'
    else label = 'manual-review-required'

    return { score, label }
  }

  private async createPullRequest(
    branchName: string,
    baseBranch: string,
    changeRequest: string,
    body: string,
    riskLabel: string,
  ): Promise<{ url: string; number: number }> {
    const { owner, repo } = this.parseGitHubRepo(this.repoUrl)
    const title = `[Repo Surgery] ${changeRequest.slice(0, 80)}`

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          head: branchName,
          base: baseBranch,
        }),
      },
    )

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(
        `GitHub API error ${response.status}: ${errorBody}`,
      )
    }

    const pr = (await response.json()) as { html_url: string; number: number }

    try {
      await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues/${pr.number}/labels`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.githubToken}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ labels: ['repo-surgery', riskLabel] }),
        },
      )
    } catch {
      // labeling is best-effort
    }

    return { url: pr.html_url, number: pr.number }
  }

  private generatePRBody(
    changeRequest: string,
    score: number,
    label: string,
    impactReport: ImpactReport,
    boundaryMap: BoundaryMap,
    validation: ValidationResult,
    diffs: GeneratedDiff,
    rollbackBranch: string,
  ): string {
    const gateNames = ['Static Analysis', 'Regression Tests', 'Contract Validation', 'Security Scan']

    const gateRows = gateNames
      .map((name, i) => {
        const gate = validation.gates.find((g) => g.gate === i + 1)
        const status = gate?.passed ? 'Pass' : 'Fail'
        return `| ${name} | ${status} |`
      })
      .join('\n')

    const zoneSections = [
      { label: 'Safe to Modify', files: boundaryMap.safeToModify },
      { label: 'Adapter', files: boundaryMap.adapter },
      { label: 'Shell', files: boundaryMap.shell },
      { label: 'Core (untouched)', files: boundaryMap.core },
    ]

    const boundaryRows = zoneSections
      .map((s) => {
        const list = s.files.length > 0
          ? s.files.map((f) => `\`${f}\``).join(', ')
          : 'None'
        return `| ${s.label} | ${list} |`
      })
      .join('\n')

    return `## Repo Surgery Report

**Change Request:** ${changeRequest}
**Confidence:** ${score}% - ${label}
**Risk Level:** ${impactReport.overallRisk}

### Impact Analysis
- Files modified: ${diffs.totalFilesModified}
- Files created: ${diffs.totalFilesCreated}
- Files avoided: ${impactReport.filesToAvoid.length}

### Boundary Analysis
| Zone | Files |
|------|-------|
${boundaryRows}

### Validation Gates
| Gate | Status |
|------|--------|
${gateRows}

### Risk Summary
${impactReport.reasoning}

### Rollback
Original branch: \`${rollbackBranch}\` (preserved for 30 days)`
  }

  private countDiffStats(diffs: GeneratedDiff): {
    additions: number
    deletions: number
  } {
    let additions = 0
    let deletions = 0

    for (const diff of diffs.diffs) {
      const lines = diff.unifiedDiff.split('\n')
      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) additions++
        else if (line.startsWith('-') && !line.startsWith('---')) deletions++
      }
    }

    return { additions, deletions }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30)
  }

  private parseGitHubRepo(url: string): { owner: string; repo: string } {
    const httpsMatch = url.match(
      /github\.com\/([^/]+)\/([^/.]+)/,
    )
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] }
    }

    const sshMatch = url.match(
      /github\.com:([^/]+)\/([^/.]+)/,
    )
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] }
    }

    throw new Error(`Unable to parse GitHub owner/repo from URL: ${url}`)
  }

  private exec(cmd: string): string {
    return execSync(cmd, {
      encoding: 'utf-8',
      cwd: this.cloneDir,
      timeout: 30000,
    })
  }
}
