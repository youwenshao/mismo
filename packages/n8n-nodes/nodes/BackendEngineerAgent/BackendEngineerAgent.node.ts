import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class BackendEngineerAgent implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Backend Engineer Agent',
    name: 'backendEngineerAgent',
    icon: 'fa:server',
    group: ['transform'],
    version: 1,
    description:
      'Generates Next.js API routes, OpenAPI spec, and TypeScript types from DB schema and API contracts',
    defaults: {
      name: 'Backend Engineer Agent',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Build ID',
        name: 'buildId',
        type: 'string',
        default: '',
        description: 'The Supabase Build ID for tracking and error logging',
      },
      {
        displayName: 'DB Schema',
        name: 'dbSchema',
        type: 'json',
        default: '{}',
        description: 'SQL schema + Zod schemas from the DB Architect agent',
      },
      {
        displayName: 'API Contracts',
        name: 'apiContracts',
        type: 'json',
        default: '{}',
        description: 'API endpoint contracts from PRD architecture',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []
    const baseUrl = process.env.BACKEND_ENGINEER_URL || 'http://backend-engineer:3031'

    for (let i = 0; i < items.length; i++) {
      const buildId = this.getNodeParameter('buildId', i) as string
      const dbSchemaRaw = this.getNodeParameter('dbSchema', i) as string
      const apiContractsRaw = this.getNodeParameter('apiContracts', i) as string

      const dbSchema = typeof dbSchemaRaw === 'string' ? JSON.parse(dbSchemaRaw) : dbSchemaRaw
      const apiContracts =
        typeof apiContractsRaw === 'string' ? JSON.parse(apiContractsRaw) : apiContractsRaw

      try {
        const response = await this.helpers.request({
          method: 'POST',
          uri: `${baseUrl}/generate`,
          body: { buildId, dbSchema, apiContracts },
          json: true,
        })

        returnData.push({
          json: {
            success: response.success,
            routes: response.routes,
            openApiSpec: response.openApiSpec,
            types: response.types,
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
