import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class MobileFeatureAgent implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Mobile Feature Agent',
    name: 'mobileFeatureAgent',
    icon: 'fa:puzzle-piece',
    group: ['transform'],
    version: 1,
    description: 'Generates mobile screens, components, native permissions, and typed API client',
    defaults: {
      name: 'Mobile Feature Agent',
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
        displayName: 'Scaffold Output',
        name: 'scaffoldOutput',
        type: 'json',
        default: '{}',
        description: 'Output from Mobile Scaffold Agent',
      },
      {
        displayName: 'PRD',
        name: 'prd',
        type: 'json',
        default: '{}',
        description: 'PRD with screens, dataModels, and nativeFeatures',
      },
      {
        displayName: 'Design DNA',
        name: 'designDna',
        type: 'json',
        default: '{}',
        description: 'Design DNA tokens for theming',
      },
      {
        displayName: 'Component Library',
        name: 'componentLibrary',
        type: 'options',
        options: [
          { name: 'React Native Paper', value: 'react-native-paper' },
          { name: 'Tamagui', value: 'tamagui' },
        ],
        default: 'react-native-paper',
        description: 'UI component library to use',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const buildId = this.getNodeParameter('buildId', i) as string
      const scaffoldOutputRaw = this.getNodeParameter('scaffoldOutput', i) as string | object
      const prdRaw = this.getNodeParameter('prd', i) as string | object
      const designDnaRaw = this.getNodeParameter('designDna', i) as string | object
      const componentLibrary = this.getNodeParameter('componentLibrary', i) as string

      try {
        const scaffoldOutput = typeof scaffoldOutputRaw === 'string' ? JSON.parse(scaffoldOutputRaw) : scaffoldOutputRaw
        const prd = typeof prdRaw === 'string' ? JSON.parse(prdRaw) : prdRaw
        const designDna = typeof designDnaRaw === 'string' ? JSON.parse(designDnaRaw) : designDnaRaw

        const uri = (process.env.MOBILE_FEATURE_URL || 'http://mobile-feature:3021') + '/generate'

        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body: { buildId, scaffoldOutput, prd, designDna, componentLibrary },
          json: true,
        })

        returnData.push({ json: response })
      } catch (error: unknown) {
        if (this.continueOnFail()) {
          const message = error instanceof Error ? error.message : String(error)
          returnData.push({ json: { success: false, error: message } })
        } else {
          throw error
        }
      }
    }

    return [returnData]
  }
}
