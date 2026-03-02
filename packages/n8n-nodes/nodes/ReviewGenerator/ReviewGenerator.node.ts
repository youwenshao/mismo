import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class ReviewGenerator implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Review Generator',
    name: 'reviewGenerator',
    icon: 'fa:code-pull-request',
    group: ['transform'],
    version: 1,
    description: 'Generates a structured code review from diffs, validation results, and context',
    defaults: {
      name: 'Review Generator',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Diffs',
        name: 'diffs',
        type: 'json',
        default: '{}',
        description: 'JSON diffs produced by the diff generator',
      },
      {
        displayName: 'Validation Results',
        name: 'validationResults',
        type: 'json',
        default: '{}',
        description: 'JSON results from the validation gate',
      },
      {
        displayName: 'Impact Report',
        name: 'impactReport',
        type: 'json',
        default: '{}',
        description: 'JSON impact report from the impact analysis step',
      },
      {
        displayName: 'Boundary Map',
        name: 'boundaryMap',
        type: 'json',
        default: '{}',
        description: 'JSON boundary map produced by the ingestion step',
      },
      {
        displayName: 'Change Request',
        name: 'changeRequest',
        type: 'string',
        default: '',
        description: 'Natural-language description of the change',
      },
      {
        displayName: 'Repository URL',
        name: 'repoUrl',
        type: 'string',
        default: '',
        description: 'URL of the target repository',
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
      const diffsRaw = this.getNodeParameter('diffs', i) as string
      const diffs = typeof diffsRaw === 'string' ? JSON.parse(diffsRaw) : diffsRaw
      const validationResultsRaw = this.getNodeParameter('validationResults', i) as string
      const validationResults = typeof validationResultsRaw === 'string' ? JSON.parse(validationResultsRaw) : validationResultsRaw
      const impactReportRaw = this.getNodeParameter('impactReport', i) as string
      const impactReport = typeof impactReportRaw === 'string' ? JSON.parse(impactReportRaw) : impactReportRaw
      const boundaryMapRaw = this.getNodeParameter('boundaryMap', i) as string
      const boundaryMap = typeof boundaryMapRaw === 'string' ? JSON.parse(boundaryMapRaw) : boundaryMapRaw
      const changeRequest = this.getNodeParameter('changeRequest', i) as string
      const repoUrl = this.getNodeParameter('repoUrl', i) as string
      const surgeryId = this.getNodeParameter('surgeryId', i) as string

      try {
        const response = await this.helpers.request({
          method: 'POST',
          uri: `${baseUrl}/api/repo-surgery/review`,
          body: {
            diffs,
            validationResults,
            impactReport,
            boundaryMap,
            changeRequest,
            repoUrl,
            surgeryId,
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
