import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class DiffGenerator implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Diff Generator',
    name: 'diffGenerator',
    icon: 'fa:code',
    group: ['transform'],
    version: 1,
    description: 'Generates file-level diffs from an impact report and change request',
    defaults: {
      name: 'Diff Generator',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Impact Report',
        name: 'impactReport',
        type: 'json',
        default: '{}',
        description: 'JSON impact report from the impact analysis step',
      },
      {
        displayName: 'Contracts',
        name: 'contracts',
        type: 'json',
        default: '{}',
        description: 'JSON contracts extracted from the repository',
      },
      {
        displayName: 'Change Request',
        name: 'changeRequest',
        type: 'string',
        default: '',
        description: 'Natural-language description of the change',
      },
      {
        displayName: 'Clone Directory',
        name: 'cloneDir',
        type: 'string',
        default: '',
        description: 'Filesystem path to the cloned repository',
      },
      {
        displayName: 'Forbidden Files',
        name: 'forbiddenFiles',
        type: 'json',
        default: '[]',
        description: 'JSON array of file paths that must not be modified',
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
      const impactReportRaw = this.getNodeParameter('impactReport', i) as string
      const impactReport = typeof impactReportRaw === 'string' ? JSON.parse(impactReportRaw) : impactReportRaw
      const contractsRaw = this.getNodeParameter('contracts', i) as string
      const contracts = typeof contractsRaw === 'string' ? JSON.parse(contractsRaw) : contractsRaw
      const changeRequest = this.getNodeParameter('changeRequest', i) as string
      const cloneDir = this.getNodeParameter('cloneDir', i) as string
      const forbiddenFilesRaw = this.getNodeParameter('forbiddenFiles', i) as string
      const forbiddenFiles = typeof forbiddenFilesRaw === 'string' ? JSON.parse(forbiddenFilesRaw) : forbiddenFilesRaw
      const surgeryId = this.getNodeParameter('surgeryId', i) as string

      try {
        const response = await this.helpers.request({
          method: 'POST',
          uri: `${baseUrl}/api/repo-surgery/modify`,
          body: {
            impactReport,
            contracts,
            changeRequest,
            cloneDir,
            forbiddenFiles,
            surgeryId,
            operation: 'diff',
          },
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
