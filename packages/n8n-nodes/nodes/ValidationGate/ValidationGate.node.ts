import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class ValidationGate implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Validation Gate',
    name: 'validationGate',
    icon: 'fa:shield-alt',
    group: ['transform'],
    version: 1,
    description: 'Runs validation gates against generated diffs before merge',
    defaults: {
      name: 'Validation Gate',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Gate',
        name: 'gate',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Static Analysis',
            value: '1',
            description: 'Run static analysis checks',
          },
          {
            name: 'Regression Tests',
            value: '2',
            description: 'Run regression test suite',
          },
          {
            name: 'Contract Validation',
            value: '3',
            description: 'Validate contracts are not broken',
          },
          {
            name: 'Security Scan',
            value: '4',
            description: 'Run security vulnerability scan',
          },
          {
            name: 'Run All Gates',
            value: 'all',
            description: 'Execute every validation gate',
          },
        ],
        default: 'all',
        description: 'Which validation gate to run',
      },
      {
        displayName: 'Clone Directory',
        name: 'cloneDir',
        type: 'string',
        default: '',
        description: 'Filesystem path to the cloned repository',
      },
      {
        displayName: 'Diffs',
        name: 'diffs',
        type: 'json',
        default: '{}',
        description: 'JSON diffs produced by the diff generator',
      },
      {
        displayName: 'Contracts',
        name: 'contracts',
        type: 'json',
        default: '{}',
        description: 'JSON contracts extracted from the repository',
      },
      {
        displayName: 'Surgery ID',
        name: 'surgeryId',
        type: 'string',
        default: '',
        description: 'Unique identifier for this surgery session',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []
    const baseUrl = process.env.REPO_SURGERY_URL || 'http://localhost:3001'

    for (let i = 0; i < items.length; i++) {
      const gate = this.getNodeParameter('gate', i) as string
      const cloneDir = this.getNodeParameter('cloneDir', i) as string
      const diffsRaw = this.getNodeParameter('diffs', i) as string
      const diffs = typeof diffsRaw === 'string' ? JSON.parse(diffsRaw) : diffsRaw
      const contractsRaw = this.getNodeParameter('contracts', i) as string
      const contracts = typeof contractsRaw === 'string' ? JSON.parse(contractsRaw) : contractsRaw
      const surgeryId = this.getNodeParameter('surgeryId', i) as string

      try {
        const response = await this.helpers.request({
          method: 'POST',
          uri: `${baseUrl}/api/repo-surgery/validate`,
          body: { gate, cloneDir, diffs, contracts, surgeryId },
          json: true,
        })

        returnData.push({ json: response })
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
