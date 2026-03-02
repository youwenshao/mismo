import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class DocGenerator implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Doc Generator',
    name: 'docGenerator',
    icon: 'fa:file-alt',
    group: ['transform'],
    version: 1,
    description: 'Generates BMAD delivery documents: ADR, API contracts, data boundaries, runbook, hosting contract',
    defaults: {
      name: 'Doc Generator',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Build ID',
        name: 'buildId',
        type: 'string',
        default: '',
        description: 'The Build ID for provenance tracking',
      },
      {
        displayName: 'Commission ID',
        name: 'commissionId',
        type: 'string',
        default: '',
        description: 'The Commission ID',
      },
      {
        displayName: 'PRD JSON',
        name: 'prdJson',
        type: 'json',
        default: '{}',
        description: 'The PRD JSON containing project specifications',
      },
      {
        displayName: 'Repo Owner',
        name: 'repoOwner',
        type: 'string',
        default: '',
        description: 'GitHub repo owner (from RepoCreator output)',
      },
      {
        displayName: 'Repo Name',
        name: 'repoName',
        type: 'string',
        default: '',
        description: 'GitHub repo name (from RepoCreator output)',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const buildId = this.getNodeParameter('buildId', i) as string
      const commissionId = this.getNodeParameter('commissionId', i) as string
      const prdJsonRaw = this.getNodeParameter('prdJson', i) as string
      const repoOwner = this.getNodeParameter('repoOwner', i) as string
      const repoName = this.getNodeParameter('repoName', i) as string

      try {
        const prdJson = typeof prdJsonRaw === 'string' ? JSON.parse(prdJsonRaw) : prdJsonRaw

        const uri = (process.env.DELIVERY_AGENT_URL || 'http://localhost:3001') + '/api/delivery/generate-docs'

        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body: { buildId, commissionId, prdJson, repoOwner, repoName },
          json: true,
        })

        returnData.push({
          json: {
            success: response.success,
            documentPaths: response.documentPaths,
            deliverables: response.deliverables,
          },
        })
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: error.message, success: false } })
        } else {
          throw error
        }
      }
    }

    return [returnData]
  }
}
