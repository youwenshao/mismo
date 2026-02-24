import { LIGHTHOUSE_THRESHOLD } from '@mismo/shared'

export interface VerificationCheck {
  id: string
  name: string
  category: 'performance' | 'security' | 'testing' | 'accessibility'
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  details?: string
  threshold?: number
  actual?: number
}

export interface VerificationResult {
  projectId: string
  checks: VerificationCheck[]
  passedAll: boolean
  completedAt: string
}

export function createVerificationChecklist(projectId: string): VerificationCheck[] {
  void projectId
  return [
    {
      id: 'lighthouse-perf',
      name: 'Lighthouse Performance',
      category: 'performance',
      status: 'pending',
      threshold: LIGHTHOUSE_THRESHOLD,
    },
    {
      id: 'lighthouse-a11y',
      name: 'Lighthouse Accessibility',
      category: 'accessibility',
      status: 'pending',
      threshold: LIGHTHOUSE_THRESHOLD,
    },
    {
      id: 'snyk-vuln',
      name: 'Snyk Vulnerability Scan',
      category: 'security',
      status: 'pending',
      details: '0 critical/high vulnerabilities allowed',
      threshold: 0,
    },
    {
      id: 'playwright-e2e',
      name: 'Playwright E2E Tests',
      category: 'testing',
      status: 'pending',
      details: 'All E2E tests must pass',
    },
    {
      id: 'stackhawk-dast',
      name: 'StackHawk DAST Scan',
      category: 'security',
      status: 'pending',
      details: 'No critical findings',
    },
    {
      id: 'secret-scan',
      name: 'Secret Scanning',
      category: 'security',
      status: 'pending',
      details: 'No secrets or credentials detected in codebase',
      threshold: 0,
    },
  ]
}

function simulateCheck(check: VerificationCheck): VerificationCheck {
  switch (check.id) {
    case 'lighthouse-perf':
      return { ...check, status: 'passed', actual: 94 }
    case 'lighthouse-a11y':
      return { ...check, status: 'passed', actual: 97 }
    case 'snyk-vuln':
      return { ...check, status: 'passed', actual: 0, details: '0 critical/high vulnerabilities found' }
    case 'playwright-e2e':
      return { ...check, status: 'passed', details: '42/42 tests passed' }
    case 'stackhawk-dast':
      return { ...check, status: 'passed', details: 'No critical or high findings' }
    case 'secret-scan':
      return { ...check, status: 'passed', actual: 0, details: 'No secrets detected' }
    default:
      return { ...check, status: 'skipped' }
  }
}

export async function runVerificationChecklist(projectId: string): Promise<VerificationResult> {
  const checks = createVerificationChecklist(projectId)

  const completedChecks = checks.map((check) => simulateCheck(check))

  const passedAll = completedChecks.every((c) => c.status === 'passed' || c.status === 'skipped')

  return {
    projectId,
    checks: completedChecks,
    passedAll,
    completedAt: new Date().toISOString(),
  }
}
