import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class DevOpsAgent implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'DevOps Agent',
    name: 'devOpsAgent',
    icon: 'fa:cloud',
    group: ['transform'],
    version: 1,
    description: 'Generates Vercel config, env template, and deployment script from hosting config',
    defaults: {
      name: 'DevOps Agent',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Build ID',
        name: 'buildId',
        type: 'string',
        default: '',
        description: 'The Supabase Build ID for audit logging',
      },
      {
        displayName: 'Hosting Config',
        name: 'hostingConfig',
        type: 'json',
        default: '{}',
        description:
          'PRD architecture hosting: provider, region, framework, buildCommand, outputDir',
      },
      {
        displayName: 'Env Requirements',
        name: 'envRequirements',
        type: 'json',
        default: '[]',
        description: 'Array of { key, required, description } env vars needed by backend',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const buildId = this.getNodeParameter('buildId', i) as string
      const hostingConfigRaw = this.getNodeParameter('hostingConfig', i) as string
      const envRequirementsRaw = this.getNodeParameter('envRequirements', i) as string

      try {
        const hostingConfig =
          typeof hostingConfigRaw === 'string' ? JSON.parse(hostingConfigRaw) : hostingConfigRaw
        const envRequirements =
          typeof envRequirementsRaw === 'string'
            ? JSON.parse(envRequirementsRaw)
            : envRequirementsRaw

        const uri = (process.env.DEVOPS_AGENT_URL || 'http://devops-agent:3033') + '/generate'

        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body: { buildId, hostingConfig, envRequirements },
          json: true,
        })

        returnData.push({
          json: {
            success: response.success,
            vercelConfig: response.vercelConfig,
            envTemplate: response.envTemplate,
            deploymentScript: response.deploymentScript,
          },
        })
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: error.message } })
        } else {
          throw error
        }
      }
    }

    return [returnData]
  }
}
