import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class PreTransferValidator implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Pre-Transfer Validator',
    name: 'preTransferValidator',
    icon: 'fa:shield-alt',
    group: ['transform'],
    version: 1,
    description: 'Validates build output before GitHub delivery: secret scan, BMAD acceptance, contract diff, .env check',
    defaults: {
      name: 'Pre-Transfer Validator',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Build ID',
        name: 'buildId',
        type: 'string',
        default: '',
        description: 'The Build ID for audit logging',
      },
      {
        displayName: 'Commission ID',
        name: 'commissionId',
        type: 'string',
        default: '',
        description: 'The Commission ID to verify status',
      },
      {
        displayName: 'Workspace Directory',
        name: 'workspaceDir',
        type: 'string',
        default: '',
        description: 'Path to the build workspace on the studio machine',
      },
      {
        displayName: 'Build Status',
        name: 'buildStatus',
        type: 'string',
        default: 'SUCCESS',
        description: 'Current build status (must be SUCCESS to pass)',
      },
      {
        displayName: 'Commission Status',
        name: 'commissionStatus',
        type: 'string',
        default: 'COMPLETED',
        description: 'Current commission status (must be COMPLETED to pass)',
      },
      {
        displayName: 'API Contracts',
        name: 'apiContracts',
        type: 'json',
        default: '{}',
        description: 'Optional JSON of API contracts to validate against implementation',
      },
      {
        displayName: 'Implemented Routes',
        name: 'implementedRoutes',
        type: 'json',
        default: '[]',
        description: 'Optional JSON array of implemented API routes',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const buildId = this.getNodeParameter('buildId', i) as string
      const commissionId = this.getNodeParameter('commissionId', i) as string
      const workspaceDir = this.getNodeParameter('workspaceDir', i) as string
      const buildStatus = this.getNodeParameter('buildStatus', i) as string
      const commissionStatus = this.getNodeParameter('commissionStatus', i) as string
      const apiContractsRaw = this.getNodeParameter('apiContracts', i) as string
      const implementedRoutesRaw = this.getNodeParameter('implementedRoutes', i) as string

      try {
        const apiContracts = typeof apiContractsRaw === 'string' ? JSON.parse(apiContractsRaw) : apiContractsRaw
        const implementedRoutes = typeof implementedRoutesRaw === 'string' ? JSON.parse(implementedRoutesRaw) : implementedRoutesRaw

        const uri = (process.env.DELIVERY_AGENT_URL || 'http://localhost:3001') + '/api/delivery/validate'

        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body: {
            buildId,
            commissionId,
            workspaceDir,
            buildStatus,
            commissionStatus,
            apiContracts,
            implementedRoutes,
          },
          json: true,
        })

        returnData.push({ json: response })
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: error.message, allPassed: false } })
        } else {
          throw error
        }
      }
    }

    return [returnData]
  }
}
