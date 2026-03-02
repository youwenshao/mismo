import { IExecuteFunctions } from 'n8n-workflow'
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'

export class StoreSubmissionAgent implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Store Submission Agent',
    name: 'storeSubmissionAgent',
    icon: 'fa:store',
    group: ['transform'],
    version: 1,
    description: 'Generates store listings, Maestro screenshot flows, and fastlane metadata',
    defaults: {
      name: 'Store Submission Agent',
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
        displayName: 'PRD',
        name: 'prd',
        type: 'json',
        default: '{}',
        description: 'PRD with appName, description, category, keywords, features',
      },
      {
        displayName: 'Platform',
        name: 'platform',
        type: 'options',
        options: [
          { name: 'iOS', value: 'ios' },
          { name: 'Android', value: 'android' },
          { name: 'Both', value: 'both' },
        ],
        default: 'both',
        description: 'Target platform for store metadata',
      },
      {
        displayName: 'App Info',
        name: 'appInfo',
        type: 'json',
        default: '{}',
        description: 'App info: bundleId, version, buildNumber',
      },
      {
        displayName: 'Design DNA',
        name: 'designDna',
        type: 'json',
        default: '{}',
        description: 'Design DNA tokens for screenshot styling',
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: INodeExecutionData[] = []

    for (let i = 0; i < items.length; i++) {
      const buildId = this.getNodeParameter('buildId', i) as string
      const prdRaw = this.getNodeParameter('prd', i) as string | object
      const platform = this.getNodeParameter('platform', i) as string
      const appInfoRaw = this.getNodeParameter('appInfo', i) as string | object
      const designDnaRaw = this.getNodeParameter('designDna', i) as string | object

      try {
        const prd = typeof prdRaw === 'string' ? JSON.parse(prdRaw) : prdRaw
        const appInfo = typeof appInfoRaw === 'string' ? JSON.parse(appInfoRaw) : appInfoRaw
        const designDna = typeof designDnaRaw === 'string' ? JSON.parse(designDnaRaw) : designDnaRaw

        const uri = (process.env.STORE_SUBMISSION_URL || 'http://store-submission:3023') + '/generate'

        const response = await this.helpers.request({
          method: 'POST',
          uri,
          body: { buildId, prd, platform, appInfo, designDna },
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
