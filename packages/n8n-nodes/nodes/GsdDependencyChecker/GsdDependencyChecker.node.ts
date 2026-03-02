import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class GsdDependencyChecker implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'GSD Dependency Checker',
    name: 'gsdDependencyChecker',
    icon: 'fa:sitemap',
    group: ['transform'],
    version: 1,
    description: 'Constructs global dependency graph and sorts execution order',
    defaults: {
      name: 'GSD Dependency Checker',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Build ID',
        name: 'buildId',
        type: 'string',
        default: '',
        description: 'The Supabase Build ID to log executionIds',
      },
      {
        displayName: 'Agents Array',
        name: 'agents',
        type: 'json',
        default: '[]',
        description: 'Array of agents to sort',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const buildId = this.getNodeParameter('buildId', i) as string
      const agentsJson = this.getNodeParameter('agents', i) as string

      try {
        const agents = typeof agentsJson === 'string' ? JSON.parse(agentsJson) : agentsJson
        const uri = (process.env.GSD_DEPENDENCY_URL || 'http://gsd-dependency:3000') + '/sort'

        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body: { buildId, agents },
          json: true,
        })

        returnData.push({
          json: {
            success: response.success,
            sorted: response.sorted,
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
