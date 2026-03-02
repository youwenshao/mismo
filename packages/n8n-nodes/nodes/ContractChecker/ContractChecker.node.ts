import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class ContractChecker implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Contract Checker',
    name: 'contractChecker',
    icon: 'fa:shield',
    group: ['transform'],
    version: 1,
    description: 'Performs API contract validation and type safety checks across services',
    defaults: {
      name: 'Contract Checker',
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
            name: 'Check API Contracts',
            value: 'checkApi',
            description: 'Validate implemented routes against PRD API contracts',
          },
          {
            name: 'Check Type Safety',
            value: 'checkTypes',
            description: 'Scan frontend code for type safety violations and Zod schema usage',
          },
        ],
        default: 'checkApi',
      },
      {
        displayName: 'Build ID',
        name: 'buildId',
        type: 'string',
        default: '',
        description: 'The Supabase Build ID for audit logging',
      },
      {
        displayName: 'API Contracts',
        name: 'apiContracts',
        type: 'json',
        default: '{"endpoints":[]}',
        description: 'PRD-defined API contract: { endpoints: [{ path, method, response: { status, body } }] }',
        displayOptions: {
          show: {
            operation: ['checkApi'],
          },
        },
      },
      {
        displayName: 'Implemented Routes',
        name: 'implementedRoutes',
        type: 'json',
        default: '[]',
        description: 'Routes from the Backend Engineer: [{ path, method, code }]',
        displayOptions: {
          show: {
            operation: ['checkApi'],
          },
        },
      },
      {
        displayName: 'Frontend Code',
        name: 'frontendCode',
        type: 'json',
        default: '[]',
        description: 'Frontend source files: [{ name, code }]',
        displayOptions: {
          show: {
            operation: ['checkTypes'],
          },
        },
      },
      {
        displayName: 'Zod Schemas',
        name: 'zodSchemas',
        type: 'json',
        default: '""',
        description: 'Zod schema source string from the DB Architect',
        displayOptions: {
          show: {
            operation: ['checkTypes'],
          },
        },
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []
    const baseUrl = process.env.CONTRACT_CHECKER_URL || 'http://contract-checker:3000'

    for (let i = 0; i < items.length; i++) {
      const operation = this.getNodeParameter('operation', i) as string
      const buildId = this.getNodeParameter('buildId', i) as string

      try {
        let uri: string
        let body: Record<string, unknown>

        if (operation === 'checkApi') {
          const apiContractsRaw = this.getNodeParameter('apiContracts', i) as string | object
          const implementedRoutesRaw = this.getNodeParameter('implementedRoutes', i) as string | object

          const apiContracts = typeof apiContractsRaw === 'string' ? JSON.parse(apiContractsRaw) : apiContractsRaw
          const implementedRoutes =
            typeof implementedRoutesRaw === 'string' ? JSON.parse(implementedRoutesRaw) : implementedRoutesRaw

          uri = `${baseUrl}/check-api`
          body = { buildId, apiContracts, implementedRoutes }
        } else {
          const frontendCodeRaw = this.getNodeParameter('frontendCode', i) as string | object
          const zodSchemasRaw = this.getNodeParameter('zodSchemas', i) as string | object

          const frontendCode =
            typeof frontendCodeRaw === 'string' ? JSON.parse(frontendCodeRaw) : frontendCodeRaw
          const zodSchemas = typeof zodSchemasRaw === 'string' ? zodSchemasRaw : JSON.stringify(zodSchemasRaw)

          uri = `${baseUrl}/check-types`
          body = { buildId, frontendCode, zodSchemas }
        }

        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body,
          json: true,
        })

        returnData.push({
          json: {
            success: response.success,
            valid: response.valid,
            operation,
            data: response,
          },
        })
      } catch (error: unknown) {
        if (this.continueOnFail()) {
          const message = error instanceof Error ? error.message : String(error)
          returnData.push({ json: { success: false, operation, error: message } })
        } else {
          throw error
        }
      }
    }

    return [returnData]
  }
}
