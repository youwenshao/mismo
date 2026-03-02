import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class ImpactAnalysis implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Impact Analysis',
    name: 'impactAnalysis',
    icon: 'fa:crosshairs',
    group: ['transform'],
    version: 1,
    description: 'Analyses the impact of a proposed change against boundary maps and contracts',
    defaults: {
      name: 'Impact Analysis',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Change Request',
        name: 'changeRequest',
        type: 'string',
        default: '',
        description: 'Natural-language description of the change to analyse',
      },
      {
        displayName: 'Boundary Map',
        name: 'boundaryMap',
        type: 'json',
        default: '{}',
        description: 'JSON boundary map produced by the ingestion step',
      },
      {
        displayName: 'Contracts',
        name: 'contracts',
        type: 'json',
        default: '{}',
        description: 'JSON contracts extracted from the repository',
      },
      {
        displayName: 'Collection Name',
        name: 'collectionName',
        type: 'string',
        default: '',
        description: 'Qdrant collection name for vector lookups',
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
      const changeRequest = this.getNodeParameter('changeRequest', i) as string
      const boundaryMapRaw = this.getNodeParameter('boundaryMap', i) as string
      const boundaryMap = typeof boundaryMapRaw === 'string' ? JSON.parse(boundaryMapRaw) : boundaryMapRaw
      const contractsRaw = this.getNodeParameter('contracts', i) as string
      const contracts = typeof contractsRaw === 'string' ? JSON.parse(contractsRaw) : contractsRaw
      const collectionName = this.getNodeParameter('collectionName', i) as string
      const forbiddenFilesRaw = this.getNodeParameter('forbiddenFiles', i) as string
      const forbiddenFiles = typeof forbiddenFilesRaw === 'string' ? JSON.parse(forbiddenFilesRaw) : forbiddenFilesRaw
      const surgeryId = this.getNodeParameter('surgeryId', i) as string

      try {
        const response = await this.helpers.request({
          method: 'POST',
          uri: `${baseUrl}/api/repo-surgery/modify`,
          body: {
            changeRequest,
            boundaryMap,
            contracts,
            collectionName,
            forbiddenFiles,
            surgeryId,
            operation: 'impact',
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
