import type {
  VercelTransferConfig,
  DeployResult,
  HostingTransferResult,
  EnvVar,
} from '../schema'

const VERCEL_API_BASE = 'https://api.vercel.com'

function getToken(): string {
  const token = process.env.VERCEL_API_TOKEN
  if (!token) throw new Error('VERCEL_API_TOKEN is not set')
  return token
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function vercelFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const teamId = process.env.VERCEL_TEAM_ID
  const separator = path.includes('?') ? '&' : '?'
  const url = teamId
    ? `${VERCEL_API_BASE}${path}${separator}teamId=${teamId}`
    : `${VERCEL_API_BASE}${path}`

  const res = await fetch(url, {
    ...options,
    headers: { ...headers(token), ...(options.headers as Record<string, string>) },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Vercel API ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

export class VercelDeployer {
  async deploy(config: VercelTransferConfig): Promise<DeployResult> {
    try {
      const project = await this.createProject(config)
      const projectId = (project as { id: string }).id

      if (config.envVars.length > 0) {
        await this.setEnvVars(projectId, config.envVars)
      }

      if (config.gitRepoUrl) {
        await this.linkGitRepo(projectId, config.gitRepoUrl)
      }

      const deployment = await this.createDeployment(projectId, config)
      const deploymentUrl = (deployment as { url?: string }).url

      return {
        success: true,
        projectId,
        deploymentUrl: deploymentUrl ? `https://${deploymentUrl}` : undefined,
        output: { project, deployment },
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async transfer(
    projectId: string,
    targetAccountId: string,
  ): Promise<HostingTransferResult> {
    try {
      const result = await vercelFetch(`/v9/projects/${projectId}/transfer`, {
        method: 'POST',
        body: JSON.stringify({ targetTeamId: targetAccountId }),
      })

      return { success: true, transferOutput: result as Record<string, unknown> }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async exportConfig(
    projectId: string,
    config: VercelTransferConfig,
  ): Promise<{ vercelJson: string; envTemplate: string }> {
    const vercelJson = JSON.stringify(
      {
        version: 2,
        framework: config.framework,
        buildCommand: config.buildCommand,
        outputDirectory: config.outputDir,
        headers: [
          {
            source: '/(.*)',
            headers: [
              { key: 'X-Content-Type-Options', value: 'nosniff' },
              { key: 'X-Frame-Options', value: 'DENY' },
              { key: 'X-XSS-Protection', value: '1; mode=block' },
            ],
          },
        ],
      },
      null,
      2,
    )

    const envLines = config.envVars.map(
      (v) => `${v.key}=${v.sensitive ? '<FILL_IN>' : v.value}`,
    )
    const envTemplate = [
      '# Vercel Environment Variables',
      '# Exported from Mismo deployment',
      '',
      ...envLines,
      '',
    ].join('\n')

    return { vercelJson, envTemplate }
  }

  private async createProject(
    config: VercelTransferConfig,
  ): Promise<unknown> {
    return vercelFetch('/v10/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: config.projectName,
        framework: config.framework,
        buildCommand: config.buildCommand,
        outputDirectory: config.outputDir,
      }),
    })
  }

  private async setEnvVars(
    projectId: string,
    envVars: EnvVar[],
  ): Promise<void> {
    const envPayload = envVars.map((v) => ({
      key: v.key,
      value: v.value,
      type: v.sensitive ? 'encrypted' : 'plain',
      target: ['production', 'preview', 'development'],
    }))

    await vercelFetch(`/v10/projects/${projectId}/env`, {
      method: 'POST',
      body: JSON.stringify(envPayload),
    })
  }

  private async linkGitRepo(
    projectId: string,
    gitRepoUrl: string,
  ): Promise<void> {
    const match = gitRepoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/)
    if (!match) return

    await vercelFetch(`/v10/projects/${projectId}/link`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'github',
        repo: `${match[1]}/${match[2]}`,
      }),
    })
  }

  private async createDeployment(
    projectId: string,
    config: VercelTransferConfig,
  ): Promise<unknown> {
    const body: Record<string, unknown> = {
      name: config.projectName,
      project: projectId,
      target: 'production',
    }

    if (config.gitRepoUrl) {
      body.gitSource = {
        type: 'github',
        repoId: config.gitRepoUrl,
        ref: 'main',
      }
    }

    return vercelFetch('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }
}
