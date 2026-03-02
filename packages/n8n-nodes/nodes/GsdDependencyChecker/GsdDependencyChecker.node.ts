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
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Sort Agents',
            value: 'sort',
            description: 'Topologically sort an array of agents by their dependencies',
          },
          {
            name: 'Parse PRD',
            value: 'parsePrd',
            description: 'Extract and sort the dependency graph from a BMAD-compliant PRD',
          },
        ],
        default: 'sort',
        description: 'Which operation to perform',
      },
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
        displayOptions: {
          show: {
            operation: ['sort'],
          },
        },
      },
      {
        displayName: 'PRD JSON',
        name: 'prdJson',
        type: 'json',
        default: '{}',
        description: 'BMAD-compliant PRD with gsd_decomposition.tasks',
        displayOptions: {
          show: {
            operation: ['parsePrd'],
          },
        },
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []
    const baseUrl = process.env.GSD_DEPENDENCY_URL || 'http://gsd-dependency:3000'

    for (let i = 0; i < items.length; i++) {
      const operation = this.getNodeParameter('operation', i) as string
      const buildId = this.getNodeParameter('buildId', i) as string

      try {
        if (operation === 'parsePrd') {
          const prdRaw = this.getNodeParameter('prdJson', i) as string
          const prd = typeof prdRaw === 'string' ? JSON.parse(prdRaw) : prdRaw

          const response = await this.helpers.request({
            method: 'POST',
            uri: `${baseUrl}/parse-prd`,
            body: { buildId, prd },
            json: true,
          })

          returnData.push({
            json: {
              success: response.success,
              agents: response.agents,
            },
          })
        } else {
          const agentsJson = this.getNodeParameter('agents', i) as string
          const agents = typeof agentsJson === 'string' ? JSON.parse(agentsJson) : agentsJson

          const response = await this.helpers.request({
            method: 'POST',
            uri: `${baseUrl}/sort`,
            body: { buildId, agents },
            json: true,
          })

          returnData.push({
            json: {
              success: response.success,
              sorted: response.sorted,
            },
          })
        }
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
