import type {
  PaasTransferConfig,
  DeployResult,
  HostingTransferResult,
  EnvVar,
} from '../schema'

const RAILWAY_API = 'https://backboard.railway.app/graphql/v2'
const RENDER_API = 'https://api.render.com/v1'

function railwayHeaders(): Record<string, string> {
  const token = process.env.RAILWAY_API_TOKEN
  if (!token) throw new Error('RAILWAY_API_TOKEN is not set')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function renderHeaders(): Record<string, string> {
  const key = process.env.RENDER_API_KEY
  if (!key) throw new Error('RENDER_API_KEY is not set')
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

async function railwayGraphQL<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(RAILWAY_API, {
    method: 'POST',
    headers: railwayHeaders(),
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Railway API ${res.status}: ${body}`)
  }

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> }
  if (json.errors?.length) {
    throw new Error(`Railway GraphQL: ${json.errors[0].message}`)
  }
  return json.data as T
}

async function renderFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${RENDER_API}${path}`, {
    ...options,
    headers: { ...renderHeaders(), ...(options.headers as Record<string, string>) },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Render API ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

export class PaasDeployer {
  async deploy(config: PaasTransferConfig): Promise<DeployResult> {
    if (config.provider === 'RAILWAY') {
      return this.deployRailway(config)
    }
    return this.deployRender(config)
  }

  async transfer(
    config: PaasTransferConfig,
    resourceId: string,
    targetOwnerId: string,
  ): Promise<HostingTransferResult> {
    if (config.provider === 'RAILWAY') {
      return this.transferRailway(resourceId, targetOwnerId)
    }
    return this.transferRender(resourceId, targetOwnerId)
  }

  private async deployRailway(config: PaasTransferConfig): Promise<DeployResult> {
    try {
      const project = await railwayGraphQL<{
        projectCreate: { id: string }
      }>(
        `mutation($input: ProjectCreateInput!) {
          projectCreate(input: $input) { id }
        }`,
        { input: { name: config.projectName } },
      )
      const projectId = project.projectCreate.id

      const service = await railwayGraphQL<{
        serviceCreate: { id: string }
      }>(
        `mutation($input: ServiceCreateInput!) {
          serviceCreate(input: $input) { id }
        }`,
        {
          input: {
            projectId,
            name: config.projectName,
            source: config.gitRepoUrl
              ? { repo: config.gitRepoUrl }
              : undefined,
          },
        },
      )
      const serviceId = service.serviceCreate.id

      if (config.envVars.length > 0) {
        await this.setRailwayEnvVars(serviceId, config.envVars)
      }

      if (config.databaseConfig) {
        await this.addRailwayDatabase(projectId, config.databaseConfig)
      }

      for (const domain of config.customDomains) {
        await this.addRailwayDomain(serviceId, domain)
      }

      return {
        success: true,
        projectId,
        output: { projectId, serviceId },
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  private async deployRender(config: PaasTransferConfig): Promise<DeployResult> {
    try {
      const servicePayload: Record<string, unknown> = {
        type: config.serviceConfig.type === 'web' ? 'web_service' : 'background_worker',
        name: config.projectName,
        autoDeploy: 'yes',
        plan: config.serviceConfig.plan,
        envVars: config.envVars.map((v) => ({
          key: v.key,
          value: v.value,
        })),
      }

      if (config.gitRepoUrl) {
        servicePayload.repo = config.gitRepoUrl
      }
      if (config.serviceConfig.buildCommand) {
        servicePayload.buildCommand = config.serviceConfig.buildCommand
      }
      if (config.serviceConfig.startCommand) {
        servicePayload.startCommand = config.serviceConfig.startCommand
      }
      if (config.serviceConfig.healthcheckPath) {
        servicePayload.healthCheckPath = config.serviceConfig.healthcheckPath
      }

      const service = await renderFetch<{ id: string; serviceDetails?: { url?: string } }>(
        '/services',
        {
          method: 'POST',
          body: JSON.stringify(servicePayload),
        },
      )

      for (const domain of config.customDomains) {
        await renderFetch(`/services/${service.id}/custom-domains`, {
          method: 'POST',
          body: JSON.stringify({ name: domain }),
        })
      }

      if (config.databaseConfig) {
        await this.addRenderDatabase(config)
      }

      return {
        success: true,
        projectId: service.id,
        deploymentUrl: service.serviceDetails?.url,
        output: { service },
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  private async transferRailway(
    projectId: string,
    targetTeamId: string,
  ): Promise<HostingTransferResult> {
    try {
      const result = await railwayGraphQL(
        `mutation($projectId: String!, $teamId: String!) {
          projectTransferToTeam(id: $projectId, teamId: $teamId) { id }
        }`,
        { projectId, teamId: targetTeamId },
      )
      return { success: true, transferOutput: result as Record<string, unknown> }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  private async transferRender(
    serviceId: string,
    targetOwnerId: string,
  ): Promise<HostingTransferResult> {
    try {
      const result = await renderFetch(`/services/${serviceId}/transfer`, {
        method: 'POST',
        body: JSON.stringify({ ownerId: targetOwnerId }),
      })
      return { success: true, transferOutput: result as Record<string, unknown> }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  private async setRailwayEnvVars(
    serviceId: string,
    envVars: EnvVar[],
  ): Promise<void> {
    const variables: Record<string, string> = {}
    for (const v of envVars) {
      variables[v.key] = v.value
    }

    await railwayGraphQL(
      `mutation($input: VariableCollectionUpsertInput!) {
        variableCollectionUpsert(input: $input)
      }`,
      {
        input: {
          serviceId,
          variables,
        },
      },
    )
  }

  private async addRailwayDatabase(
    projectId: string,
    dbConfig: NonNullable<PaasTransferConfig['databaseConfig']>,
  ): Promise<void> {
    const pluginMap: Record<string, string> = {
      postgres: 'postgresql',
      mysql: 'mysql',
      redis: 'redis',
    }

    await railwayGraphQL(
      `mutation($input: PluginCreateInput!) {
        pluginCreate(input: $input) { id }
      }`,
      {
        input: {
          projectId,
          name: pluginMap[dbConfig.engine] ?? dbConfig.engine,
        },
      },
    )
  }

  private async addRailwayDomain(
    serviceId: string,
    domain: string,
  ): Promise<void> {
    await railwayGraphQL(
      `mutation($input: CustomDomainCreateInput!) {
        customDomainCreate(input: $input) { id }
      }`,
      { input: { serviceId, domain } },
    )
  }

  private async addRenderDatabase(
    config: PaasTransferConfig,
  ): Promise<void> {
    if (!config.databaseConfig) return

    await renderFetch('/postgres', {
      method: 'POST',
      body: JSON.stringify({
        name: `${config.projectName}-db`,
        plan: config.databaseConfig.plan,
        databaseName: config.projectName.replace(/[^a-z0-9]/g, '_'),
      }),
    })
  }
}
