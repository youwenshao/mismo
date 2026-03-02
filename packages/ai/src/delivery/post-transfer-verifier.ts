import { GitHubClient } from './github-client'

export interface PostTransferVerificationInput {
  deliveryId: string
  transferredRepoUrl: string
  clientGithubUsername: string
  repoOwner: string
  repoName: string
  requiredEnvVars?: string[]
  deployedUrl?: string
  githubToken?: string
}

export interface VerificationCheckResult {
  check: string
  passed: boolean
  details: string
}

export interface PostTransferVerificationResult {
  allPassed: boolean
  checks: VerificationCheckResult[]
  rollbackPlan?: RollbackPlan
}

export interface RollbackPlan {
  required: boolean
  reason: string
  steps: string[]
}

export async function verifyPostTransfer(
  input: PostTransferVerificationInput,
): Promise<PostTransferVerificationResult> {
  const github = new GitHubClient(input.githubToken)
  const checks: VerificationCheckResult[] = []

  checks.push(await verifyAdminAccess(github, input))
  checks.push(await verifyRepoAccessible(github, input))
  checks.push(await verifyEnvContract(github, input))

  if (input.deployedUrl) {
    checks.push(await verifyHealthCheck(input.deployedUrl))
  }

  const allPassed = checks.every((c) => c.passed)

  let rollbackPlan: RollbackPlan | undefined
  if (!allPassed) {
    const failedChecks = checks.filter((c) => !c.passed)
    const critical = failedChecks.some(
      (c) => c.check === 'admin_access' || c.check === 'repo_accessible',
    )
    rollbackPlan = {
      required: critical,
      reason: failedChecks.map((c) => `${c.check}: ${c.details}`).join('; '),
      steps: critical
        ? [
            `Transfer repo back: POST /repos/${input.repoOwner}/${input.repoName}/transfer to agency org`,
            'Debug the issue (likely permissions or transfer race condition)',
            'Re-run the transfer pipeline after resolution',
          ]
        : [
            'Review non-critical failures',
            'Update environment variables or deployment configuration as needed',
            'Re-run post-transfer verification',
          ],
    }
  }

  return { allPassed, checks, rollbackPlan }
}

async function verifyAdminAccess(
  github: GitHubClient,
  input: PostTransferVerificationInput,
): Promise<VerificationCheckResult> {
  try {
    const perm = await github.verifyAdminAccess(
      input.repoOwner,
      input.repoName,
      input.clientGithubUsername,
    )

    if (perm.permission === 'admin') {
      return {
        check: 'admin_access',
        passed: true,
        details: `@${input.clientGithubUsername} has admin access (role: ${perm.roleName})`,
      }
    }

    return {
      check: 'admin_access',
      passed: false,
      details: `@${input.clientGithubUsername} has "${perm.permission}" access, expected "admin"`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      check: 'admin_access',
      passed: false,
      details: `Failed to verify access: ${msg}`,
    }
  }
}

async function verifyRepoAccessible(
  github: GitHubClient,
  input: PostTransferVerificationInput,
): Promise<VerificationCheckResult> {
  try {
    const exists = await github.repoExists(input.repoOwner, input.repoName)

    if (exists) {
      return {
        check: 'repo_accessible',
        passed: true,
        details: `Repository ${input.repoOwner}/${input.repoName} is accessible`,
      }
    }

    return {
      check: 'repo_accessible',
      passed: false,
      details: `Repository ${input.repoOwner}/${input.repoName} not found or not accessible`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      check: 'repo_accessible',
      passed: false,
      details: `Repo access check failed: ${msg}`,
    }
  }
}

async function verifyEnvContract(
  github: GitHubClient,
  input: PostTransferVerificationInput,
): Promise<VerificationCheckResult> {
  if (!input.requiredEnvVars || input.requiredEnvVars.length === 0) {
    return {
      check: 'env_contract',
      passed: true,
      details: 'No required environment variables specified — skipped',
    }
  }

  try {
    const envExample = await github.getFileContent(
      input.repoOwner,
      input.repoName,
      '.env.example',
    )

    if (!envExample) {
      return {
        check: 'env_contract',
        passed: false,
        details: '.env.example not found in transferred repo',
      }
    }

    const documentedVars = new Set(
      envExample
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => line.split('=')[0].trim()),
    )

    const missing = input.requiredEnvVars.filter((v) => !documentedVars.has(v))

    if (missing.length === 0) {
      return {
        check: 'env_contract',
        passed: true,
        details: `All ${input.requiredEnvVars.length} required env vars documented in .env.example`,
      }
    }

    return {
      check: 'env_contract',
      passed: false,
      details: `Missing env vars in .env.example: ${missing.join(', ')}`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      check: 'env_contract',
      passed: false,
      details: `Env contract check failed: ${msg}`,
    }
  }
}

async function verifyHealthCheck(
  deployedUrl: string,
): Promise<VerificationCheckResult> {
  const healthUrl = deployedUrl.replace(/\/$/, '') + '/api/health'

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    })

    if (response.ok) {
      return {
        check: 'health_check',
        passed: true,
        details: `Health check at ${healthUrl} returned ${response.status}`,
      }
    }

    return {
      check: 'health_check',
      passed: false,
      details: `Health check at ${healthUrl} returned ${response.status}`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      check: 'health_check',
      passed: false,
      details: `Health check failed: ${msg}`,
    }
  }
}
