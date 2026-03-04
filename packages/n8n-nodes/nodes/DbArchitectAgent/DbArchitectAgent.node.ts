import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class DbArchitectAgent implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'DB Architect Agent',
    name: 'dbArchitectAgent',
    icon: 'fa:database',
    group: ['transform'],
    version: 1,
    description: 'Generates SQL schema, Zod schemas, and TS types from PRD data contracts',
    defaults: {
      name: 'DB Architect Agent',
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
        displayName: 'Data Contracts',
        name: 'dataContracts',
        type: 'json',
        default: '{}',
        description:
          'The PRD architecture.contracts.data describing entities, fields, and relations',
      },
      {
        displayName: 'Data Boundaries',
        name: 'dataBoundaries',
        type: 'json',
        default: '{}',
        description: 'The data_boundaries from the BMAD validation phase',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const buildId = this.getNodeParameter('buildId', i) as string
      const dataContractsRaw = this.getNodeParameter('dataContracts', i) as string
      const dataBoundariesRaw = this.getNodeParameter('dataBoundaries', i) as string

      try {
        const dataContracts =
          typeof dataContractsRaw === 'string' ? JSON.parse(dataContractsRaw) : dataContractsRaw
        const dataBoundaries =
          typeof dataBoundariesRaw === 'string' ? JSON.parse(dataBoundariesRaw) : dataBoundariesRaw

        const uri = (process.env.DB_ARCHITECT_URL || 'http://db-architect:3030') + '/generate'

        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body: { buildId, dataContracts, dataBoundaries },
          json: true,
        })

        returnData.push({
          json: {
            success: response.success,
            sqlSchema: response.sqlSchema,
            zodSchemas: response.zodSchemas,
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
