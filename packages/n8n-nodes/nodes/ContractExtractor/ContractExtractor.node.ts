import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class ContractExtractor implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Contract Extractor',
    name: 'contractExtractor',
    icon: 'fa:file-contract',
    group: ['transform'],
    version: 1,
    description: 'Extracts interface contracts and API boundaries from a repository',
    defaults: {
      name: 'Contract Extractor',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Clone Directory',
        name: 'cloneDir',
        type: 'string',
        default: '',
        description: 'Path to the cloned repository directory',
      },
      {
        displayName: 'AST Data',
        name: 'astData',
        type: 'json',
        default: '{}',
        description: 'Parsed AST data from the repository',
      },
      {
        displayName: 'Surgery ID',
        name: 'surgeryId',
        type: 'string',
        default: '',
        description: 'The unique identifier for this surgery session',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []
    const baseUrl = process.env.REPO_SURGERY_URL || 'http://localhost:3001'

    for (let i = 0; i < items.length; i++) {
      const cloneDir = this.getNodeParameter('cloneDir', i) as string
      const astDataRaw = this.getNodeParameter('astData', i) as string
      const astData = typeof astDataRaw === 'string' ? JSON.parse(astDataRaw) : astDataRaw
      const surgeryId = this.getNodeParameter('surgeryId', i) as string

      try {
        const response = await this.helpers.request({
          method: 'POST',
          uri: `${baseUrl}/api/repo-surgery/analyze`,
          body: { cloneDir, astData, surgeryId, operation: 'contracts' },
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
