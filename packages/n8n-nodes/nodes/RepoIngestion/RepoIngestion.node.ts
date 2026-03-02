import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class RepoIngestion implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Repo Ingestion',
    name: 'repoIngestion',
    icon: 'fa:code-branch',
    group: ['transform'],
    version: 1,
    description: 'Clones and ingests a repository for repo surgery analysis',
    defaults: {
      name: 'Repo Ingestion',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Repo URL',
        name: 'repoUrl',
        type: 'string',
        default: '',
        description: 'The Git repository URL to ingest',
      },
      {
        displayName: 'Branch',
        name: 'branch',
        type: 'string',
        default: 'main',
        description: 'The branch to clone',
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
      const repoUrl = this.getNodeParameter('repoUrl', i) as string
      const branch = this.getNodeParameter('branch', i) as string
      const surgeryId = this.getNodeParameter('surgeryId', i) as string

      try {
        const response = await this.helpers.request({
          method: 'POST',
          uri: `${baseUrl}/api/repo-surgery/ingest`,
          body: { repoUrl, branch, surgeryId },
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
