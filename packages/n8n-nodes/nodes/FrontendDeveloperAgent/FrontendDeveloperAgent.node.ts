import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class FrontendDeveloperAgent implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Frontend Developer Agent',
    name: 'frontendDeveloperAgent',
    icon: 'fa:paint-brush',
    group: ['transform'],
    version: 1,
    description: 'Generates React components, pages, and typed API client from design DNA and content',
    defaults: {
      name: 'Frontend Developer Agent',
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
        displayName: 'Design DNA',
        name: 'designDna',
        type: 'json',
        default: '{}',
        description: 'Styling tokens: mood, typography, colors, motion, content_rules',
      },
      {
        displayName: 'Content JSON',
        name: 'contentJson',
        type: 'json',
        default: '{}',
        description: 'Page content structure for component composition',
      },
      {
        displayName: 'Backend Types',
        name: 'backendTypes',
        type: 'json',
        default: '{}',
        description: 'Types from Backend Engineer: zodSchemas, types, routes',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const buildId = this.getNodeParameter('buildId', i) as string
      const designDnaRaw = this.getNodeParameter('designDna', i) as string
      const contentJsonRaw = this.getNodeParameter('contentJson', i) as string
      const backendTypesRaw = this.getNodeParameter('backendTypes', i) as string

      try {
        const designDna = typeof designDnaRaw === 'string' ? JSON.parse(designDnaRaw) : designDnaRaw
        const contentJson = typeof contentJsonRaw === 'string' ? JSON.parse(contentJsonRaw) : contentJsonRaw
        const backendTypes = typeof backendTypesRaw === 'string' ? JSON.parse(backendTypesRaw) : backendTypesRaw

        const uri = (process.env.FRONTEND_DEVELOPER_URL || 'http://frontend-developer:3003') + '/generate'

        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body: { buildId, designDna, contentJson, backendTypes },
          json: true,
        })

        returnData.push({
          json: {
            success: response.success,
            components: response.components,
            pages: response.pages,
            apiClient: response.apiClient,
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
